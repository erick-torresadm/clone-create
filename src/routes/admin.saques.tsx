import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wallet, Loader2, CheckCircle2, XCircle, Copy, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/saques")({ component: AdminSaques });

type WR = {
  id: string; user_id: string; amount: number; pix_key: string; pix_type: string;
  full_name: string | null; status: string; admin_note: string | null;
  created_at: string; processed_at: string | null;
};

function AdminSaques() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);

  const [filter, setFilter] = useState<"pending" | "paid" | "rejected" | "all">("pending");

  const wrQ = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("withdrawal_requests")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WR[];
    },
    refetchInterval: 30000,
  });

  // Fetch profiles for display
  const profilesQ = useQuery({
    queryKey: ["admin-withdrawals-profiles", wrQ.data?.length],
    enabled: !!wrQ.data?.length,
    queryFn: async () => {
      const ids = Array.from(new Set((wrQ.data ?? []).map((w) => w.user_id)));
      const { data, error } = await supabase.from("profiles").select("id, email, display_name, referral_code").in("id", ids);
      if (error) throw error;
      const map: Record<string, any> = {};
      for (const p of data ?? []) map[(p as any).id] = p;
      return map;
    },
  });

  const stats = useMemo(() => {
    const all = wrQ.data ?? [];
    return {
      pending: all.filter((w) => w.status === "pending").length,
      pendingTotal: all.filter((w) => w.status === "pending").reduce((s, w) => s + Number(w.amount), 0),
      paidTotal: all.filter((w) => w.status === "paid").reduce((s, w) => s + Number(w.amount), 0),
    };
  }, [wrQ.data]);

  const filtered = (wrQ.data ?? []).filter((w) => filter === "all" ? true : w.status === filter);

  const processMut = useMutation({
    mutationFn: async (args: { id: string; approve: boolean; note?: string }) => {
      const { error } = await (supabase as any).rpc("process_withdrawal", {
        _request_id: args.id, _approve: args.approve, _note: args.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.approve ? "Saque marcado como pago" : "Saque rejeitado");
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  if (!user || !isAdmin) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Saques de indicação</h1>
            <p className="mt-1 text-sm text-muted-foreground">Aprove ou rejeite solicitações de saque dos afiliados.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip label={`${stats.pending} pendentes`} tone="amber" />
            <Chip label={`R$ ${stats.pendingTotal.toFixed(2)} a pagar`} tone="amber" />
            <Chip label={`R$ ${stats.paidTotal.toFixed(2)} já pagos`} tone="primary" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-1">
          {([
            { id: "pending", label: "Pendentes" },
            { id: "paid", label: "Pagos" },
            { id: "rejected", label: "Rejeitados" },
            { id: "all", label: "Todos" },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            >{f.label}</button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {wrQ.isLoading && <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {!wrQ.isLoading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              Nenhuma solicitação {filter === "all" ? "" : filter === "pending" ? "pendente" : filter === "paid" ? "paga" : "rejeitada"}.
            </div>
          )}
          {filtered.map((w) => {
            const p = profilesQ.data?.[w.user_id];
            return (
              <div key={w.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-extrabold text-primary">R$ {Number(w.amount).toFixed(2)}</span>
                      <StatusBadge status={w.status} />
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {w.full_name || p?.display_name || "Sem nome"} · {p?.email ?? "—"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Código: <span className="font-mono">{p?.referral_code ?? "—"}</span> ·
                      Solicitado em {new Date(w.created_at).toLocaleString("pt-BR")}
                      {w.processed_at && <> · Processado em {new Date(w.processed_at).toLocaleString("pt-BR")}</>}
                    </div>
                    {w.admin_note && <div className="mt-1 text-xs text-muted-foreground">Nota: {w.admin_note}</div>}
                  </div>
                  {w.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => processMut.mutate({ id: w.id, approve: true })}
                        disabled={processMut.isPending}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />Marcar como pago
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const note = window.prompt("Motivo da rejeição (opcional):") ?? undefined;
                          processMut.mutate({ id: w.id, approve: false, note });
                        }}
                        disabled={processMut.isPending}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" />Rejeitar
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-2 rounded-xl border border-border bg-background/40 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="rounded-md bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase text-primary">{w.pix_type}</span>
                  <code className="truncate font-mono text-sm text-foreground">{w.pix_key}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(w.pix_key); toast.success("Chave copiada"); }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-card"
                  >
                    <Copy className="h-3 w-3" />Copiar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function Chip({ label, tone }: { label: string; tone?: "amber" | "primary" }) {
  const cls = tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
    : tone === "primary" ? "border-primary/30 bg-primary/10 text-primary"
    : "border-border bg-card text-foreground";
  return <div className={`rounded-full border px-3 py-1 font-semibold ${cls}`}>{label}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    pending: { label: "Pendente", cls: "bg-amber-500/15 text-amber-500", icon: Clock },
    paid: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-500", icon: CheckCircle2 },
    rejected: { label: "Rejeitado", cls: "bg-destructive/15 text-destructive", icon: XCircle },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground", icon: Wallet };
  const I = m.icon;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${m.cls}`}><I className="h-3 w-3" />{m.label}</span>;
}
