import { Link } from "@tanstack/react-router";
import { BadgeCheck, Instagram, Send, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 mt-20 border-t border-border/60 bg-background/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">FDM store</span>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Assinaturas digitais, streaming e contas premium com os melhores preços do mercado.
            Entrega automática e suporte 24/7.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <a
              href="#"
              aria-label="Instagram"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Telegram"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Send className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="E-mail"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Navegação</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Início</Link></li>
            <li><Link to="/produtos" className="hover:text-foreground">Produtos</Link></li>
            <li><Link to="/sobre" className="hover:text-foreground">Sobre</Link></li>
            <li><Link to="/contato" className="hover:text-foreground">Contato</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Conta</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/entrar" className="hover:text-foreground">Entrar</Link></li>
            <li><Link to="/carrinho" className="hover:text-foreground">Carrinho</Link></li>
            <li><a href="#" className="hover:text-foreground">Suporte</a></li>
            <li><a href="#" className="hover:text-foreground">Termos</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Minha Loja. Todos os direitos reservados.</span>
          <span>Feito com cuidado ✦</span>
        </div>
      </div>
    </footer>
  );
}
