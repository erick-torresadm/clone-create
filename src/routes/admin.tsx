import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { Package, Tag, Bell, Settings, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminHome,
});

function AdminHome() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/entrar" });
  }, [loading, user, navigate]);

  if (loading) return <Layout><div className="p-12 text-center text-muted-foreground">Carregando...</div></Layout>;
  if (!user) return null;
  if (!isAdmin) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-muted-foreground">Sua conta não tem permissão de administrador.</p>
          <button onClick={signOut} className="mt-6 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Sair</button>
        </div>
      </Layout>
    );
  }

  const cards = [
    { to: "/admin/produtos", icon: Package, title: "Produtos & API", desc: "Manuais + importar do fornecedor." },
    { to: "/admin/cupons", icon: Tag, title: "Cupons", desc: "Crie códigos de desconto." },
    { to: "/admin/popups", icon: Bell, title: "Popups & Notícias", desc: "Avisos no site." },
    { to: "/admin/aparencia", icon: Settings, title: "Aparência & Config", desc: "Cores, logo, hero, câmbio." },
    { to: "/admin/pedidos", icon: Package, title: "Pedidos", desc: "Acompanhe e atualize status." },
  ];

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Painel Admin</h1>
            <p className="text-sm text-muted-foreground">Olá, {user.email}</p>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/50">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.to} to={c.to as any}
              className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/50">
              <c.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-foreground group-hover:text-primary">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
          ⚠️ Os módulos completos de CRUD (produtos, cupons, popups, aparência) e o checkout Stripe serão entregues nas próximas mensagens. A base (banco + auth + admin shell) está pronta.
        </div>
      </div>
    </Layout>
  );
}
