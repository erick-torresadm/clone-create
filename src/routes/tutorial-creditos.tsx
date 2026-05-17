import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { CREDIT_PACKAGES, type CreditPackage } from "@/lib/credits.functions";
import { Sparkles, Zap, FlaskConical } from "lucide-react";

export const Route = createFileRoute("/tutorial-creditos")({
  head: () => ({
    meta: [
      { title: "Tutorial — Créditos Lovable (Sandbox)" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TutorialLanding,
});

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function TutorialLanding() {
  const navigate = useNavigate();
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const [selected, setSelected] = useState<CreditPackage>(CREDIT_PACKAGES[0]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/entrar" });
  }, [loading, user, navigate]);

  if (loading || (user && roleLoading)) {
    return <Layout><div className="p-12 text-center text-muted-foreground">Carregando…</div></Layout>;
  }
  if (!user) return null;
  if (!isAdmin) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta página é apenas para administradores.</p>
        </div>
      </Layout>
    );
  }

  function goToCheckout(pkg: CreditPackage) {
    navigate({ to: "/tutorial-creditos/checkout", search: { pkg: pkg.id } });
  }

  const sliderIdx = CREDIT_PACKAGES.findIndex((p) => p.id === selected.id);

  return (
    <Layout>
      <div className="w-full border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm font-semibold text-amber-300">
        <FlaskConical className="mr-1 inline h-4 w-4" />
        MODO TUTORIAL — Pagamentos em Sandbox (Asaas). Nenhum valor real será cobrado.
      </div>

      <section className="mx-auto max-w-4xl px-4 pt-10 pb-6 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-3 py-1 text-xs font-bold text-white">
          <Sparkles className="h-3.5 w-3.5" /> Demo
        </div>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Tutorial — Créditos Lovable
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
          Mesma experiência do fluxo de compra, mas usando o ambiente de teste do Asaas para gravar o vídeo.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Página oficial: <Link to="/creditos-lovable" className="underline">/creditos-lovable</Link>
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-3xl border border-border bg-card/60 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
              <div className="mt-1 bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl">
                {formatBrl(selected.priceBrl)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected.credits.toLocaleString("pt-BR")} créditos
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => goToCheckout(selected)}
              className="h-14 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-8 text-base font-bold text-white shadow-lg shadow-pink-500/30"
            >
              Comprar (sandbox) <Zap className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="mt-10">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Quantos créditos?
            </p>
            <div className="mt-4 text-center">
              <span className="text-6xl font-extrabold text-foreground sm:text-7xl">
                {selected.credits.toLocaleString("pt-BR")}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={CREDIT_PACKAGES.length - 1}
              step={1}
              value={sliderIdx < 0 ? 0 : sliderIdx}
              onChange={(e) => setSelected(CREDIT_PACKAGES[Number(e.target.value)])}
              className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-pink-500"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CREDIT_PACKAGES.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold text-foreground">
                {p.credits.toLocaleString("pt-BR")} Créditos
              </h3>
              <div className="mt-3 bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-3xl font-extrabold text-transparent">
                {formatBrl(p.priceBrl)}
              </div>
              <Button
                onClick={() => goToCheckout(p)}
                className="mt-5 w-full rounded-full bg-gradient-to-r from-pink-500 to-orange-500 font-bold text-white"
              >
                Comprar (sandbox)
              </Button>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
