import { Link } from "@tanstack/react-router";
import { ShoppingCart, User, Shield, BadgeCheck } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { useCart } from "@/lib/use-cart";

export function Header() {
  const { user, isAdmin } = useAuth();
  const { count, openDrawer } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-primary/20 bg-card/80 px-4 sm:px-6 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-lg font-extrabold text-primary-foreground shadow-[0_0_18px_rgba(59,130,246,0.5)]">
            F
          </span>
          <span className="text-xl font-bold text-foreground">Ativosfy</span>
          <BadgeCheck className="h-5 w-5 fill-primary text-primary-foreground" />
        </Link>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden h-10 items-center gap-1.5 rounded-lg bg-secondary px-3 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground sm:flex"
            >
              <Shield className="h-5 w-5" />
              <span className="text-xs font-semibold">Admin</span>
            </Link>
          )}
          <Link
            to={user ? "/minha-conta" : "/entrar"}
            aria-label={user ? "Minha conta" : "Entrar"}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <User className="h-5 w-5" />
            <span className="hidden text-xs font-semibold sm:inline">{user ? "Conta" : "Entrar"}</span>
          </Link>
          <button
            type="button"
            onClick={openDrawer}
            aria-label="Carrinho"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
