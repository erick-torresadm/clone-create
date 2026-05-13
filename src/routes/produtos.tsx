import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Layout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { SECTIONS } from "@/lib/products";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Minha Loja" },
      { name: "description", content: "Catálogo completo de assinaturas e contas premium." },
      { property: "og:title", content: "Produtos — Minha Loja" },
      { property: "og:description", content: "Streaming, música e contas premium." },
      { property: "og:url", content: "/produtos" },
    ],
    links: [{ rel: "canonical", href: "/produtos" }],
  }),
  component: Produtos,
});

function Produtos() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      products: s.products.filter((p) => p.name.toLowerCase().includes(q)),
    })).filter((s) => s.products.length > 0);
  }, [query]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Nossos Produtos</h1>
        <p className="mb-6 text-muted-foreground">Escolha o plano ideal para você</p>

        <div className="relative mb-10">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produtos..."
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:max-w-sm"
          />
        </div>

        <div className="space-y-12 pb-10">
          {filtered.map((section) => (
            <section key={section.title}>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-primary to-primary/30 shadow-[0_0_12px_rgba(99,140,255,0.6)]" />
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {section.title}
                </h2>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {section.products.length}
                </span>
                <div className="ml-2 hidden h-px flex-1 bg-gradient-to-r from-border to-transparent sm:block" />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {section.products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
