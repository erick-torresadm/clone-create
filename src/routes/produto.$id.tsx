import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShieldCheck, Zap, CreditCard, Star, ShoppingCart, ChevronRight, BadgeCheck, Share2 } from "lucide-react";
import { Layout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { ALL_PRODUCTS, discount, formatBRL, getProduct } from "@/lib/products";

export const Route = createFileRoute("/produto/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    return {
      meta: [
        { title: p ? `${p.name} — FDM store` : "Produto — FDM store" },
        { name: "description", content: p?.description?.slice(0, 150) ?? "Produto FDM store" },
        { property: "og:title", content: p?.name ?? "Produto" },
        { property: "og:description", content: p?.description?.slice(0, 150) ?? "" },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `/produto/${p?.id ?? ""}` },
      ],
      links: [{ rel: "canonical", href: `/produto/${p?.id ?? ""}` }],
    };
  },
  notFoundComponent: () => (
    <Layout>
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-bold text-foreground">Produto não encontrado</h1>
        <p className="mt-3 text-muted-foreground">O produto que você procura não existe ou foi removido.</p>
        <Link
          to="/produtos"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Ver todos os produtos
        </Link>
      </div>
    </Layout>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const off = discount(product.oldPrice, product.price);
  const related = ALL_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/produtos" className="hover:text-foreground">Produtos</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-10 md:grid-cols-2">
          {/* Image */}
          <div className="relative">
            <div className="glow-card relative aspect-square w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary via-card to-background ring-1 ring-border">
              <div className="absolute inset-0 grid place-items-center text-sm uppercase tracking-[0.3em] text-muted-foreground/40">
                {product.name.split(" - ")[0]}
              </div>
              <div className="absolute left-4 top-4 flex items-center gap-2">
                <span className="rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
                  -{off}%
                </span>
                {product.sold && product.sold > 500 && (
                  <span className="rounded-full bg-background/70 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
                    🔥 + {product.sold} vendidos
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-medium text-primary">
                <BadgeCheck className="h-3 w-3" /> Entrega automática
              </span>
              {product.rating && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground">
                  <Star className="h-3 w-3 fill-primary text-primary" /> {product.rating} ({product.reviews})
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {product.name}
            </h1>

            <div className="mt-6 flex items-end gap-3">
              <span className="text-sm text-muted-foreground line-through">R$ {formatBRL(product.oldPrice)}</span>
              <span className="text-4xl font-extrabold text-primary">R$ {formatBRL(product.price)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">à vista no Pix</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="h-12 flex-1 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-[0_10px_30px_-10px_rgba(99,140,255,0.8)] transition hover:brightness-110">
                Comprar agora
              </button>
              <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition hover:border-primary">
                <ShoppingCart className="h-4 w-4" /> Adicionar ao carrinho
              </button>
              <button
                aria-label="Compartilhar"
                className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <Trust icon={<ShieldCheck className="h-4 w-4" />} title="Compra segura" sub="SSL + criptografia" />
              <Trust icon={<Zap className="h-4 w-4" />} title="Entrega automática" sub="Imediato após o Pix" />
              <Trust icon={<CreditCard className="h-4 w-4" />} title="Pagamento" sub="Pix à vista" />
            </div>
          </div>
        </div>

        {/* Description */}
        <section className="mt-16">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Descrição</h2>
          <div className="mt-4 whitespace-pre-line rounded-2xl border border-border bg-card/60 p-6 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </div>
        </section>

        {/* Reviews summary */}
        {product.rating && (
          <section className="mt-12 rounded-2xl border border-border bg-card/60 p-8">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Avaliações do produto</h2>
            <div className="mt-4 flex items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-extrabold text-foreground">{product.rating}</div>
                <div className="mt-1 flex items-center justify-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">de 5</div>
              </div>
              <div className="text-sm text-muted-foreground">
                Baseado em <span className="font-semibold text-foreground">{product.reviews}</span> avaliações de clientes verificados.
              </div>
            </div>
          </section>
        )}

        {/* Related */}
        <section className="mt-16">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Você também pode gostar</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Trust({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-semibold text-foreground">{title}</span></div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
