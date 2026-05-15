import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getBotUsername,
  broadcastToSubscribers,
  buildCouponMessage,
  buildProductPromoMessage,
} from "./telegram.server";

// Bot info + status de inscrição do usuário logado
export const getMyTelegramStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context as any;
    const username = await getBotUsername();
    const { data: tokenData } = await supabase.rpc("get_or_create_telegram_link_token");
    const token = (tokenData as any) ?? null;

    const { data: sub } = await supabaseAdmin
      .from("telegram_subscribers")
      .select("chat_id, username, first_name, active, subscribed_at")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      botUsername: username,
      linkToken: token,
      deepLink: username && token ? `https://t.me/${username}?start=${token}` : null,
      subscriber: sub
        ? {
            chatId: String((sub as any).chat_id),
            username: (sub as any).username,
            firstName: (sub as any).first_name,
            active: (sub as any).active,
          }
        : null,
    };
  });

export const setTelegramSubscriptionActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ active: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const { error } = await supabaseAdmin
      .from("telegram_subscribers")
      .update({ active: data.active })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// === Admin ===
async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("forbidden");
}

export const broadcastManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ text: z.string().min(3).max(3000) }))
  .handler(async ({ data, context }) => {
    await assertAdmin((context as any).userId);
    const result = await broadcastToSubscribers(data.text, { kind: "manual" });
    return result;
  });

export const broadcastCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ couponId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin((context as any).userId);
    const { data: c, error } = await supabaseAdmin
      .from("coupons")
      .select("id, code, discount_type, value, min_order, expires_at, active")
      .eq("id", data.couponId)
      .maybeSingle();
    if (error || !c) throw new Error("Cupom não encontrado");
    if (!(c as any).active) throw new Error("Cupom inativo");
    const text = buildCouponMessage(c as any);
    return await broadcastToSubscribers(text, {
      kind: "coupon",
      reference_id: (c as any).id,
      title: `Cupom ${(c as any).code}`,
    });
  });

export const broadcastProductPromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin((context as any).userId);
    const { data: p, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, old_price, image_url, active")
      .eq("id", data.productId)
      .maybeSingle();
    if (error || !p) throw new Error("Produto não encontrado");
    if (!(p as any).active) throw new Error("Produto inativo");
    const text = buildProductPromoMessage(p as any);
    // reference_id por produto+preço para evitar duplicar mesmo desconto
    const ref = `${(p as any).id}:${Number((p as any).price).toFixed(2)}`;
    return await broadcastToSubscribers(text, {
      kind: "product_promo",
      reference_id: ref,
      title: `Promo ${(p as any).name}`,
    });
  });

export const getBroadcastStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin((context as any).userId);
    const { count: subscribers } = await supabaseAdmin
      .from("telegram_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("active", true);
    const { data: recent } = await supabaseAdmin
      .from("promo_broadcasts")
      .select("id, kind, title, recipients_count, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    const username = await getBotUsername();
    return {
      botUsername: username,
      subscribers: subscribers ?? 0,
      recent: (recent as any[]) ?? [],
    };
  });
