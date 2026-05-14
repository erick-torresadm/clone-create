import { createFileRoute } from "@tanstack/react-router";
import { Search, Flame } from "lucide-react";
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

function Index() {
  useSettings();
  const { sections: SECTIONS, allProducts: ALL_PRODUCTS, isLoading } = useCatalog();
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS
      .map((s) => ({ ...s, products: s.products.filter((p) => p.name.toLowerCase().includes(q)) }))
      .filter((s) => s.products.length > 0);
  }, [query, SECTIONS]);



  return (
    <Layout>
      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produtos..."
            className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:max-w-sm"
          />
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {filteredSections.map((section) => {
            const isPromo = /promo|oferta/i.test(section.title);
            return (
              <section
                key={section.title}
                className={
                  isPromo
                    ? "relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-transparent p-5 shadow-[0_0_30px_rgba(234,179,8,0.15)]"
                    : ""
                }
              >
                <div className="mb-5 flex items-center gap-3">
                  {isPromo ? (
                    <Flame className="h-6 w-6 text-yellow-500" />
                  ) : (
                    <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-primary to-primary/40 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                  )}
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                    {section.title}
                  </h2>
                  <span
                    className={
                      isPromo
                        ? "rounded-full border border-yellow-500/40 bg-yellow-500/15 px-2.5 py-0.5 text-xs font-bold uppercase text-yellow-500 animate-pulse"
                        : "rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                    }
                  >
                    {isPromo ? "Oferta limitada" : section.products.length}
                  </span>
                  <div
                    className={`ml-2 hidden h-px flex-1 ${
                      isPromo ? "bg-gradient-to-r from-yellow-500/40 to-transparent" : "bg-gradient-to-r from-border to-transparent"
                    } sm:block`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
                  {section.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {!isLoading && ALL_PRODUCTS.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhum produto cadastrado ainda.
          </p>
        )}
        {!isLoading && ALL_PRODUCTS.length > 0 && filteredSections.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhum produto encontrado para "{query}".
          </p>
        )}
      </main>
    </Layout>
  );
}
