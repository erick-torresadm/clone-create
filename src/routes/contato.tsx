import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Mail, MessageCircle, Send } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Minha Loja" },
      { name: "description", content: "Fale com nosso suporte. Estamos disponíveis 24/7." },
      { property: "og:title", content: "Contato — Minha Loja" },
      { property: "og:description", content: "Fale com nosso suporte 24/7." },
      { property: "og:url", content: "/contato" },
    ],
    links: [{ rel: "canonical", href: "/contato" }],
  }),
  component: Contato,
});

function Contato() {
  const [sent, setSent] = useState(false);
  return (
    <Layout>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Vamos conversar.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Tire dúvidas, peça suporte ou envie sugestões. Respondemos em até 1 hora em horário
            comercial.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: Mail, label: "E-mail", value: "contato@minhaloja.com" },
              { icon: MessageCircle, label: "WhatsApp", value: "+55 (00) 00000-0000" },
              { icon: Send, label: "Telegram", value: "@minhaloja" },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className="font-medium text-foreground">{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="text-xl font-semibold text-foreground">Envie uma mensagem</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Nome</label>
              <input required className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">E-mail</label>
              <input type="email" required className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Mensagem</label>
              <textarea required rows={5} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(99,140,255,0.7)] transition hover:brightness-110">
              Enviar mensagem
            </button>
            {sent && <p className="text-center text-sm text-primary">Mensagem enviada! Em breve retornamos.</p>}
          </div>
        </form>
      </div>
    </Layout>
  );
}
