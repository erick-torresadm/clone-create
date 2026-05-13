import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Minha Loja" },
      { name: "description", content: "Acesse sua conta na Minha Loja." },
      { property: "og:title", content: "Entrar — Minha Loja" },
      { property: "og:url", content: "/entrar" },
    ],
    links: [{ rel: "canonical", href: "/entrar" }],
  }),
  component: Entrar,
});

function Entrar() {
  return (
    <Layout>
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 py-16">
        <div className="w-full rounded-2xl border border-border bg-card p-8">
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="text-xl font-bold text-foreground">Minha Loja</span>
            <BadgeCheck className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-center text-2xl font-bold text-foreground">Bem-vindo de volta</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">Acesse sua conta para continuar</p>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">E-mail</label>
              <input type="email" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Senha</label>
              <input type="password" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgba(99,140,255,0.7)] transition hover:brightness-110">
              Entrar
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/contato" className="font-medium text-primary hover:underline">Fale conosco</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
