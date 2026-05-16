import { Link } from "@tanstack/react-router";
import { Share2, ShoppingCart, BadgeCheck } from "lucide-react";
import { type Product, discount, formatBRL } from "@/lib/products";
import { useCart } from "@/lib/use-cart";
import { useResellerStatus } from "@/lib/reseller";

export function ProductCard({ product }: { product: Product }) {
  const off = discount(product.oldPrice, product.price);
  const { add } = useCart();
  const { data: reseller } = useResellerStatus();
  const isReseller = reseller.isReseller;

  const isCredits = !!product.tags?.includes("creditos-lovable");

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCredits) {
      window.location.href = "/creditos-lovable";
      return;
    }
    add({ id: product.id, name: product.name, price: product.price, image: product.image });
  };

  return (
    <div className="glow-border group relative flex h-full flex-col rounded-xl bg-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_20px_50px_-15px_rgba(59,130,246,0.45)]">
      {isCredits ? (
        <a href="/creditos-lovable" className="relative block" aria-label={`Ver ${product.name}`}>
      ) : (
        <Link to="/produto/$id" params={{ id: product.id }} className="relative block" aria-label={`Ver ${product.name}`}>
      )}
        <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-secondary via-card to-background">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${typeof product.stock === "number" && product.stock <= 0 ? "grayscale opacity-50" : ""}`}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs uppercase tracking-widest text-muted-foreground/40">
              {product.name.split(" - ")[0]}
            </div>
          )}
          {typeof product.stock === "number" && (
            <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-lg ${product.stock > 0 ? "bg-emerald-500 text-white" : "bg-destructive text-destructive-foreground"}`}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/90" />
              {product.stock > 0 ? `${product.stock} em estoque` : "Esgotado"}
            </span>
          )}
          {product.badge && (
            <span className={`absolute left-3 ${typeof product.stock === "number" ? "top-9" : "top-3"} rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg`}>
              {product.badge}
            </span>
          )}
        </div>
      </Link>

      <button
        aria-label="Compartilhar"
        onClick={(e) => e.preventDefault()}
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition hover:bg-primary hover:text-primary-foreground"
      >
        <Share2 className="h-4 w-4" />
      </button>

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <Link
          to="/produto/$id"
          params={{ id: product.id }}
          className="block"
        >
          <h3 className="line-clamp-2 text-[15px] font-bold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-base">
            {product.name}
          </h3>
        </Link>

        {product.tags && product.tags.length > 0 && (
          <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
            {product.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3">
          <span className="text-[11px] text-muted-foreground line-through sm:text-xs">R$ {formatBRL(product.oldPrice)}</span>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className={`text-xl font-extrabold leading-none sm:text-2xl ${isReseller ? "text-emerald-400" : "text-primary"}`}>R$ {formatBRL(product.price)}</span>
            {off > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold sm:px-2 sm:text-xs ${isReseller ? "bg-emerald-500 text-white" : "bg-destructive text-destructive-foreground"}`}>
                -{off}%
              </span>
            )}
            {isReseller && (
              <span className="hidden items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 sm:inline-flex">
                <BadgeCheck className="h-3 w-3" /> Revendedor
              </span>
            )}
          </div>
          {typeof product.stock === "number" && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-destructive"}`} />
              <span className={product.stock > 0 ? "text-emerald-400" : "text-destructive"}>
                {product.stock > 0 ? `${product.stock} em estoque` : "Esgotado"}
              </span>
            </div>
          )}

          <div className="mt-3 flex items-stretch gap-2">
            <button
              onClick={handleAdd}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(59,130,246,0.7)] transition hover:brightness-110 active:scale-[0.98]"
            >
              <ShoppingCart className="h-4 w-4" />
              Comprar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
