import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ShoppingCart, Share2, BadgeCheck, User } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Product = {
  id: string;
  name: string;
  oldPrice: number;
  price: number;
  image?: string;
};

type Section = {
  title: string;
  products: Product[];
};

const SECTIONS: Section[] = [
  {
    title: "Streaming",
    products: [
      { id: "1", name: "TELA - PARAMOUNT", oldPrice: 34.0, price: 12.0 },
      { id: "2", name: "TELA - HBO MAX", oldPrice: 44.0, price: 10.0 },
      { id: "3", name: "IPTV - MENSAL", oldPrice: 99.0, price: 16.9 },
      { id: "4", name: "YouTube Premium - Família", oldPrice: 53.9, price: 8.9 },
      { id: "5", name: "IPTV - TRIMESTRAL", oldPrice: 199.0, price: 39.9 },
      { id: "6", name: "IPTV - SEMESTRAL", oldPrice: 599.0, price: 69.9 },
    ],
  },
  {
    title: "Contas",
    products: [
      { id: "7", name: "Conta Premium - Mensal", oldPrice: 49.9, price: 14.9 },
      { id: "8", name: "Conta Pro - Anual", oldPrice: 299.0, price: 89.9 },
      { id: "9", name: "Pacote Família", oldPrice: 79.9, price: 19.9 },
    ],
  },
];

function formatBRL(v: number) {
  return v.toFixed(2).replace(".", ",");
}

function discount(oldP: number, p: number) {
  return Math.round(((oldP - p) / oldP) * 100);
}

function ProductCard({ product }: { product: Product }) {
  const off = discount(product.oldPrice, product.price);
  return (
    <div className="group relative rounded-2xl border border-border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-[0_0_30px_rgba(99,140,255,0.18)]">
      <button
        aria-label="Compartilhar"
        className="absolute right-5 top-5 z-10 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground backdrop-blur transition hover:text-foreground"
      >
        <Share2 className="h-4 w-4" />
      </button>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-secondary to-background ring-1 ring-border" />
      <div className="px-1 pb-1 pt-4">
        <h3 className="text-base font-semibold tracking-tight text-foreground">{product.name}</h3>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground line-through">R$ {formatBRL(product.oldPrice)}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-lg font-bold text-primary">R$ {formatBRL(product.price)}</span>
          <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
            -{off}%
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            aria-label="Adicionar ao carrinho"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-background text-foreground transition hover:border-primary"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
          <button className="h-10 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(99,140,255,0.7)] transition hover:brightness-110">
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}

function Index() {
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
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,140,255,0.18)_0%,_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />

      <div className="relative z-10">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">Minha Loja</span>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/50">
              <User className="h-4 w-4" /> Entrar
            </button>
            <button
              aria-label="Carrinho"
              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-foreground transition hover:border-primary/50"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-6 pb-20">
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

          <div className="space-y-12">
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
                  {section.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
