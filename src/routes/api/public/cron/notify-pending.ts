import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyAdmin, notifyOrderPaid } from "@/lib/telegram.server";

/**
 * Rota de RECUPERAÇÃO de alertas Telegram.
 *
 * Varre `credit_purchases` e `orders` que estão pagas mas que ainda não foram
 * notificadas (admin_notified_at IS NULL) e dispara o alerta. Idempotente:
 * após enviar, marca como notificada e não dispara de novo.
 *
 * Pode ser chamada manualmente ou por um cron (pg_cron / scheduler externo).
 * Sem segredo porque ela só atua sobre dados próprios e é idempotente — o
 * pior cenário é alguém disparar alertas atrasados que já deveriam ter saído.
 */
export const Route = createFileRoute("/api/public/cron/notify-pending")({
  server: {
    handlers: {
      GET: async () => handle(),
      POST: async () => handle(),
    },
  },
});

async function handle() {
  const sent: Array<{ kind: string; id: string }> = [];
  const errors: Array<{ kind: string; id: string; error: string }> = [];

  // ── credit_purchases ──────────────────────────────────────────────
  const { data: credits } = await (supabaseAdmin as any)
    .from("credit_purchases")
    .select("id, buyer_email, lovable_email, price_brl, credits, cycles, asaas_payment_id, paid_at")
    .in("status", ["paid", "done"])
    .is("admin_notified_at", null)
    .order("paid_at", { ascending: true })
    .limit(50);

  for (const c of credits ?? []) {
    try {
      await notifyAdmin(
        [
          `✅ <b>Pagamento aprovado — Créditos Lovable</b> <i>(reenvio)</i>`,
          `<b>Pacote:</b> ${c.credits} créditos (${c.cycles} ciclos) — R$ ${Number(c.price_brl).toFixed(2)}`,
          `<b>Cliente:</b> ${c.buyer_email}`,
          `<b>Conta Lovable:</b> ${c.lovable_email}`,
          `<b>Compra:</b> <code>${c.id}</code>`,
          c.asaas_payment_id ? `<b>Cobrança:</b> <code>${c.asaas_payment_id}</code>` : "",
        ].filter(Boolean).join("\n"),
      );
      await (supabaseAdmin as any)
        .from("credit_purchases")
        .update({ admin_notified_at: new Date().toISOString() })
        .eq("id", c.id);
      sent.push({ kind: "credit", id: c.id });
    } catch (e: any) {
      errors.push({ kind: "credit", id: c.id, error: e?.message ?? "unknown" });
    }
  }

  // ── orders ────────────────────────────────────────────────────────
  const { data: orders } = await (supabaseAdmin as any)
    .from("orders")
    .select("id, email, total, items, asaas_payment_id, delivered_data, created_at")
    .in("status", ["paid", "delivered"])
    .is("admin_notified_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  for (const o of orders ?? []) {
    try {
      await notifyOrderPaid({
        orderId: o.id,
        email: o.email,
        total: Number(o.total) || 0,
        items: Array.isArray(o.items) ? o.items : [],
        paymentId: o.asaas_payment_id,
        delivered: Array.isArray(o.delivered_data) ? o.delivered_data : null,
      });
      await (supabaseAdmin as any)
        .from("orders")
        .update({ admin_notified_at: new Date().toISOString() })
        .eq("id", o.id);
      sent.push({ kind: "order", id: o.id });
    } catch (e: any) {
      errors.push({ kind: "order", id: o.id, error: e?.message ?? "unknown" });
    }
  }

  return Response.json({ sent, errors, totals: { sent: sent.length, errors: errors.length } });
}
