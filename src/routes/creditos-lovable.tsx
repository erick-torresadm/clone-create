import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { CREDIT_PACKAGES, type CreditPackage } from "@/lib/credits.functions";
import { ScarcityPanel } from "@/components/site/Scarcity";
import { fbTrack } from "@/lib/meta-pixel";
import { initCreditsPixel, fbCreditsTrack } from "@/lib/meta-pixel-credits";
import {
  Sparkles,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Star,
  Gift,
  Infinity as InfinityIcon,
  Calendar,
  Lock,
  Send,
} from "lucide-react";

export const Route = createFileRoute("/creditos-lovable")({
  head: () => ({
    meta: [
      { title: "Plano Pro Lite Lovable (1 ano) — 300 créditos via voucher" },
      {
        name: "description",
        content:
          "Plano Pro Lite Lovable de 1 ano com 300 créditos entregues instantaneamente por link de voucher. Pagamento via PIX.",
      },
      {
        property: "og:title",
        content: "Plano Pro Lite Lovable (1 ano) — de R$99 por R$69,90",
      },
      {
        property: "og:description",
        content:
          "300 créditos + até 1.800 créditos bônus em 12 meses. Voucher resgatável em sua conta Lovable. PIX, entrega imediata.",
      },
    ],
    links: [{ rel: "canonical", href: "/creditos-lovable" }],
  }),
  component: ProLiteLanding,
});

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PKG: CreditPackage = CREDIT_PACKAGES[0];
const OLD_PRICE = 99;

function ProLiteLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    initCreditsPixel();
    fbCreditsTrack("ViewContent", {
      content_ids: [PKG.id],
      content_name: "Landing Plano Pro Lite Lovable 1 ano",
      content_type: "product",
      value: PKG.priceBrl,
      currency: "BRL",
    });
  }, []);

  function goToCheckout() {
    const payload = {
      content_ids: [PKG.id],
      content_name: PKG.name,
      content_type: "product",
      value: PKG.priceBrl,
      currency: "BRL",
      num_items: 1,
    };
    fbTrack("AddToCart", payload);
    fbCreditsTrack("AddToCart", payload);
    navigate({ to: "/creditos-lovable/checkout", search: { pkg: PKG.id } });
  }

  const discountPct = Math.round(((OLD_PRICE - PKG.priceBrl) / OLD_PRICE) * 100);

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]" />
        <div className="mx-auto max-w-4xl px-4 pt-12 pb-6 text-center sm:pt-16">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-pink-500/30">
            <Sparkles className="h-3.5 w-3.5" /> Oferta -{discountPct}%
          </div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Plano Pro Lite de 1 ano
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            <strong className="text-foreground">300 créditos</strong> adicionados
            instantaneamente por meio de um{" "}
            <strong className="text-foreground">link de voucher resgatável</strong>{" "}
            direto na sua conta Lovable.
          </p>

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
              <CheckCircle2 className="h-3 w-3" /> Entrega imediata
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-md">
            <ScarcityPanel seed="prolite-hero" compact />
          </div>
        </div>
      </section>

      {/* CARD DE OFERTA */}
      <section className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-3xl border border-border bg-card/60 p-6 shadow-2xl backdrop-blur sm:p-10">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Oferta por tempo limitado
            </p>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-semibold text-muted-foreground line-through">
                {formatBrl(OLD_PRICE)}
              </span>
              <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 bg-clip-text text-6xl font-extrabold text-transparent sm:text-7xl">
                {formatBrl(PKG.priceBrl)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              À vista no PIX · 300 créditos entregues via voucher
            </p>
            <Button
              size="lg"
              onClick={goToCheckout}
              className="group mt-4 h-14 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-10 text-base font-bold text-white shadow-lg shadow-pink-500/30 hover:from-pink-600 hover:to-orange-600"
            >
              Comprar agora
              <Zap className="ml-2 h-5 w-5 transition group-hover:translate-x-0.5" />
            </Button>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Link de resgate enviado imediatamente após a confirmação do pagamento.
            </p>
          </div>

          {/* Recursos */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: InfinityIcon,
                title: "Projetos ilimitados",
                desc: "Crie e gerencie projetos sem restrições.",
              },
              {
                icon: Lock,
                title: "Uso privado",
                desc: "Funciona diretamente na sua conta pessoal.",
              },
              {
                icon: Calendar,
                title: "Validade de 1 ano",
                desc: "Use seus créditos quando quiser, dentro de 12 meses.",
              },
              {
                icon: Send,
                title: "Entrega instantânea",
                desc: "Link de resgate liberado após o pagamento.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-border bg-background/40 p-4"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 text-pink-400">
                  <f.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{f.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Aviso importante */}
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Este plano é igual ao <strong>Pro normal</strong>, com a única
            diferença de que você <strong>não recebe</strong> os 100 créditos
            acumulados mensalmente do Pro.
          </div>
        </div>
      </section>

      {/* BÔNUS DIÁRIO */}
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-3xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-orange-500/10 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-400" />
            <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
              Bônus diário incluso
            </h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <strong className="text-foreground">5 créditos bônus por dia</strong>{" "}
                em cada workspace.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                Até <strong className="text-foreground">150 créditos bônus/mês</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                Até{" "}
                <strong className="text-foreground">
                  1.800 créditos bônus em 12 meses
                </strong>
                .
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="text-center text-2xl font-extrabold text-foreground sm:text-3xl">
          Como funciona
        </h2>
        <ol className="mt-6 space-y-3">
          {[
            "Compre um novo link de resgate.",
            "Crie um novo workspace na sua conta Lovable.",
            "Resgate o link no novo workspace.",
            "Transfira seus projetos para o novo workspace, se necessário.",
          ].map((step, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-sm font-bold text-white">
                {i + 1}
              </span>
              <p className="text-sm text-muted-foreground">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Tudo continua funcionando corretamente após a transferência. Você pode
          usar <strong className="text-foreground">vários vouchers</strong> na
          mesma conta a qualquer momento.
        </p>
      </section>

      {/* GARANTIAS */}
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Vouchers legítimos",
              desc: "Você recebe links oficiais, resgatados na sua conta.",
            },
            {
              icon: Lock,
              title: "Workspace pessoal",
              desc: "Nada é compartilhado. Você tem total controle.",
            },
            {
              icon: Zap,
              title: "Pagamento via PIX",
              desc: "Confirmação em segundos, entrega imediata.",
            },
          ].map((b, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card/60 p-5 text-center"
            >
              <b.icon className="mx-auto h-6 w-6 text-pink-400" />
              <p className="mt-2 text-sm font-bold text-foreground">{b.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            onClick={goToCheckout}
            className="h-14 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-10 text-base font-bold text-white shadow-lg shadow-pink-500/30 hover:from-pink-600 hover:to-orange-600"
          >
            Quero meu Pro Lite por {formatBrl(PKG.priceBrl)}
            <Zap className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </Layout>
  );
}
