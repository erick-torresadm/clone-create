import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ShoppingCart, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Minha Loja" },
      { name: "description", content: "Revise os itens do seu carrinho." },
      { property: "og:title", content: "Carrinho — Minha Loja" },
      { property: "og:url", content: "/carrinho" },
    ],
    links: [{ rel: "canonical", href: "/carrinho" }],
  }),
  component: Carrinho,
});

function Carrinho() {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card text-primary">
          <ShoppingCart className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-foreground">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">Explore o catálogo e adicione produtos para continuar.</p>
        <Link
          to="/produtos"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-10px_rgba(99,140,255,0.8)] transition hover:brightness-110"
        >
          Ver produtos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Layout>
  );
}
