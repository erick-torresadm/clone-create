import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSalesDashboard } from "@/lib/admin.functions";
import { TrendingUp, ShoppingBag, Wallet, Megaphone, Globe2, Clock, AlertCircle, Trophy, ArrowUpRight, RefreshCw } from "lucide-react";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export function SalesDashboard() {
  const fetchFn = useServerFn(getSalesDashboard);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "sales-dashboard"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Carregando painel de vendas…
      </div>
    );
  }
  if (!data) return null;

  const totalSiteAds = (data.bySource.site.revenue || 0) + (data.bySource.ads.revenue || 0);
  const sitePct = totalSiteAds ? (data.bySource.site.revenue / totalSiteAds) * 100 : 0;
  const adsPct = totalSiteAds ? (data.bySource.ads.revenue / totalSiteAds) * 100 : 0;
  const maxDay = Math.max(1, ...data.series.map((s) => s.total));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Painel de vendas</h2>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* KPIs principais */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Vendas hoje"
          value={brl(data.today.revenue)}
          sub={`${data.today.count} pedido${data.today.count === 1 ? "" : "s"}`}
          accent="text-emerald-500"
        />
        <KpiCard
          icon={ShoppingBag}
          label="Últimos 7 dias"
          value={brl(data.last7d.revenue)}
          sub={`${data.last7d.count} pedidos · ticket ${brl(data.last7d.count ? data.last7d.revenue / data.last7d.count : 0)}`}
        />
        <KpiCard
          icon={ShoppingBag}
          label="Últimos 30 dias"
          value={brl(data.last30d.revenue)}
          sub={`${data.last30d.count} pedidos · ticket ${brl(data.last30d.count ? data.last30d.revenue / data.last30d.count : 0)}`}
        />
        <KpiCard
          icon={Wallet}
          label="Saldo Asaas"
          value={brl(data.asaas.balance)}
          sub={data.asaas.pendingTransfers.count > 0
            ? `${data.asaas.pendingTransfers.count} saque(s) pendentes · ${brl(data.asaas.pendingTransfers.total)}`
            : "Sem saques pendentes"}
          accent="text-primary"
        />
      </div>

      {/* Site vs Ads + Asaas detalhes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Site vs Anúncios (30d)</h3>
            <span className="text-xs text-muted-foreground">{brl(totalSiteAds)} total</span>
          </div>

          <div className="mt-4 space-y-3">
            <SourceBar
              icon={Globe2}
              label="Site (orgânico/direto)"
              revenue={data.bySource.site.revenue}
              count={data.bySource.site.count}
              pct={sitePct}
              color="bg-emerald-500"
            />
            <SourceBar
              icon={Megaphone}
              label="Anúncios pagos"
              revenue={data.bySource.ads.revenue}
              count={data.bySource.ads.count}
              pct={adsPct}
              color="bg-fuchsia-500"
            />
            {data.bySource.referral.count > 0 && (
              <SourceBar
                icon={ArrowUpRight}
                label="Indicações"
                revenue={data.bySource.referral.revenue}
                count={data.bySource.referral.count}
                pct={totalSiteAds ? (data.bySource.referral.revenue / (totalSiteAds + data.bySource.referral.revenue)) * 100 : 0}
                color="bg-sky-500"
              />
            )}
          </div>

          {totalSiteAds === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Para separar anúncios do tráfego direto, adicione UTMs nos seus links de campanha (ex: <code className="rounded bg-muted px-1">?utm_source=facebook&utm_medium=cpc</code>).
            </p>
          )}

          {/* Gráfico de barras 14d */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Receita diária (14d)</span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />Site</span>
                <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-fuchsia-500" />Anúncios</span>
              </div>
            </div>
            <div className="flex h-32 items-end gap-1">
              {data.series.map((s) => {
                const sitePctH = (s.site / maxDay) * 100;
                const adsPctH = (s.ads / maxDay) * 100;
                return (
                  <div key={s.date} className="group flex flex-1 flex-col items-center gap-1">
                    <div className="relative flex h-full w-full flex-col justify-end overflow-hidden rounded-sm bg-muted/40">
                      <div className="w-full bg-fuchsia-500" style={{ height: `${adsPctH}%` }} />
                      <div className="w-full bg-emerald-500" style={{ height: `${sitePctH}%` }} />
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground shadow group-hover:block">
                        {s.date.slice(5)} · {brl(s.total)} · {s.count}p
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground">{s.date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Asaas + Saques afiliados */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wallet className="h-4 w-4 text-primary" /> Conta Asaas
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <Row label="Saldo disponível" value={brl(data.asaas.balance)} strong />
              <Row label="A receber (próximos repasses)" value={brl(data.asaas.nextPayout)} />
              <Row
                label="Saques solicitados (PIX)"
                value={data.asaas.pendingTransfers.count
                  ? `${data.asaas.pendingTransfers.count} · ${brl(data.asaas.pendingTransfers.total)}`
                  : "—"}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-amber-500" /> Aguardando pagamento
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <Row label="Pedidos pendentes" value={String(data.pending.count)} />
              <Row label="Valor parado" value={brl(data.pending.revenue)} />
            </div>
            {data.pending.recent.length > 0 && (
              <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                {data.pending.recent.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-1">
                    <span className="truncate">{p.email}</span>
                    <span className="font-mono">{brl(Number(p.total))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertCircle className="h-4 w-4 text-destructive" /> Saques de afiliados
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <Row label="Solicitações pendentes" value={String(data.affiliateWithdrawals.count)} />
              <Row label="Total a pagar" value={brl(data.affiliateWithdrawals.total)} strong />
            </div>
          </div>
        </div>
      </div>

      {/* Top produtos */}
      {data.topProducts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-amber-500" /> Top produtos (30d)
          </div>
          <div className="divide-y divide-border">
            {data.topProducts.map((p: any, i: number) => (
              <div key={p.name + i} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="truncate text-foreground">{p.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{p.qty} un.</span>
                  <span className="font-mono font-semibold text-foreground">{brl(p.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, accent,
}: { icon: any; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent || "text-muted-foreground"}`} />
      </div>
      <div className={`mt-2 text-2xl font-extrabold ${accent || "text-foreground"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SourceBar({
  icon: Icon, label, revenue, count, pct, color,
}: { icon: any; label: string; revenue: number; count: number; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </span>
        <span className="font-mono text-muted-foreground">
          {brl(revenue)} · {count}p · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${strong ? "text-base font-bold text-foreground" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
