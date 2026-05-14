import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { Package, Tag, Bell, Settings, LogOut, Database, HardDrive } from "lucide-react";
import { getPlatformStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const { user, isAdmin, loading, roleLoading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/entrar" });
  }, [loading, user, navigate]);

  if (loading || (user && roleLoading)) return <Layout><div className="p-12 text-center text-muted-foreground">Carregando...</div></Layout>;
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

        <PlatformStats />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.to} to={c.to as any}
              className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/50">
              <c.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-foreground group-hover:text-primary">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 2)} ${units[i]}`;
}

function PlatformStats() {
  const fetchStats = useServerFn(getPlatformStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "platform-stats"],
    queryFn: () => fetchStats(),
    staleTime: 60_000,
  });

  const items = [
    {
      icon: Database,
      label: "Banco de dados",
      used: data?.db.used ?? 0,
      limit: data?.db.limit ?? 0,
    },
    {
      icon: HardDrive,
      label: "Armazenamento de arquivos",
      used: data?.storage.used ?? 0,
      limit: data?.storage.limit ?? 0,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((it) => {
        const pct = it.limit > 0 ? Math.min(100, (it.used / it.limit) * 100) : 0;
        const danger = pct > 85;
        return (
          <div key={it.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <it.icon className="h-4 w-4 text-primary" />
                {it.label}
              </div>
              <span className={`text-xs font-bold ${danger ? "text-destructive" : "text-muted-foreground"}`}>
                {pct.toFixed(1)}%
              </span>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-foreground">
              {isLoading ? "…" : formatBytes(it.used)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                de {formatBytes(it.limit)}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all ${danger ? "bg-destructive" : "bg-gradient-to-r from-primary to-primary/60"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
