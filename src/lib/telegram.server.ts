import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function getChatId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("admin_settings")
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

// ============================================================
// Newsletter via Telegram (subscribers)
// ============================================================

export function escHtml(s: any): string {
  return esc(s);
}

async function tgRequest(method: string, body: any): Promise<any> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) throw new Error("Telegram não configurado");
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Telegram ${method} ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

let _botUsernameCache: string | null = null;
export async function getBotUsername(): Promise<string | null> {
  if (_botUsernameCache) return _botUsernameCache;
  try {
    const data = await tgRequest("getMe", {});
    const u = data?.result?.username;
    if (u) _botUsernameCache = u;
    return u || null;
  } catch (e: any) {
    console.error("[telegram] getMe failed:", e?.message);
    return null;
  }
}

export async function sendToChat(chatId: number | string, text: string): Promise<boolean> {
  try {
    await tgRequest("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return true;
  } catch (e: any) {
    const msg = e?.message || "";
    // Desativa inscritos que bloquearam o bot
    if (/403|blocked|deactivated|chat not found/i.test(msg)) {
      try {
        await supabaseAdmin
          .from("telegram_subscribers")
          .update({ active: false })
          .eq("chat_id", Number(chatId));
      } catch {}
    }
    console.error(`[telegram] send to ${chatId} failed: ${msg.slice(0, 200)}`);
    return false;
  }
}

export async function broadcastToSubscribers(text: string, opts?: {
  kind?: "coupon" | "product_promo" | "manual";
  reference_id?: string | null;
  title?: string;
}): Promise<{ sent: number; failed: number; total: number; skipped?: boolean }> {
  // Idempotência: se já existe broadcast com mesma kind+reference_id, não repetir
  if (opts?.kind && opts?.reference_id) {
    const { data: existing } = await supabaseAdmin
      .from("promo_broadcasts")
      .select("id")
      .eq("kind", opts.kind)
      .eq("reference_id", opts.reference_id)
      .maybeSingle();
    if (existing) return { sent: 0, failed: 0, total: 0, skipped: true };
  }

  const { data: subs } = await supabaseAdmin
    .from("telegram_subscribers")
    .select("chat_id")
    .eq("active", true);

  let sent = 0;
  let failed = 0;
  for (const s of (subs as any[]) ?? []) {
    const ok = await sendToChat(s.chat_id, text);
    if (ok) sent++; else failed++;
    // pequeno respiro pra não estourar rate-limit (~30/s)
    await new Promise((r) => setTimeout(r, 50));
  }

  await supabaseAdmin.from("promo_broadcasts").insert({
    kind: opts?.kind ?? "manual",
    reference_id: opts?.reference_id ?? null,
    title: opts?.title ?? null,
    body: text,
    recipients_count: sent,
  });

  if (sent > 0) {
    await supabaseAdmin
      .from("telegram_subscribers")
      .update({ last_notified_at: new Date().toISOString() })
      .eq("active", true);
  }

  return { sent, failed, total: (subs?.length ?? 0) };
}

export function buildCouponMessage(c: { code: string; discount_type: string; value: number; min_order?: number; expires_at?: string | null }): string {
  const valor = c.discount_type === "percent" ? `${c.value}% OFF` : `R$ ${Number(c.value).toFixed(2)} OFF`;
  const lines = [
    `🎁 <b>Novo cupom liberado!</b>`,
    ``,
    `Use o código <b>${escHtml(c.code)}</b> e ganhe <b>${valor}</b> em sua compra.`,
    c.min_order && c.min_order > 0 ? `\n💰 Pedido mínimo: R$ ${Number(c.min_order).toFixed(2)}` : "",
    c.expires_at ? `\n⏳ Válido até ${new Date(c.expires_at).toLocaleDateString("pt-BR")}` : "",
    ``,
    `🛒 Aproveite: https://ativosfy.store/produtos`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildProductPromoMessage(p: { id: string; name: string; price: number; old_price?: number | null; image_url?: string | null }): string {
  const desconto = p.old_price && p.old_price > p.price
    ? Math.round(((p.old_price - p.price) / p.old_price) * 100)
    : null;
  const lines = [
    `🔥 <b>Promoção relâmpago!</b>`,
    ``,
    `<b>${escHtml(p.name)}</b>`,
    p.old_price ? `❌ De: <s>R$ ${Number(p.old_price).toFixed(2)}</s>` : "",
    `✅ Por: <b>R$ ${Number(p.price).toFixed(2)}</b>${desconto ? ` (-${desconto}%)` : ""}`,
    ``,
    `🛒 https://ativosfy.store/produto/${p.id}`,
  ].filter(Boolean);
  return lines.join("\n");
}
