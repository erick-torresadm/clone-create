import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
});

const inputSchema = z.object({
  items: z.array(itemSchema).min(1).max(30),
  couponCode: z.string().max(40).optional(),
  customerEmail: z.string().email().optional(),
  userId: z.string().uuid().optional(),
  returnUrl: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

const COUPONS: Record<string, { type: "percent" | "fixed"; value: number; min?: number }> = {
  BLUE10: { type: "percent", value: 10 },
  BLUE20: { type: "percent", value: 20, min: 200 },
  PRIME50: { type: "fixed", value: 50, min: 300 },
};

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

export const createCartCheckout = createServerFn({ method: "POST" })
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const env: StripeEnv = data.environment;
    const stripe = createStripeClient(env);

    // Buscar produtos do banco — preço/nome autoritativos no servidor
    const ids = data.items.map((i) => i.productId);
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id,name,price,image_url,active")
      .in("id", ids);
    if (error) throw new Error(error.message);
    if (!products || products.length !== ids.length) throw new Error("Produto não encontrado");

    const pmap = new Map(products.map((p: any) => [p.id, p]));
    let subtotalCents = 0;
    const line_items = data.items.map((it) => {
      const p: any = pmap.get(it.productId);
      if (!p?.active) throw new Error(`Produto indisponível: ${p?.name ?? it.productId}`);
      const unit = Math.round(Number(p.price) * 100);
      if (!unit || unit < 50) throw new Error(`Preço inválido para ${p.name}`);
      subtotalCents += unit * it.quantity;
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

    // Cupom
    let discounts: Array<{ coupon: string }> = [];
    if (data.couponCode) {
      const c = COUPONS[data.couponCode.trim().toUpperCase()];
      if (!c) throw new Error("Cupom inválido");
      if (c.min && subtotalCents < c.min * 100) throw new Error(`Cupom requer pedido mínimo de R$ ${c.min}`);
      const coupon = c.type === "percent"
        ? await stripe.coupons.create({ percent_off: c.value, duration: "once", name: data.couponCode.toUpperCase() })
        : await stripe.coupons.create({ amount_off: c.value * 100, currency: "brl", duration: "once", name: data.couponCode.toUpperCase() });
      discounts = [{ coupon: coupon.id }];
    }

    const customerId = (data.customerEmail || data.userId)
      ? await resolveOrCreateCustomer(stripe, { email: data.customerEmail, userId: data.userId })
      : undefined;

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      ...(customerId && { customer: customerId }),
      ...(discounts.length && { discounts }),
      ...(data.userId && { metadata: { userId: data.userId } }),
    });

    return session.client_secret;
  });
