import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { CREDIT_PACKAGES, type CreditPackage } from "@/lib/credits.functions";
import { ScarcityPanel } from "@/components/site/Scarcity";
import { fbTrack } from "@/lib/meta-pixel";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
  Flame,
} from "lucide-react";

export const Route = createFileRoute("/creditos-lovable")({
  head: () => ({
    meta: [
      { title: "Créditos Lovable — Recarga rápida via PIX" },
      {
        name: "description",
        content:
          "Compre créditos para sua conta Lovable. Pagamento via PIX, ativação em minutos.",
      },
      {
        property: "og:title",
        content: "Créditos Lovable — Recarga rápida via PIX",
      },
      {
        property: "og:description",
        content: "Pacotes de 100 a 2.000 créditos Lovable. PIX, entrega rápida.",
      },
    ],
    links: [{ rel: "canonical", href: "/creditos-lovable" }],
  }),
  component: CreditsLanding,
});

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CreditsLanding() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CreditPackage>(CREDIT_PACKAGES[0]);

  function goToCheckout(pkg: CreditPackage) {
    // 🎯 Meta Pixel: AddToCart no clique de comprar
    fbTrack("AddToCart", {
      content_ids: [pkg.id],
      content_name: `${pkg.credits} créditos Lovable`,
      content_type: "product",
      value: pkg.priceBrl,
      currency: "BRL",
      num_items: 1,
    });
    navigate({ to: "/creditos-lovable/checkout", search: { pkg: pkg.id } });
  }

  const sliderIdx = CREDIT_PACKAGES.findIndex((p) => p.id === selected.id);
  const currentPkg = selected;

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]" />
        <div className="mx-auto max-w-4xl px-4 pt-12 pb-6 text-center sm:pt-16">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-pink-500/30">
            <Sparkles className="h-3.5 w-3.5" /> Novidade
          </div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Plano de Recarga
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Créditos entregues{" "}
            <strong className="text-foreground">
              direto no seu workspace Lovable
            </strong>
            , automaticamente, até completar o plano contratado.
          </p>

          {/* Social proof bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-1 font-semibold text-foreground">4.9/5</span>
              <span>· +2.300 clientes</span>
            </div>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <CheckCircle2 className="h-3 w-3" /> Sempre disponível
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-md">
            <ScarcityPanel seed="creditos-lovable-hero" compact />
          </div>
          <p className="mx-auto mt-3 max-w-xs text-[10px] text-muted-foreground">
            Estoque ilimitado · entrega automática 24/7.
          </p>
        </div>
      </section>

      {/* TOTAL + SLIDER */}
      <section className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-3xl border border-border bg-card/60 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Total
              </p>
              <div className="mt-1 bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl">
                {formatBrl(currentPkg.priceBrl)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentPkg.credits.toLocaleString("pt-BR")} créditos
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => goToCheckout(currentPkg)}
              className="group h-14 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-8 text-base font-bold text-white shadow-lg shadow-pink-500/30 hover:from-pink-600 hover:to-orange-600"
            >
              Comprar agora
              <Zap className="ml-2 h-5 w-5 transition group-hover:translate-x-0.5" />
            </Button>
          </div>

          {/* Slider */}
          <div className="mt-10">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Quantos créditos você quer?
            </p>
            <div className="mt-4 text-center">
              <span className="text-6xl font-extrabold text-foreground sm:text-7xl">
                {currentPkg.credits.toLocaleString("pt-BR")}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">
                créditos
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={CREDIT_PACKAGES.length - 1}
              step={1}
              value={sliderIdx < 0 ? 0 : sliderIdx}
              onChange={(e) =>
                setSelected(CREDIT_PACKAGES[Number(e.target.value)])
              }
              className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-pink-500"
            />
            <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {CREDIT_PACKAGES.map((p) => (
                <span key={p.id}>
                  {p.credits >= 1000 ? `${p.credits / 1000}k` : p.credits}
                </span>
              ))}
            </div>
          </div>

          {/* Passos */}
          <ul className="mt-10 space-y-4">
            {[
              {
                icon: ShieldCheck,
                title: "Convide nosso bot",
                desc: "no seu workspace Lovable (em Settings → Members)",
              },
              {
                icon: Sparkles,
                title: "Promova a Owner",
                desc: "e a recarga começa automaticamente",
              },
              {
                icon: Zap,
                title: `${currentPkg.credits.toLocaleString("pt-BR")} créditos entregues`,
                desc: "no mesmo dia, de forma automática",
              },
              {
                icon: Clock,
                title: "Acompanhamento em tempo real",
                desc: "e suporte humano via WhatsApp",
              },
              {
                icon: CheckCircle2,
                title: "Workspace não compatível?",
                desc: "Enviamos um novo workspace já liberado, sem custo extra.",
              },
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 text-pink-400">
                  <s.icon className="h-4.5 w-4.5" />
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-bold text-foreground">{s.title}</span>{" "}
                  {s.desc}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Total
              </p>
              <div className="mt-1 bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-3xl font-extrabold text-transparent">
                {formatBrl(currentPkg.priceBrl)}
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => goToCheckout(currentPkg)}
              className="h-12 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-8 font-bold text-white shadow-lg shadow-pink-500/30 hover:from-pink-600 hover:to-orange-600"
            >
              Comprar agora
            </Button>
          </div>
        </div>
      </section>

      {/* PLANOS SUGERIDOS */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            Planos Sugeridos
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Escolha uma das opções rápidas abaixo ou use o simulador acima.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CREDIT_PACKAGES.map((p) => {
            const isSel = selected.id === p.id;
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border bg-card p-6 transition-all ${
                  isSel
                    ? "border-pink-500/60 shadow-[0_0_40px_-10px_rgba(236,72,153,0.5)]"
                    : "border-border hover:border-pink-500/40"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                    Mais escolhido
                  </span>
                )}
                <h3 className="text-lg font-bold text-foreground">
                  {p.credits.toLocaleString("pt-BR")} Créditos
                </h3>
                <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Investimento
                </p>
                <div className="mt-1 bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-3xl font-extrabold text-transparent">
                  {formatBrl(p.priceBrl)}
                </div>
                <Button
                  onClick={() => {
                    setSelected(p);
                    goToCheckout(p);
                  }}
                  className="mt-5 w-full rounded-full bg-gradient-to-r from-pink-500 to-orange-500 font-bold text-white hover:from-pink-600 hover:to-orange-600"
                >
                  Comprar
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 text-center sm:grid-cols-4">
          {[
            { t: "No seu workspace", d: "Sem mudar de conta" },
            { t: "Entrega automática", d: "Até completar o plano" },
            { t: "Sem renovação", d: "Você decide quando" },
            { t: "Suporte humano", d: "WhatsApp direto" },
          ].map((b, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card/60 p-4"
            >
              <p className="text-sm font-bold text-foreground">{b.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
