import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fulfillByAsaasPaymentId } from "@/lib/checkout.server";
import { notifyOrderStatus } from "@/lib/telegram.server";
import { sendCreditsCapiEvent, creditsPurchaseEventId } from "@/lib/meta-capi.server";
import type { AsaasEnv } from "@/lib/asaas.server";

// Webhook do Asaas. Configure em "Integrações > Webhooks" apontando para
// https://<seu-dominio>/api/public/asaas/webhook?env=sandbox e adicione um
// token em "asaas-access-token" (salve como ASAAS_WEBHOOK_TOKEN).
export const Route = createFileRoute("/api/public/asaas/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env: AsaasEnv = url.searchParams.get("env") === "live" ? "live" : "sandbox";

        const expected = process.env.ASAAS_WEBHOOK_TOKEN;
        if (expected) {
          const token = request.headers.get("asaas-access-token");
          if (token !== expected) {
            return new Response("Invalid token", { status: 401 });
          }
        }

        let body: any;
        try { body = await request.json(); } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const event = body?.event as string | undefined;
        const payment = body?.payment;
        const paymentId = payment?.id as string | undefined;
        if (!paymentId) return Response.json({ ok: true });

        console.log(`[asaas-webhook] event=${event} payment=${paymentId} status=${payment?.status}`);

        if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
          // Créditos Lovable
          const { data: creditRow } = await (supabaseAdmin as any)
            .from("credit_purchases")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("asaas_payment_id", paymentId)
            .eq("status", "pending")
            .select("id, buyer_email, price_brl, package_id, credits")
            .maybeSingle();

          // 🎯 Meta CAPI: Purchase server-side do funil de créditos
          if (creditRow?.id) {
            await sendCreditsCapiEvent({
              eventName: "Purchase",
              eventId: creditsPurchaseEventId(creditRow.id),
              eventSourceUrl: "https://ativosfy.store/creditos-lovable/checkout",
              valueBrl: Number(creditRow.price_brl) || 0,
              contentIds: [creditRow.package_id],
              contentName: `${creditRow.credits} créditos Lovable`,
              user: {
                email: creditRow.buyer_email,
                clientIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
                userAgent: request.headers.get("user-agent"),
              },
            }).catch((e) => console.error(`[asaas-webhook] capi error: ${e?.message}`));
          }

          await supabaseAdmin
            .from("orders")
            .update({ status: "paid" })
            .eq("asaas_payment_id", paymentId)
            .eq("status", "pending");
          await fulfillByAsaasPaymentId(paymentId, env).catch((e) =>
            console.error(`[asaas-webhook] fulfill error: ${e?.message}`),
          );
          // Register referral commission if the buyer was referred by someone
          const { data: ord } = await supabaseAdmin
            .from("orders").select("id").eq("asaas_payment_id", paymentId).maybeSingle();
          if (ord?.id) {
            const { error: rcErr } = await (supabaseAdmin as any).rpc("register_referral_commission", { _order_id: ord.id });
            if (rcErr) console.error("[ref-commission]", rcErr.message);
          }
        } else if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") {
          const newStatus = event === "PAYMENT_REFUNDED" ? "refunded" : "canceled";
          const { data: row } = await supabaseAdmin
            .from("orders")
            .update({ status: newStatus })
            .eq("asaas_payment_id", paymentId)
            .select("id")
            .maybeSingle();
          if (row?.id) {
            await notifyOrderStatus({ orderId: row.id, status: newStatus, paymentId });
          }
        }

        return Response.json({ received: true });
      },
    },
  },
});
