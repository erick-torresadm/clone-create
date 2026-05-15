import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  Zap,
  CreditCard,
  Star,
  ShoppingCart,
  ChevronRight,
  BadgeCheck,
  Share2,
  Check,
  Flame,
} from "lucide-react";
import { Layout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { ScarcityPanel } from "@/components/site/Scarcity";
import { useCatalog, formatBRL, discount } from "@/lib/site-data";
import { useCart } from "@/lib/use-cart";

export const Route = createFileRoute("/produto/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Produto ${params.id} — Ativosfy` },
      { property: "og:url", content: `/produto/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `/produto/${params.id}` }],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { getProduct, allProducts, isLoading } = useCatalog();
  const product = getProduct(id);
  const { add } = useCart();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-6 py-24 text-center text-muted-foreground">Carregando...</div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-3xl font-bold text-foreground">Produto não encontrado</h1>
          <p className="mt-3 text-muted-foreground">O produto que você procura não existe ou foi removido.</p>
          <Link to="/produtos" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            Ver todos os produtos
          </Link>
        </div>
      </Layout>
    );
  }

  const off = discount(product.oldPrice, product.price);
  const related = allProducts.filter((p) => p.id !== product.id).slice(0, 4);

  const handleAdd = () =>
    add({ id: product.id, name: product.name, price: product.price, image: product.image });
  const handleBuyNow = () => {
    add({ id: product.id, name: product.name, price: product.price, image: product.image });
    navigate({ to: "/carrinho" });
  };

  return (
    <Layout>
      {/* Top promo strip */}
      <div className="border-b border-border/60 bg-primary/10">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-6 py-2 text-xs font-semibold text-primary">
          💸 CUPOM DE BOAS VINDAS: <span className="rounded bg-primary px-2 py-0.5 text-primary-foreground">FDM20</span> 💸
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/produtos" className="hover:text-foreground">Produtos</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        {/* 3-column hero */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr_0.85fr]">
          {/* Image */}
          <div className="glow-card relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary via-card to-background">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                width={800}
                height={800}
                className={`absolute inset-0 h-full w-full object-cover ${typeof product.stock === "number" && product.stock <= 0 ? "grayscale opacity-50" : ""}`}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-sm uppercase tracking-[0.3em] text-muted-foreground/40">
                {product.name.split(" - ")[0]}
              </div>
            )}
            {product.badge && (
              <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
                {product.badge}
              </span>
            )}
          </div>

          {/* Main info + CTA */}
          <div className="rounded-2xl border border-border bg-card/60 p-5">
            <h1 className="text-xl font-extrabold leading-snug tracking-tight text-foreground sm:text-2xl">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {typeof product.stock === "number" && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold uppercase tracking-wider shadow-sm ${
                    product.stock > 0
                      ? "bg-emerald-500 text-white"
                      : "bg-destructive text-destructive-foreground"
                  }`}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/90" />
                  {product.stock > 0 ? `${product.stock} em estoque` : "Esgotado"}
                </span>
              )}
              {product.sold > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1 font-semibold text-foreground">
                  <Flame className="h-3 w-3 text-destructive" /> + {product.sold} vendidos
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-semibold text-primary">
                <Zap className="h-3 w-3" /> Entrega automática
              </span>
            </div>

            <div className="mt-4">
              <ScarcityPanel seed={product.id} compact />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span className="text-sm text-muted-foreground line-through">
                R$ {formatBRL(product.oldPrice)}
              </span>
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                ↓ {off}%
              </span>
            </div>
            <div className="mt-1 text-3xl font-extrabold text-foreground">
              R$ {formatBRL(product.price)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">à vista no Pix</div>

            <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
              {typeof product.stock === "number" && product.stock > 0 && product.stock <= 10 ? (
                <div className="text-center text-xs font-semibold text-destructive">
                  ⚠️ Restam apenas {product.stock} unidades — última chance!
                </div>
              ) : typeof product.stock === "number" && product.stock <= 0 ? (
                <div className="text-center text-xs font-semibold text-destructive">Sem estoque no momento</div>
              ) : (
                <div className="text-center text-xs text-muted-foreground">
                  {typeof product.stock === "number" ? `${product.stock} disponíveis` : "Estoque ilimitado"}
                </div>
              )}
              <button
                onClick={handleBuyNow}
                disabled={typeof product.stock === "number" && product.stock <= 0}
                className="mt-3 h-12 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-[0_10px_30px_-10px_rgba(99,140,255,0.8)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Comprar agora
              </button>
              <button
                onClick={handleAdd}
                disabled={typeof product.stock === "number" && product.stock <= 0}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" /> Adicionar ao carrinho
              </button>
              <button
                aria-label="Compartilhar"
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                <Share2 className="h-3.5 w-3.5" /> Compartilhar produto
              </button>
            </div>
          </div>

          {/* Side trust panels */}
          <div className="flex flex-col gap-4">
            <SidePanel
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Compra Segura"
              text="Sua compra é protegida por criptografia SSL e garantida com criptografia."
            />
            <SidePanel
              icon={<Zap className="h-4 w-4" />}
              title="Entrega automática"
              text="Receba o seu pacote imediatamente após o pagamento."
            />
            <SidePanel
              icon={<CreditCard className="h-4 w-4" />}
              title="Métodos de pagamento"
              text="À vista no Pix"
            >
              <div className="mt-3 flex items-center gap-2">
                <div className="grid h-8 w-12 place-items-center rounded-md border border-border bg-background text-[10px] font-bold text-foreground">
                  PIX
                </div>
              </div>
            </SidePanel>

            {product.rating && (
              <div className="rounded-2xl border border-border bg-card/60 p-5">
                <div className="text-sm font-semibold text-foreground">Avaliações do produto</div>
                <div className="mt-3 flex items-center gap-4">
                  <div>
                    <div className="text-4xl font-extrabold text-foreground">{product.rating}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">de 5</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Baseado em {product.reviews} avaliações
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <section className="mt-10 rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">Descrição</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Produto original e garantido",
              "Suporte dedicado 24/7",
              "Acesso ao painel de gerenciamento",
              "Garantia de reposição",
              "Entrega 100% automática via e-mail",
              "Tutoriais de uso inclusos",
            ].map((b) => (
              <div key={b} className="flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{b}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </div>
        </section>

        {/* Related */}
        <section className="mt-12">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-primary to-primary/30 shadow-[0_0_12px_rgba(99,140,255,0.6)]" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">Você também pode gostar</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function SidePanel({
  icon,
  title,
  text,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}
