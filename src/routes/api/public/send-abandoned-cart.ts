import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendAbandonedCartEmail } from "@/lib/resend.server";

const COUPON_CODE = "CARRINHO15";
const DISCOUNT_PERCENT = 15;
const ABANDON_AFTER_MIN = 30;

export const Route = createFileRoute("/api/public/send-abandoned-cart")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth simples via apikey (anon) — evita abuso público
        const apikey = request.headers.get("apikey");
        if (apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        const cutoff = new Date(Date.now() - ABANDON_AFTER_MIN * 60_000).toISOString();

        const { data: orders, error } = await supabaseAdmin
          .from("orders")
          .select("id,email,created_at")
          .eq("status", "pending")
          .is("abandoned_email_sent_at", null)
          .lt("created_at", cutoff)
          .not("email", "is", null)
          .limit(50);

        if (error) {
          console.error("[abandoned-cart] query error:", error.message);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const storeUrl = "https://ativosfy.store/produtos";
        let sent = 0;

        for (const order of orders ?? []) {
          if (!order.email) continue;
          try {
            await sendAbandonedCartEmail({
              to: order.email,
              couponCode: COUPON_CODE,
              discountPercent: DISCOUNT_PERCENT,
              storeUrl,
            });
            await supabaseAdmin
              .from("orders")
              .update({ abandoned_email_sent_at: new Date().toISOString() })
              .eq("id", order.id);
            sent++;
          } catch (e: any) {
            console.error(`[abandoned-cart] failed for ${order.id}:`, e?.message);
          }
        }

        return Response.json({ ok: true, candidates: orders?.length ?? 0, sent });
      },
    },
  },
});
