import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fulfillByAsaasPaymentId } from "@/lib/checkout.server";
import { notifyOrderStatus, notifyAdmin } from "@/lib/telegram.server";
import { sendCreditsCapiEvent, creditsPurchaseEventId } from "@/lib/meta-capi.server";
import { sendCreditPurchaseConfirmationEmail } from "@/lib/resend.server";
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
          // Créditos Lovable — sempre atualiza pra paid (idempotente)
          await (supabaseAdmin as any)
            .from("credit_purchases")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("asaas_payment_id", paymentId)
            .eq("status", "pending");

          // Re-busca a row (sem filtrar status) pra notificar de forma idempotente
          const { data: creditRow } = await (supabaseAdmin as any)
            .from("credit_purchases")
            .select("id, buyer_email, lovable_email, price_brl, package_id, credits, cycles, admin_notified_at, purchase_sequence, bonus_credits, cashback_generated")
            .eq("asaas_payment_id", paymentId)
            .maybeSingle();

          // 🎁 Fidelidade: calcular sequência + bônus + cashback (idempotente)
          if (creditRow?.id && creditRow.buyer_email && creditRow.purchase_sequence == null) {
            try {
              const { effectiveBonusPercent } = await import("@/lib/loyalty.functions");
              const buyerEmail = String(creditRow.buyer_email).toLowerCase();
              // conta compras pagas anteriores (excluindo esta)
              const { count: priorCount } = await (supabaseAdmin as any)
                .from("credit_purchases")
                .select("id", { count: "exact", head: true })
                .eq("buyer_email", buyerEmail)
                .in("status", ["paid", "done"])
                .neq("id", creditRow.id);
              const purchaseSequence = (priorCount ?? 0) + 1;
              // total gasto anterior (para tier)
              const { data: priorRows } = await (supabaseAdmin as any)
                .from("credit_purchases")
                .select("price_brl")
                .eq("buyer_email", buyerEmail)
                .in("status", ["paid", "done"])
                .neq("id", creditRow.id);
              const prevSpent = ((priorRows ?? []) as any[]).reduce((s, r) => s + Number(r.price_brl || 0), 0);
              const bonusPercent = effectiveBonusPercent(purchaseSequence, prevSpent);
              const bonusCredits = Math.round((Number(creditRow.credits) * bonusPercent) / 100);
              const priceBrl = Number(creditRow.price_brl) || 0;
              const cashback = Math.round(priceBrl * 5) / 100; // 5% arredondado em centavos
              const cashbackExpires = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

              await (supabaseAdmin as any)
                .from("credit_purchases")
                .update({
                  purchase_sequence: purchaseSequence,
                  bonus_credits: bonusCredits,
                  bonus_percent: bonusPercent,
                  cashback_generated: cashback,
                  cashback_expires_at: cashbackExpires,
                })
                .eq("id", creditRow.id);

              creditRow.purchase_sequence = purchaseSequence;
              creditRow.bonus_credits = bonusCredits;
              creditRow.cashback_generated = cashback;
            } catch (e: any) {
              console.error(`[asaas-webhook] loyalty calc failed: ${e?.message}`);
            }
          }

          // 🔔 Telegram: pagamento aprovado (créditos Lovable) — só dispara 1x
          if (creditRow?.id && !creditRow.admin_notified_at) {
            try {
              await notifyAdmin(
                [
                  `✅ <b>Pagamento aprovado — Créditos Lovable</b>`,
                  `<b>Pacote:</b> ${creditRow.credits} créditos (${creditRow.cycles} ciclos) — R$ ${Number(creditRow.price_brl).toFixed(2)}`,
                  `<b>Cliente:</b> ${creditRow.buyer_email}`,
                  `<b>Conta Lovable:</b> ${creditRow.lovable_email}`,
                  `<b>Compra:</b> <code>${creditRow.id}</code>`,
                  `<b>Cobrança:</b> <code>${paymentId}</code>`,
                ].join("\n"),
              );
              await (supabaseAdmin as any)
                .from("credit_purchases")
                .update({ admin_notified_at: new Date().toISOString() })
                .eq("id", creditRow.id);

              // 📧 Email pro cliente com link da página de progresso
              if (creditRow.buyer_email) {
                sendCreditPurchaseConfirmationEmail({
                  to: creditRow.buyer_email,
                  purchaseId: creditRow.id,
                  credits: creditRow.credits,
                  cycles: creditRow.cycles,
                  priceBrl: Number(creditRow.price_brl) || 0,
                  lovableEmail: creditRow.lovable_email,
                }).catch((e) =>
                  console.error(`[asaas-webhook] credit email failed: ${e?.message}`),
                );
              }
            } catch (e: any) {
              console.error(`[asaas-webhook] telegram credit alert failed: ${e?.message}`);
            }
          }

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
