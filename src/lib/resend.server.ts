// Envio de e-mails transacionais via Resend
const RESEND_API = "https://api.resend.com/emails";
const FROM = "Ativosfy <noreply@ativosfy.store>";

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendResendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[resend] RESEND_API_KEY não configurado");
    return;
  }
  if (!opts.to || !opts.to.includes("@")) {
    console.warn("[resend] destinatário inválido, ignorando envio:", opts.to);
    return;
  }
  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[resend] falha ${res.status}: ${body.slice(0, 400)}`);
      return;
    }
    const json = (await res.json().catch(() => ({}))) as any;
    console.log(`[resend] enviado id=${json?.id} to=${opts.to}`);
  } catch (e: any) {
    console.error(`[resend] erro: ${e?.message}`);
  }
}

export async function sendOrderDeliveredEmail(opts: {
  to: string;
  orderId: string;
  total: number;
  delivered: Array<{
    name: string;
    quantity: number;
    accounts?: Array<{ uid?: string; full_info?: string; link_backup?: string | null }>;
    error?: string;
  }>;
}) {
  const total = `R$ ${Number(opts.total).toFixed(2).replace(".", ",")}`;
  const itemsHtml = opts.delivered
    .map((d) => {
      if (d.error) {
        return `<tr><td style="padding:12px;border-bottom:1px solid #eee"><b>${escapeHtml(d.name)}</b> × ${d.quantity}<br><span style="color:#c00;font-size:13px">⚠ ${escapeHtml(d.error)}</span></td></tr>`;
      }
      const accs = (d.accounts ?? [])
        .map(
          (a, i) => `
            <div style="margin-top:10px;padding:12px;background:#0f172a;color:#e2e8f0;border-radius:8px;font-family:Menlo,Consolas,monospace;font-size:13px;white-space:pre-wrap;word-break:break-all">
              <div style="color:#60a5fa;margin-bottom:6px">Conta ${i + 1}${a.uid ? ` · UID ${escapeHtml(a.uid)}` : ""}</div>
              ${escapeHtml(a.full_info ?? "")}
              ${a.link_backup ? `<div style="margin-top:8px"><a href="${escapeHtml(a.link_backup)}" style="color:#93c5fd">Backup</a></div>` : ""}
            </div>`,
        )
        .join("");
      return `<tr><td style="padding:14px;border-bottom:1px solid #eee"><b>${escapeHtml(d.name)}</b> × ${d.quantity}${accs}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a">
    <div style="max-width:620px;margin:0 auto;padding:24px">
      <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08)">
        <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:28px;text-align:center;color:#fff">
          <div style="font-size:22px;font-weight:800;letter-spacing:-.5px">Ativosfy</div>
          <div style="margin-top:6px;opacity:.9;font-size:14px">Seu pedido foi entregue ✅</div>
        </div>
        <div style="padding:24px">
          <p style="margin:0 0 6px;font-size:15px">Olá! Pagamento confirmado e contas liberadas.</p>
          <p style="margin:0 0 18px;color:#64748b;font-size:13px">Pedido <code>${escapeHtml(opts.orderId)}</code> · Total ${total}</p>
          <table style="width:100%;border-collapse:collapse">${itemsHtml}</table>
          <p style="margin:22px 0 0;font-size:13px;color:#64748b">⚠ Guarde estas informações em local seguro. Em caso de problema nas primeiras 24h, fale com o suporte no Telegram.</p>
        </div>
        <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center">
          © ${new Date().getFullYear()} Ativosfy · ativosfy.store
        </div>
      </div>
    </div></body></html>`;

  await sendResendEmail({
    to: opts.to,
    subject: `Ativosfy · Pedido entregue (${opts.orderId.slice(0, 8)})`,
    html,
  });
}

export async function sendAbandonedCartEmail(opts: {
  to: string;
  couponCode: string;
  discountPercent: number;
  storeUrl: string;
}) {
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08)">
        <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:32px 24px;text-align:center;color:#fff">
          <div style="font-size:24px;font-weight:800;letter-spacing:-.5px">Ativosfy</div>
          <div style="margin-top:8px;opacity:.95;font-size:15px">Você esqueceu seu carrinho 🛒</div>
        </div>
        <div style="padding:28px 24px">
          <p style="margin:0 0 14px;font-size:16px">Olá! Notamos que você começou uma compra mas não finalizou.</p>
          <p style="margin:0 0 22px;font-size:15px;color:#475569">Que tal um empurrãozinho? Use o cupom abaixo e ganhe <b>${opts.discountPercent}% de desconto</b> no seu pedido:</p>
          <div style="text-align:center;margin:22px 0">
            <div style="display:inline-block;padding:16px 28px;background:#0f172a;color:#fff;border-radius:12px;font-family:Menlo,Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:2px">
              ${escapeHtml(opts.couponCode)}
            </div>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="${escapeHtml(opts.storeUrl)}" style="display:inline-block;padding:14px 32px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">Voltar para a loja</a>
          </div>
          <p style="margin:22px 0 0;font-size:12px;color:#94a3b8;text-align:center">Aplique o cupom no checkout para ativar o desconto.</p>
        </div>
        <div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:11px;text-align:center">
          © ${new Date().getFullYear()} Ativosfy · ativosfy.store
        </div>
      </div>
    </div></body></html>`;

  await sendResendEmail({
    to: opts.to,
    subject: `🎁 ${opts.discountPercent}% off — termine sua compra na Ativosfy`,
    html,
  });
}
