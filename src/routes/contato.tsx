import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { MessageCircle, Clock, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const WHATSAPP_NUMBER = "5511930070320";
const WHATSAPP_MESSAGE = "Olá! Vim pelo site da Ativosfy e gostaria de falar com o suporte.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Ativosfy" },
      { name: "description", content: "Fale com o suporte da Ativosfy direto no WhatsApp. Resposta rápida, 24/7." },
      { property: "og:title", content: "Contato — Ativosfy" },
      { property: "og:description", content: "Fale com o suporte da Ativosfy direto no WhatsApp." },
      { property: "og:url", content: "/contato" },
    ],
    links: [{ rel: "canonical", href: "/contato" }],
  }),
  component: Contato,
});

function Contato() {
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = WHATSAPP_URL;
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <Layout>
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 sm:px-6 py-20 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_20px_50px_-15px_rgba(16,185,129,0.6)]">
          <MessageCircle className="h-9 w-9" />
        </div>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Falar no WhatsApp
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Nosso suporte responde direto no WhatsApp — mais rápido, sem formulário.
          {redirecting && " Você está sendo redirecionado…"}
        </p>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() => setRedirecting(false)}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-4 text-base font-semibold text-white shadow-[0_12px_30px_-10px_rgba(16,185,129,0.8)] transition hover:brightness-110 active:scale-[0.98]"
        >
          <MessageCircle className="h-5 w-5" />
          Abrir conversa no WhatsApp
        </a>

        <p className="mt-3 text-xs text-muted-foreground">
          Se nada acontecer,{" "}
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-primary underline">
            clique aqui
          </a>
          .
        </p>

        <div className="mt-12 grid w-full gap-3 sm:grid-cols-3">
          {[
            { icon: Zap, label: "Resposta em <5min", sub: "horário comercial" },
            { icon: Clock, label: "Atendimento 24/7", sub: "todos os dias" },
            { icon: ShieldCheck, label: "Suporte humano", sub: "sem bot genérico" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-border bg-card p-4 text-left"
            >
              <c.icon className="h-4 w-4 text-emerald-400" />
              <div className="mt-2 text-sm font-semibold text-foreground">{c.label}</div>
              <div className="text-xs text-muted-foreground">{c.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
