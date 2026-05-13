import { Link } from "@tanstack/react-router";
import { ShoppingCart, User, Menu, X, Shield, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { useCart } from "@/lib/use-cart";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/produtos", label: "Produtos" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-[0_6px_20px_-6px_rgba(99,140,255,0.9)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-foreground">
            Blue<span className="text-primary">Prime</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" className="hidden items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/20 sm:flex">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
          {user ? (
            <Link to="/minha-conta" className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/50 sm:flex">
              <User className="h-4 w-4" /> Minha conta
            </Link>
          ) : (
            <Link to="/entrar" className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/50 sm:flex">
              <User className="h-4 w-4" /> Entrar
            </Link>
          )}
          <Link
            to="/carrinho"
            aria-label="Carrinho"
            className="relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-foreground transition hover:border-primary/50"
          >
            <ShoppingCart className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <button
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-foreground md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "text-foreground bg-secondary" }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/entrar"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <User className="h-4 w-4" /> Entrar
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
