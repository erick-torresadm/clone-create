import { Link } from "@tanstack/react-router";
import { Sparkles, Instagram, Send, Mail, ShieldCheck, Lock, Zap } from "lucide-react";
import { CommunityCTA } from "./CommunityCTA";

export function Footer() {
  return (
    <footer className="relative z-10 mt-20 border-t border-border/60 bg-background/60">
      {/* Faixa de selos de confiança */}
      <div className="border-b border-border/60 bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-6 px-4 py-5 sm:gap-10 sm:px-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Garantia de <b className="text-foreground">7 dias</b></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>Pagamento via <b className="text-foreground">Asaas / PIX</b></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-4 w-4 text-emerald-400" />
            <span>Entrega <b className="text-foreground">automática</b></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Suporte <b className="text-foreground">24/7</b></span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-lg font-extrabold text-foreground">ativos<span className="text-primary">fy</span></span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Contas Facebook, Business Managers e ativos digitais premium —
            entrega automática, garantia de 7 dias e suporte humano todos os dias.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <a
              href="https://instagram.com/ativosfy"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://t.me/ativosfy"
              target="_blank"
              rel="noreferrer"
              aria-label="Telegram"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Send className="h-4 w-4" />
            </a>
            <a
              href="mailto:contato@ativosfy.store"
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
          <h4 className="mb-3 text-sm font-semibold text-foreground">Suporte</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/garantia" className="hover:text-foreground">Garantia & reembolso</Link></li>
            <li><Link to="/dicas" className="hover:text-foreground">Dicas & tutoriais</Link></li>
            <li><Link to="/contato" className="hover:text-foreground">Falar com suporte</Link></li>
            <li><Link to="/entrar" className="hover:text-foreground">Minha conta</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Ativosfy Digital — Em operação desde 2023.</span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-emerald-400" />
            Conexão segura · SSL · LGPD compliant
          </span>
        </div>
      </div>
    </footer>
  );
}
