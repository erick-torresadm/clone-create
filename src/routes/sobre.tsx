import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ShieldCheck, Users, Zap, Heart } from "lucide-react";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Minha Loja" },
      { name: "description", content: "Conheça a Minha Loja: nossa história, missão e valores." },
      { property: "og:title", content: "Sobre — Minha Loja" },
      { property: "og:description", content: "Nossa história, missão e valores." },
      { property: "og:url", content: "/sobre" },
    ],
    links: [{ rel: "canonical", href: "/sobre" }],
  }),
  component: Sobre,
});

function Sobre() {
  const values = [
    { icon: Zap, title: "Agilidade", desc: "Entregas automáticas em segundos." },
    { icon: ShieldCheck, title: "Confiança", desc: "Garantia total durante toda a assinatura." },
    { icon: Users, title: "Comunidade", desc: "Mais de 50 mil clientes satisfeitos." },
    { icon: Heart, title: "Cuidado", desc: "Suporte humano e atencioso, todos os dias." },
  ];
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Sobre nós
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Tornando o digital acessível para todos.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Somos uma loja especializada em assinaturas digitais e contas premium. Nascemos com o
          objetivo de oferecer acesso a serviços de qualidade pelo menor preço, com entrega
          imediata e suporte humano sempre que você precisar.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {values.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border bg-card p-6">
              <v.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 text-lg font-semibold text-foreground">{v.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 rounded-2xl border border-border bg-card p-6 text-center">
          {[
            { n: "50k+", l: "Clientes" },
            { n: "99,9%", l: "Uptime" },
            { n: "24/7", l: "Suporte" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-2xl font-extrabold text-primary sm:text-3xl">{s.n}</div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
