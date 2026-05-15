import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Webhook público do bot Telegram. Lida com /start <token> para vincular
// um usuário do site ao chat dele e cadastrá-lo como inscrito de promoções.
export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let update: any;
        try {
          update = await request.json();
        } catch {
          return Response.json({ ok: true, ignored: "no-body" });
        }

        const message = update?.message ?? update?.edited_message;
        const chat = message?.chat;
        const from = message?.from;
        const text: string = (message?.text ?? "").toString().trim();

        if (!chat?.id || !text) return Response.json({ ok: true, ignored: "no-text" });

        const chatId: number = Number(chat.id);
        const username: string | null = from?.username ?? null;
        const firstName: string | null = from?.first_name ?? chat?.first_name ?? null;

        // Comandos
        const lower = text.toLowerCase();

        if (lower.startsWith("/start")) {
          const parts = text.split(/\s+/);
          const token = parts[1] || null;

          // Procurar usuário pelo token (formato u + primeiros 16 chars do uuid sem hífen)
          let userId: string | null = null;
          if (token && /^u[a-f0-9]{16}$/i.test(token)) {
            const prefix = token.slice(1);
            const { data: prof } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .filter("id", "ilike", `${prefix.slice(0, 8)}-${prefix.slice(8, 12)}%`)
              .limit(1)
              .maybeSingle();
            if (prof) userId = (prof as any).id;
          }

          await supabaseAdmin
            .from("telegram_subscribers")
            .upsert(
              {
                chat_id: chatId,
                user_id: userId,
                username,
                first_name: firstName,
                link_token: token,
                active: true,
              },
              { onConflict: "chat_id" },
            );

          await sendReply(
            chatId,
            [
              "🎉 <b>Pronto! Você está inscrito.</b>",
              "",
              "Vou te avisar aqui sempre que tiver:",
              "🎁 novo cupom de desconto",
              "🔥 produto entrando em promoção",
              "",
              userId
                ? "✅ Sua conta no site foi vinculada."
                : "ℹ️ Para vincular sua conta do site, abra o painel em ativosfy.store > Minha Conta > Notificações.",
              "",
              "Comandos:",
              "/parar — pausar notificações",
              "/voltar — reativar",
            ].join("\n"),
          );
          return Response.json({ ok: true });
        }

        if (lower === "/parar" || lower === "/stop") {
          await supabaseAdmin
            .from("telegram_subscribers")
            .update({ active: false })
            .eq("chat_id", chatId);
          await sendReply(chatId, "🔕 Notificações pausadas. Use /voltar para reativar.");
          return Response.json({ ok: true });
        }

        if (lower === "/voltar" || lower === "/start_again") {
          await supabaseAdmin
            .from("telegram_subscribers")
            .upsert(
              { chat_id: chatId, username, first_name: firstName, active: true },
              { onConflict: "chat_id" },
            );
          await sendReply(chatId, "🔔 Notificações reativadas! Vou te avisar das próximas promoções.");
          return Response.json({ ok: true });
        }

        // Mensagem livre — resposta padrão
        await sendReply(
          chatId,
          "Olá! Sou o bot de promoções do Ativosfy. Use /parar para pausar ou /voltar para reativar avisos.",
        );
        return Response.json({ ok: true });
      },
    },
  },
});

async function sendReply(chatId: number, text: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return;
  try {
    await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
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
  } catch (e: any) {
    console.error("[telegram-webhook] sendReply failed:", e?.message);
  }
}
