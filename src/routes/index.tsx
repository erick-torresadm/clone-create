import { createFileRoute } from "@tanstack/react-router";
import { Search, Flame, LayoutGrid, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Index() {
  useSettings();
  const { sections: SECTIONS, allProducts: ALL_PRODUCTS, isLoading } = useCatalog();
  const [query, setQuery] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS
      .map((s) => ({ ...s, products: s.products.filter((p) => p.name.toLowerCase().includes(q)) }))
      .filter((s) => s.products.length > 0);
  }, [query, SECTIONS]);

  const goToSection = (title: string) => {
    setCatOpen(false);
    const el = document.getElementById(`sec-${slugify(title)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Layout>
      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Search + Categories */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div ref={catRef} className="relative">
            <button
              type="button"
              onClick={() => setCatOpen((v) => !v)}
              className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-foreground shadow-[0_0_20px_-8px_rgba(59,130,246,0.6)] hover:bg-primary/15 sm:w-auto"
            >
              <LayoutGrid className="h-4 w-4 text-primary" />
              <span>Categorias</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${catOpen ? "rotate-180" : ""}`} />
            </button>
            {catOpen && (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-auto rounded-xl border border-border bg-popover p-2 shadow-2xl shadow-primary/20 sm:left-auto sm:right-0 sm:w-64 animate-in fade-in slide-in-from-top-2 duration-200">
                {SECTIONS.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Nenhuma categoria.</p>
                )}
                {SECTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => goToSection(s.title)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-primary/15 hover:text-primary"
                  >
                    <span className="truncate">{s.title}</span>
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {s.products.length}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {filteredSections.map((section) => {
            const isPromo = /promo|oferta/i.test(section.title);
            return (
              <SectionBlock key={section.title} section={section} isPromo={isPromo} />
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
