import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function getChatId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("telegram_admin_chat_id")
    .eq("id", 1)
    .maybeSingle();
  const id = (data as any)?.telegram_admin_chat_id?.toString().trim();
  return id || null;
}

export async function notifyAdmin(text: string): Promise<void> {
  try {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return;
    const chatId = await getChatId();
    if (!chatId) return;
    const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[telegram] notify failed ${res.status}: ${body.slice(0, 300)}`);
    }
  } catch (e: any) {
    console.error(`[telegram] notify error: ${e?.message}`);
  }
}

function esc(s: any): string {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

export function formatItems(items: any[]): string {
  if (!Array.isArray(items)) return "";
  return items
    .map((it) => `• ${esc(it.quantity)}x ${esc(it.name)} — R$ ${Number(it.unitPriceBrl ?? 0).toFixed(2)}`)
    .join("\n");
}

export async function notifyOrderCreated(opts: {
  orderId: string;
  email: string;
  total: number;
  items: any[];
  paymentId?: string | null;
  environment: "sandbox" | "live";
}) {
  const lines = [
    `🟡 <b>Novo pedido criado</b>`,
    `<b>Pedido:</b> <code>${esc(opts.orderId)}</code>`,
    `<b>Cliente:</b> ${esc(opts.email)}`,
    `<b>Total:</b> R$ ${opts.total.toFixed(2)}`,
    `<b>Pagamento:</b> PIX (Asaas ${opts.environment})`,
    `<b>Status:</b> aguardando pagamento`,
    opts.paymentId ? `<b>Cobrança:</b> <code>${esc(opts.paymentId)}</code>` : "",
    "",
    `<b>Itens:</b>\n${formatItems(opts.items)}`,
  ].filter(Boolean);
  await notifyAdmin(lines.join("\n"));
}

export async function notifyOrderPaid(opts: {
  orderId: string;
  email?: string | null;
  total: number;
  items: any[];
  paymentId?: string | null;
  delivered?: any[] | null;
}) {
  const errors = (opts.delivered ?? []).filter((d) => d?.error);
  const ok = (opts.delivered ?? []).filter((d) => !d?.error);
  const lines = [
    `✅ <b>Pagamento aprovado</b>`,
    `<b>Pedido:</b> <code>${esc(opts.orderId)}</code>`,
    opts.email ? `<b>Cliente:</b> ${esc(opts.email)}` : "",
    `<b>Total:</b> R$ ${opts.total.toFixed(2)}`,
    opts.paymentId ? `<b>Cobrança:</b> <code>${esc(opts.paymentId)}</code>` : "",
    "",
    `<b>Itens:</b>\n${formatItems(opts.items)}`,
    opts.delivered ? `\n<b>Entrega:</b> ${ok.length} ok, ${errors.length} com erro` : "",
    errors.length ? `\n⚠️ ${errors.map((e) => `${esc(e.name)}: ${esc(e.error)}`).join("\n")}` : "",
  ].filter(Boolean);
  await notifyAdmin(lines.join("\n"));
}

export async function notifyOrderStatus(opts: {
  orderId: string;
  status: string;
  paymentId?: string | null;
}) {
  const icon = opts.status === "refunded" ? "↩️" : "❌";
  await notifyAdmin(
    [
      `${icon} <b>Pedido ${esc(opts.status)}</b>`,
      `<b>Pedido:</b> <code>${esc(opts.orderId)}</code>`,
      opts.paymentId ? `<b>Cobrança:</b> <code>${esc(opts.paymentId)}</code>` : "",
    ].filter(Boolean).join("\n"),
  );
}
