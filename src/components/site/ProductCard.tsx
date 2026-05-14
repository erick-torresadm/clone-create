import { Link } from "@tanstack/react-router";
import { Share2, ShoppingCart } from "lucide-react";
import { type Product, discount, formatBRL } from "@/lib/products";
import { useCart } from "@/lib/use-cart";

export function ProductCard({ product }: { product: Product }) {
  const off = discount(product.oldPrice, product.price);
  const { add } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({ id: product.id, name: product.name, price: product.price, image: product.image });
  };

  return (
    <div className="glow-card group relative rounded-2xl border border-border bg-card p-3 transition-all hover:border-primary/50">
      <button
        aria-label="Compartilhar"
        onClick={(e) => e.preventDefault()}
        className="absolute right-5 top-5 z-10 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground backdrop-blur transition hover:text-foreground"
      >
        <Share2 className="h-4 w-4" />
      </button>
      <Link
        to="/produto/$id"
        params={{ id: product.id }}
        className="block"
        aria-label={`Ver ${product.name}`}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-secondary via-card to-background ring-1 ring-border">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              width={800}
              height={800}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs uppercase tracking-widest text-muted-foreground/40">
              {product.name.split(" - ")[0]}
            </div>
          )}
          {product.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">
              {product.badge}
            </span>
          )}
        </div>
        <div className="px-1 pb-1 pt-4">
          <h3 className="text-base font-semibold tracking-tight text-foreground group-hover:text-primary">{product.name}</h3>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground line-through">R$ {formatBRL(product.oldPrice)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-bold text-primary">R$ {formatBRL(product.price)}</span>
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
              -{off}%
            </span>
          </div>
          {typeof product.stock === "number" && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-destructive"}`} />
              <span className={product.stock > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                {product.stock > 0 ? `${product.stock} em estoque` : "Esgotado"}
              </span>
            </div>
          )}
        </div>
      </Link>
      <div className="mt-2 flex items-center gap-2 px-1 pb-1">
        <button
          onClick={handleAdd}
          aria-label="Adicionar ao carrinho"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-background text-foreground transition hover:border-primary"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
        <button
          onClick={handleAdd}
          className="grid h-10 flex-1 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(99,140,255,0.7)] transition hover:brightness-110"
        >
          Comprar
        </button>
      </div>
    </div>
  );
}
