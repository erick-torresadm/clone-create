import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAXVIA_BASE = "https://maxvia88.com/api/v1";

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
});

const inputSchema = z.object({
  items: z.array(itemSchema).min(1).max(30),
  couponCode: z.string().max(40).optional(),
  customerEmail: z.string().email(),
  userId: z.string().uuid(),
  returnUrl: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

const COUPONS: Record<string, { type: "percent" | "fixed"; value: number; min?: number }> = {
  BLUE10: { type: "percent", value: 10 },
  BLUE20: { type: "percent", value: 20, min: 200 },
  PRIME50: { type: "fixed", value: 50, min: 300 },
};

// ---------- MaxVia helpers ----------

type LiveItem = { quantity: number; price: number };

/**
 * Just-in-time MaxVia stock sync. Scans every category once and updates
 * `external_quantity / external_price / active` for every requested external_id.
 * Returns a map external_id -> live data so the caller can re-check stock
 * without doing another DB roundtrip.
 */
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
  } catch {
    return result; // network failure — let caller fall back to DB values
  }

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
    } catch {
      // skip category on transient failure
    }
  }

  // Persist to DB so the catalog reflects reality
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

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

function isPixActivationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.toLowerCase().includes("payment method type provided: pix is invalid");
}

// ---------- Create checkout session ----------

export const createCartCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId !== context.userId) throw new Error("Sessão inválida. Entre novamente para comprar.");
    const env: StripeEnv = data.environment;
    const stripe = createStripeClient(env);

    // 1. Load products from DB
    const ids = data.items.map((i) => i.productId);
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id,name,price,image_url,active,source,external_provider,external_id,external_quantity")
      .in("id", ids);
    if (error) throw new Error(error.message);
    if (!products || products.length !== ids.length) throw new Error("Produto não encontrado");

    const pmap = new Map(products.map((p: any) => [p.id, p]));

    // 2. JIT stock sync for maxvia items (covers stale "indisponível" cases)
    const maxviaExtIds = products
      .filter((p: any) => p.external_provider === "maxvia" && p.external_id)
      .map((p: any) => String(p.external_id));
    const live = await syncMaxviaForExternalIds(maxviaExtIds);

    // 3. Validate stock per cart item using freshest data available
    let subtotalCents = 0;
    const orderItems: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPriceBrl: number;
      provider: string | null;
      externalId: string | null;
    }> = [];

    const line_items = data.items.map((it) => {
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
      // For non-API products without quantity tracking, just respect the active flag.
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

      return {
        price_data: {
          currency: "brl",
          product_data: {
            name: String(p.name).slice(0, 250),
            ...(p.image_url ? { images: [p.image_url] } : {}),
          },
          unit_amount: unit,
        },
        quantity: it.quantity,
      };
    });

    // 4. Coupon
    let discounts: Array<{ coupon: string }> = [];
    let discountCents = 0;
    if (data.couponCode) {
      const c = COUPONS[data.couponCode.trim().toUpperCase()];
      if (!c) throw new Error("Cupom inválido");
      if (c.min && subtotalCents < c.min * 100) throw new Error(`Cupom requer pedido mínimo de R$ ${c.min}`);
      const coupon = c.type === "percent"
        ? await stripe.coupons.create({ percent_off: c.value, duration: "once", name: data.couponCode.toUpperCase() })
        : await stripe.coupons.create({ amount_off: c.value * 100, currency: "brl", duration: "once", name: data.couponCode.toUpperCase() });
      discounts = [{ coupon: coupon.id }];
      discountCents = c.type === "percent"
        ? Math.round((subtotalCents * c.value) / 100)
        : c.value * 100;
    }

    const customerId = (data.customerEmail || data.userId)
      ? await resolveOrCreateCustomer(stripe, { email: data.customerEmail, userId: data.userId })
      : undefined;

    // 5. Create Stripe session. Live keeps Pix-only; sandbox retries with
    // Stripe's default test methods if Pix is not enabled on the test account,
    // so the checkout never renders as an empty panel during preview.
    const checkoutSessionParams = {
      line_items,
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      redirect_on_completion: "always",
      ...(customerId && { customer: customerId }),
      ...(discounts.length && { discounts }),
      metadata: {
        ...(data.userId && { userId: data.userId }),
        env,
      },
    } as const;

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        ...checkoutSessionParams,
        payment_method_types: ["pix"],
      });
    } catch (error) {
      if (env !== "sandbox" || !isPixActivationError(error)) throw error;
      session = await stripe.checkout.sessions.create({
        ...checkoutSessionParams,
        metadata: { ...checkoutSessionParams.metadata, pix_test_fallback: "true" },
      });
    }

    // 6. Persist a pending order so fulfillment can resolve cart items by session id
    const totalCents = Math.max(0, subtotalCents - discountCents);
    await supabaseAdmin.from("orders").insert({
      user_id: data.userId ?? null,
      email: data.customerEmail ?? null,
      items: orderItems,
      subtotal: subtotalCents / 100,
      discount: discountCents / 100,
      total: totalCents / 100,
      coupon_code: data.couponCode?.toUpperCase() ?? null,
      stripe_session_id: session.id,
      status: "pending",
    });

    return session.client_secret;
  });

// ---------- Fulfillment ----------

import { fulfillBySessionId } from "@/lib/checkout.server";

const fulfillSchema = z.object({
  sessionId: z.string().min(5).max(200),
  environment: z.enum(["sandbox", "live"]),
});

export const fulfillCheckoutOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => fulfillSchema.parse(d))
  .handler(async ({ data, context }) => {
    return await fulfillBySessionId(data.sessionId, data.environment, { expectedUserId: context.userId });
  });
