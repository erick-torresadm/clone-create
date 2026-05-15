import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fulfillByAsaasPaymentId, fulfillPaidOrder } from "@/lib/checkout.server";
import { type AsaasEnv, createPixPayment, findOrCreateCustomer, getPixQr, getPayment, isPaid } from "@/lib/asaas.server";
import { notifyOrderCreated } from "@/lib/telegram.server";

const MAXVIA_BASE = "https://maxvia88.com/api/v1";

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
});

const inputSchema = z.object({
  items: z.array(itemSchema).min(1).max(30),
  couponCode: z.string().max(40).optional(),
  customerEmail: z.string().email(),
  customerName: z.string().min(2).max(120).optional(),
  cpfCnpj: z.string().min(11).max(20).optional(),
  userId: z.string().uuid(),
  environment: z.enum(["sandbox", "live"]),
});

async function loadCoupon(code: string): Promise<{ type: "percent" | "fixed"; value: number; min: number } | null> {
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .select("code,discount_type,value,active,expires_at,max_uses,used_count,min_order")
    .ilike("code", code.trim())
    .maybeSingle();
  if (error || !data || !data.active) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  if (data.max_uses != null && data.used_count >= data.max_uses) return null;
  return {
    type: data.discount_type as "percent" | "fixed",
    value: Number(data.value),
    min: Number(data.min_order ?? 0),
  };
}

type LiveItem = { quantity: number; price: number };

async function syncMaxviaForExternalIds(externalIds: string[]): Promise<Map<string, LiveItem>> {
  const result = new Map<string, LiveItem>();
  if (!externalIds.length) return result;
  let cats: Array<{ id: number }> = [];
  try {
    const r = await fetch(`${MAXVIA_BASE}/categories`);
    if (r.ok) {
      const j = await r.json();
      cats = (j?.data ?? []).map((c: any) => ({ id: c.id }));
    }
  } catch { return result; }
  const wanted = new Set(externalIds.map((s) => String(s)));
  for (const c of cats) {
    if (!wanted.size) break;
    try {
      const r = await fetch(`${MAXVIA_BASE}/category/${c.id}`);
      if (!r.ok) continue;
      const j = await r.json();
      for (const p of (j?.data ?? []) as Array<{ id_product: number; quantity: number; price: number }>) {
        const ext = String(p.id_product);
        if (wanted.has(ext)) {
          result.set(ext, { quantity: Number(p.quantity) || 0, price: Number(p.price) || 0 });
          wanted.delete(ext);
        }
      }
    } catch { /* skip */ }
  }
  await Promise.all(
    Array.from(result.entries()).map(([extId, live]) =>
      supabaseAdmin
        .from("products")
        .update({
          external_quantity: live.quantity,
          external_price: live.price,
          active: live.quantity > 0,
        })
        .eq("external_provider", "maxvia")
        .eq("external_id", extId),
    ),
  );
  return result;
}

// ---------- Criar cobrança PIX (Asaas) ----------

export const createCartCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId !== context.userId) throw new Error("Sessão inválida. Entre novamente para comprar.");
    const env: AsaasEnv = data.environment;

    const ids = data.items.map((i) => i.productId);
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id,name,price,image_url,active,source,external_provider,external_id,external_quantity")
      .in("id", ids);
    if (error) throw new Error(error.message);
    if (!products || products.length !== ids.length) throw new Error("Produto não encontrado");

    const pmap = new Map(products.map((p: any) => [p.id, p]));

    const maxviaExtIds = products
      .filter((p: any) => p.external_provider === "maxvia" && p.external_id)
      .map((p: any) => String(p.external_id));
    const live = await syncMaxviaForExternalIds(maxviaExtIds);

    let subtotalCents = 0;
    const orderItems: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPriceBrl: number;
      provider: string | null;
      externalId: string | null;
    }> = [];

    for (const it of data.items) {
      const p: any = pmap.get(it.productId);
      if (!p) throw new Error("Produto não encontrado");

      let availableQty: number | null = null;
      if (p.external_provider === "maxvia" && p.external_id) {
        const liveData = live.get(String(p.external_id));
        availableQty = liveData ? liveData.quantity : (p.external_quantity ?? 0);
      } else if (typeof p.external_quantity === "number") {
        availableQty = p.external_quantity;
      }
      if (availableQty !== null && availableQty < it.quantity) {
        throw new Error(`Estoque insuficiente para "${p.name}". Disponível: ${availableQty}.`);
      }
      if (availableQty === null && !p.active) {
        throw new Error(`Produto indisponível: ${p.name}`);
      }
      const unit = Math.round(Number(p.price) * 100);
      if (!unit || unit < 50) throw new Error(`Preço inválido para ${p.name}`);
      subtotalCents += unit * it.quantity;
      orderItems.push({
        productId: p.id,
        name: p.name,
        quantity: it.quantity,
        unitPriceBrl: Number(p.price),
        provider: p.external_provider ?? null,
        externalId: p.external_id ? String(p.external_id) : null,
      });
    }

    let discountCents = 0;
    let appliedCoupon: string | null = null;
    if (data.couponCode) {
      const c = await loadCoupon(data.couponCode);
      if (!c) throw new Error("Cupom inválido ou expirado");
      if (c.min && subtotalCents < c.min * 100) throw new Error(`Cupom requer pedido mínimo de R$ ${c.min}`);
      discountCents = c.type === "percent"
        ? Math.round((subtotalCents * c.value) / 100)
        : c.value * 100;
      appliedCoupon = data.couponCode.toUpperCase();
    }

    const totalCents = Math.max(50, subtotalCents - discountCents);
    const totalBrl = totalCents / 100;

    // 1. Cliente Asaas
    const customer = await findOrCreateCustomer(env, {
      email: data.customerEmail,
      name: data.customerName || data.customerEmail.split("@")[0],
      cpfCnpj: data.cpfCnpj,
      externalReference: data.userId,
    });

    // 2. Cria pedido em rascunho (precisamos do id para externalReference)
    const { data: orderRow, error: insErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: data.userId,
        email: data.customerEmail,
        items: orderItems,
        subtotal: subtotalCents / 100,
        discount: discountCents / 100,
        total: totalBrl,
        coupon_code: appliedCoupon,
        status: "pending",
        asaas_customer_id: customer.id,
      })
      .select("id")
      .single();
    if (insErr || !orderRow) throw new Error(insErr?.message || "Falha ao criar pedido");

    // 3. Cobrança PIX
    const description = orderItems.map((i) => `${i.quantity}x ${i.name}`).join(", ").slice(0, 480);
    const payment = await createPixPayment(env, {
      customerId: customer.id,
      valueBrl: totalBrl,
      description,
      externalReference: orderRow.id,
    });

    // 4. QR Code
    const qr = await getPixQr(env, payment.id);

    await supabaseAdmin
      .from("orders")
      .update({
        asaas_payment_id: payment.id,
        pix_payload: qr.payload,
        pix_qr_base64: qr.encodedImage,
        pix_expires_at: qr.expirationDate,
      })
      .eq("id", orderRow.id);

    await notifyOrderCreated({
      orderId: orderRow.id,
      email: data.customerEmail,
      total: totalBrl,
      items: orderItems,
      paymentId: payment.id,
      environment: env,
    });

    return {
      orderId: orderRow.id,
      paymentId: payment.id,
      pixPayload: qr.payload,
      pixQrBase64: qr.encodedImage,
      expiresAt: qr.expirationDate,
      totalBrl,
    };
  });

// ---------- Polling / Fulfillment ----------

const checkSchema = z.object({
  paymentId: z.string().min(3).max(80),
  environment: z.enum(["sandbox", "live"]),
});

export const checkPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => checkSchema.parse(d))
  .handler(async ({ data, context }) => {
    const res = await fulfillByAsaasPaymentId(data.paymentId, data.environment, { expectedUserId: context.userId });
    // Também devolve o status cru para a UI mostrar "aguardando pagamento"
    let raw: string | null = null;
    try {
      const p = await getPayment(data.environment, data.paymentId);
      raw = p.status;
    } catch { /* ignore */ }
    return { ...res, rawStatus: raw, paid: res.status === "paid" || (raw ? isPaid(raw) : false) };
  });

// ---------- Admin: re-deliver an order ----------

export const adminRedeliverOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) {
      throw new Error("Acesso negado.");
    }
    const { data: order, error } = await supabaseAdmin
      .from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido não encontrado.");

    // Limpa estado anterior para permitir nova tentativa
    await supabaseAdmin
      .from("orders")
      .update({ status: "paid", delivered_data: null, external_order_id: null })
      .eq("id", order.id);

    const fresh = { ...order, delivered_data: null, external_order_id: null, status: "paid" };
    const delivered = await fulfillPaidOrder(fresh);
    return { ok: true, items: delivered };
  });

