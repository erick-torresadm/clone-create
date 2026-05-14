import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type AsaasEnv, getPayment, isPaid } from "@/lib/asaas.server";
import { notifyOrderPaid } from "@/lib/telegram.server";
import { sendOrderDeliveredEmail } from "@/lib/resend.server";

const MAXVIA_BASE = "https://maxvia88.com/api/v1";

export type DeliveredItem = {
  productId: string;
  name: string;
  quantity: number;
  externalOrderId?: number | string | null;
  accounts?: Array<{ uid?: string; full_info?: string; link_backup?: string | null }>;
  error?: string;
};

function normalizeMaxviaAccounts(payload: any): Array<{ uid?: string; full_info?: string; link_backup?: string | null }> {
  const raw = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.accounts)
    ? payload.data.accounts
    : Array.isArray(payload?.accounts)
    ? payload.accounts
    : payload?.data && typeof payload.data === "object"
    ? [payload.data]
    : payload?.account
    ? [payload.account]
    : [];
  return raw.map((account: any) => {
    if (typeof account === "string") return { full_info: account };
    return {
      uid: account?.uid != null ? String(account.uid) : undefined,
      full_info: account?.full_info ?? account?.info ?? account?.account ?? account?.data ?? JSON.stringify(account),
      link_backup: account?.link_backup ?? account?.backup ?? null,
    };
  });
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timeout`)), ms)),
  ]);
}

export async function fulfillPaidOrder(order: any): Promise<DeliveredItem[]> {
  const apiKey = process.env.MAXVIA_API_KEY;
  const items = (order.items as any[]) ?? [];
  const delivered: DeliveredItem[] = [];

  for (const it of items) {
    const base: DeliveredItem = { productId: it.productId, name: it.name, quantity: it.quantity };

    if (it.provider !== "maxvia" || !it.externalId) {
      try {
        const { data: claimed, error: claimErr } = await supabaseAdmin.rpc("claim_stock", {
          _product_id: it.productId,
          _quantity: it.quantity,
          _order_id: order.id,
        });
        if (claimErr) throw claimErr;
        const rows = (claimed ?? []) as Array<{ id: string; content: string }>;
        delivered.push({
          ...base,
          accounts: rows.map((r) => ({ full_info: r.content })),
          ...(rows.length < it.quantity
            ? { error: `Estoque insuficiente: entregamos ${rows.length}/${it.quantity}.` }
            : {}),
        });
      } catch (e: any) {
        delivered.push({ ...base, error: e?.message || "Falha ao reservar estoque." });
      }
      continue;
    }

    if (!apiKey) {
      delivered.push({ ...base, error: "Provedor não configurado." });
      continue;
    }

    try {
      const buyRes = await withTimeout(
        fetch(`${MAXVIA_BASE}/buy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: apiKey, id_product: Number(it.externalId), quantity: it.quantity }),
        }),
        20000,
        "MaxVia /buy",
      );
      const buyJson: any = await buyRes.json().catch(() => ({}));
      console.log(`[fulfill] maxvia /buy status=${buyRes.status} body=${JSON.stringify(buyJson).slice(0, 400)}`);

      if (!buyRes.ok || buyJson?.status === false) {
        const msg = buyJson?.msg || buyJson?.message || `HTTP ${buyRes.status}`;
        delivered.push({ ...base, error: `Fornecedor: ${msg}` });
        continue;
      }

      const externalOrderId = buyJson?.order_id ?? buyJson?.data?.order_id ?? buyJson?.data?.id ?? null;
      let accounts = normalizeMaxviaAccounts(buyJson);
      if (!accounts.length && externalOrderId) {
        const detRes = await withTimeout(
          fetch(`${MAXVIA_BASE}/order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: apiKey, order_id: externalOrderId }),
          }),
          20000,
          "MaxVia /order",
        );
        const detJson: any = await detRes.json().catch(() => ({}));
        accounts = normalizeMaxviaAccounts(detJson);
      }

      if (!accounts.length) {
        delivered.push({ ...base, externalOrderId, error: "Fornecedor não retornou contas." });
      } else {
        delivered.push({ ...base, externalOrderId, accounts });
      }
    } catch (e: any) {
      delivered.push({ ...base, error: e?.message || "Erro inesperado." });
    }
  }

  await supabaseAdmin
    .from("orders")
    .update({
      status: "delivered",
      delivered_data: delivered,
      external_order_id: delivered.find((d) => d.externalOrderId)
        ? String(delivered.find((d) => d.externalOrderId)!.externalOrderId)
        : null,
    })
    .eq("id", order.id);

  await notifyOrderPaid({
    orderId: order.id,
    email: order.email,
    total: Number(order.total),
    items: (order.items as any[]) ?? [],
    paymentId: order.asaas_payment_id,
    delivered,
  });

  return delivered;
}

async function beginFulfillment(orderId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status: "processing" })
    .eq("id", orderId)
    .is("delivered_data", null)
    .in("status", ["pending", "paid"])
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

/** Verifica status do pagamento Asaas. Se pago, executa fulfillment. */
export async function fulfillByAsaasPaymentId(
  paymentId: string,
  env: AsaasEnv,
  opts?: { expectedUserId?: string },
): Promise<{ status: "paid" | "pending"; items: DeliveredItem[] }> {
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("asaas_payment_id", paymentId)
    .maybeSingle();
  if (orderErr) throw new Error(orderErr.message);
  if (!order) throw new Error("Pedido não encontrado.");
  if (opts?.expectedUserId && order.user_id && order.user_id !== opts.expectedUserId) {
    throw new Error("Pedido não pertence à sua conta.");
  }

  if ((order.status === "paid" || order.status === "delivered") && order.delivered_data) {
    return { status: "paid", items: order.delivered_data as DeliveredItem[] };
  }

  const payment = await getPayment(env, paymentId);
  console.log(`[fulfill-asaas] payment=${paymentId} status=${payment.status} order=${order.status}`);
  if (!isPaid(payment.status)) return { status: "pending", items: [] };

  const started = await beginFulfillment(order.id);
  if (!started) {
    const { data: cached } = await supabaseAdmin
      .from("orders")
      .select("delivered_data")
      .eq("id", order.id)
      .maybeSingle();
    if (cached?.delivered_data) return { status: "paid", items: cached.delivered_data as DeliveredItem[] };
    return { status: "pending", items: [] };
  }

  const delivered = await fulfillPaidOrder(order);
  return { status: "paid", items: delivered };
}
