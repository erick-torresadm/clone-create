import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import {
  ShieldCheck,
  Users,
  Zap,
  Heart,
  Quote,
  Building2,
  Calendar,
  MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Ativosfy" },
      {
        name: "description",
        content:
          "Conheça a Ativosfy: a operação por trás dos perfis Facebook e BMs premium mais confiáveis do mercado.",
      },
      { property: "og:title", content: "Sobre — Ativosfy" },
      { property: "og:description", content: "Quem somos, como operamos e por que confiar." },
      { property: "og:url", content: "/sobre" },
    ],
    links: [{ rel: "canonical", href: "/sobre" }],
  }),
  component: Sobre,
});

function Sobre() {
  const values = [
    { icon: Zap, title: "Agilidade", desc: "Entrega 100% automática — em média 90 segundos após o PIX." },
    { icon: ShieldCheck, title: "Garantia real", desc: "7 dias de garantia de login. Não logou, repomos ou devolvemos." },
    { icon: Users, title: "Comunidade", desc: "Mais de 12 mil operadores e gestores de tráfego ativos." },
    { icon: Heart, title: "Suporte humano", desc: "Resposta em até 5 minutos no horário comercial." },
  ];

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Quem somos
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          A operação por trás dos perfis em que você confia.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          A Ativosfy nasceu em 2023 da frustração de quem trabalha com tráfego pago e
          cansou de fornecedor sumido, perfil queimado e grupo de Telegram que apaga
          contato depois da venda. Começamos atendendo agência por agência no boca-a-boca
          e hoje somos uma operação estruturada, com CNPJ, suporte estruturado e
          processo de reposição automatizado.
        </p>

        {/* Bloco do fundador */}
        <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/40 text-3xl font-extrabold text-primary-foreground">
            A
          </div>
          <div className="flex-1">
            <Quote className="mb-2 h-5 w-5 text-primary/40" />
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              "Eu queria comprar perfil pra rodar minhas campanhas sem precisar rezar pra
              fornecedor responder. Como não existia, montei. Hoje atendemos quem opera
              de verdade — e isso significa entregar rápido, dar suporte humano e honrar
              a garantia mesmo quando dá prejuízo."
            </p>
            <p className="mt-3 text-sm font-bold text-foreground">
              Fundador da Ativosfy
            </p>
            <p className="text-xs text-muted-foreground">São Paulo, Brasil</p>
          </div>
        </div>

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
            { n: "12k+", l: "Operadores ativos" },
            { n: "99,4%", l: "Reposição on-time" },
            { n: "<5min", l: "Resposta no suporte" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-2xl font-extrabold text-primary sm:text-3xl">{s.n}</div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Cartão de empresa */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">Dados da empresa</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Razão social
                </p>
                <p className="text-sm font-semibold text-foreground">Ativosfy Digital</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Em operação desde
                </p>
                <p className="text-sm font-semibold text-foreground">2023</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Falar conosco
                </p>
                <Link to="/contato" className="text-sm font-semibold text-primary hover:underline">
                  Abrir chat de suporte
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            CNPJ pode ser solicitado a qualquer momento via suporte para fins de nota fiscal.
          </p>
        </div>
      </div>
    </Layout>
  );
}
