import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { Package, Tag, Bell, Settings, LogOut, Database, HardDrive, Upload, MessageCircle, BadgeCheck, Send, Sparkles, User, ArrowRight } from "lucide-react";
import { getPlatformStats } from "@/lib/admin.functions";
import { SalesDashboard } from "@/components/admin/SalesDashboard";
import { StorageCleanup } from "@/components/admin/StorageCleanup";

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
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
            <div className="flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
            </div>
            <h1 className="mt-5 text-center text-2xl font-extrabold tracking-tight text-foreground">
              Bem-vindo(a), {user.email?.split("@")[0]}!
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Sua conta foi criada com sucesso. Escolha como deseja continuar:
            </p>

            <div className="mt-6 grid gap-3">
              <Link
                to="/revendedor"
                className="group flex items-start gap-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-5 transition hover:border-primary hover:shadow-[0_8px_24px_-8px_rgba(99,140,255,0.5)]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">Quero ser Revendedor</h3>
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Recomendado
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Compre com até 50% OFF, revenda com seu preço e ganhe comissões. Linke sua conta ao sistema.
                  </p>
                </div>
                <ArrowRight className="mt-3 h-5 w-5 text-primary transition group-hover:translate-x-1" />
              </Link>

              <Link
                to="/minha-conta"
                className="group flex items-start gap-4 rounded-xl border border-border bg-muted/30 p-5 transition hover:border-primary/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-card text-foreground">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Ir para Minha Conta</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Veja seus pedidos, indicações, saldo e notificações.
                  </p>
                </div>
                <ArrowRight className="mt-3 h-5 w-5 text-muted-foreground transition group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <button onClick={signOut} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <LogOut className="h-3.5 w-3.5" /> Sair da conta
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const cards = [
    { to: "/admin/produtos", icon: Package, title: "Produtos & API", desc: "Manuais + importar do fornecedor." },
    { to: "/admin/estoque", icon: Upload, title: "Estoque & Upload", desc: "Envie .txt / .zip com perfis para entrega manual." },
    { to: "/admin/cupons", icon: Tag, title: "Cupons", desc: "Crie códigos de desconto." },
    { to: "/admin/popups", icon: Bell, title: "Popups & Notícias", desc: "Avisos no site." },
    { to: "/admin/aparencia", icon: Settings, title: "Aparência & Config", desc: "Cores, logo, hero, câmbio." },
    { to: "/admin/pedidos", icon: Package, title: "Pedidos", desc: "Acompanhe e atualize status." },
    { to: "/admin/saques", icon: HardDrive, title: "Saques de indicação", desc: "Aprove pagamentos PIX dos afiliados." },
    { to: "/admin/suporte", icon: MessageCircle, title: "Suporte ao cliente", desc: "Converse com clientes em tempo real." },
    { to: "/admin/revendedores", icon: BadgeCheck, title: "Revendedores", desc: "Aprove pedidos de cadastro como revendedor." },
    { to: "/admin/telegram", icon: Send, title: "Newsletter Telegram", desc: "Avise inscritos sobre cupons e promoções." },
  ];

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Painel Admin</h1>
            <p className="text-sm text-muted-foreground">Olá, {user.email}</p>
          </div>
          <button onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/50">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>

        <SalesDashboard />

        <div className="mt-6">
          <PlatformStats />
        </div>

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
