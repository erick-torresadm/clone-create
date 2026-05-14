import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/lib/use-cart";
import { formatBRL } from "@/lib/site-data";

export function CartDrawer() {
  const { items, subtotal, count, setQty, remove, drawerOpen, closeDrawer } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <div
      className={`fixed inset-0 z-[60] transition ${drawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!drawerOpen}
    >
      {/* backdrop */}
      <div
        onClick={closeDrawer}
        className={`absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity ${
          drawerOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* panel */}
      <aside
        role="dialog"
        aria-label="Carrinho"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Seu carrinho</h2>
            {count > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                {count}
              </span>
            )}
          </div>
          <button
            onClick={closeDrawer}
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-background text-primary">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <p className="mt-4">Seu carrinho está vazio.</p>
              <button
                onClick={() => {
                  closeDrawer();
                  navigate({ to: "/produtos" });
                }}
                className="mt-4 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:border-primary/50"
              >
                Explorar produtos
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary ring-1 ring-border">
                    {it.image ? (
                      <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold text-foreground">{it.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      R$ {formatBRL(it.price)} · un
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-md border border-border">
                        <button
                          onClick={() => setQty(it.id, it.qty - 1)}
                          className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
                          aria-label="Diminuir"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold text-foreground">
                          {it.qty}
                        </span>
                        <button
                          onClick={() => setQty(it.id, it.qty + 1)}
                          className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => remove(it.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    R$ {formatBRL(it.price * it.qty)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-border bg-background/60 px-5 py-4 backdrop-blur">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="text-base font-extrabold text-foreground">R$ {formatBRL(subtotal)}</span>
            </div>
            <button
              onClick={() => {
                closeDrawer();
                navigate({ to: "/checkout" });
              }}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-[0_12px_30px_-10px_rgba(99,140,255,0.8)] transition hover:brightness-110"
            >
              Finalizar compra <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/carrinho"
              onClick={closeDrawer}
              className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Ver carrinho completo
            </Link>
          </footer>
        )}
      </aside>
    </div>
  );
}
