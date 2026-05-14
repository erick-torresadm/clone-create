import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Zap, Headphones } from "lucide-react";
import { useMemo, useState } from "react";
import { Layout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { useSettings, useCatalog } from "@/lib/site-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FarmFy — Contas Facebook & BM Premium" },
      { name: "description", content: "Contas Facebook, BMs e ativos digitais premium com entrega automática, garantia e suporte 24/7." },
      { property: "og:title", content: "FarmFy — Contas Facebook & BM Premium" },
      { property: "og:description", content: "Contas Facebook, Business Managers e ativos digitais premium." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const COL_CLASS: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
};

function Index() {
  const { data: s } = useSettings();
  const { sections: SECTIONS, allProducts: ALL_PRODUCTS, isLoading } = useCatalog();
  const showCategories = s?.home_show_categories ?? true;
  const showAll = s?.home_show_all_products ?? true;
  const maxProducts = s?.home_max_products ?? 12;
  const cols = COL_CLASS[s?.home_grid_cols ?? 4] ?? COL_CLASS[4];

  const [active, setActive] = useState<string>("all");

  const visible = useMemo(() => {
    if (active === "all") return SECTIONS;
    return SECTIONS.filter((sec) => sec.title === active);
  }, [active, SECTIONS]);

  const flatLimited = useMemo(() => ALL_PRODUCTS.slice(0, maxProducts), [maxProducts, ALL_PRODUCTS]);

  return (
    <Layout>
      <section className="relative mx-auto w-full max-w-7xl overflow-hidden px-4 pb-12 pt-12 sm:px-6 sm:pt-20 lg:pt-24">
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Farm verificado · entrega automática
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-7xl">
            Contas que <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">performam.</span>
            <br />
            <span className="text-foreground/90">Farm em que você confia.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Perfis BR e USA, Business Managers, redes sociais e ativos digitais — com farm próprio, garantia de reposição e suporte 24/7.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/produtos"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_12px_30px_-10px_rgba(99,140,255,0.8)] transition hover:brightness-110 hover:shadow-[0_18px_40px_-10px_rgba(99,140,255,0.9)]"
            >
              Ver catálogo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/sobre"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition hover:border-primary/50"
            >
              Como funciona
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:mt-16 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Entrega imediata", desc: "Receba seu acesso em segundos após a compra." },
            { icon: ShieldCheck, title: "100% garantido", desc: "Reposição grátis e suporte durante toda a assinatura." },
            { icon: Headphones, title: "Suporte 24/7", desc: "Atendimento humano todos os dias da semana." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catálogo */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-primary to-primary/30 shadow-[0_0_12px_rgba(99,140,255,0.6)]" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Catálogo</h2>
          </div>
          <Link to="/produtos" className="text-sm font-medium text-primary hover:underline">
            Ver todos →
          </Link>
        </div>

        {/* Filtros de categoria */}
        {showCategories && (
          <div className="mb-8 flex flex-wrap gap-2">
            <CategoryChip label="Todas" active={active === "all"} onClick={() => setActive("all")} />
            {SECTIONS.map((sec) => (
              <CategoryChip
                key={sec.title}
                label={sec.title}
                active={active === sec.title}
                onClick={() => setActive(sec.title)}
              />
            ))}
          </div>
        )}

        {/* Grids */}
        {showAll ? (
          <div className="space-y-12">
            {visible.map((section) => (
              <div key={section.title}>
                <div className="mb-5 flex items-center gap-3">
                  <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{section.title}</h3>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {section.products.length}
                  </span>
                  <div className="hidden h-px flex-1 bg-gradient-to-r from-border to-transparent sm:block" />
                </div>
                <div className={`grid gap-5 ${cols}`}>
                  {section.products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid gap-5 ${cols}`}>
            {flatLimited.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        {!isLoading && ALL_PRODUCTS.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Nenhum produto cadastrado ainda.</p>
        )}
      </section>
    </Layout>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-4 py-2 text-xs font-semibold transition " +
        (active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_rgba(99,140,255,0.7)]"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}
