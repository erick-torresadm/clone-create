import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Share2, Wallet, Users, TrendingUp, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/minha-conta/indicacoes")({ component: Indicacoes });

type Commission = { id: string; order_id: string; amount: number; rate: number; order_total: number; status: string; created_at: string };
type Withdrawal = { id: string; amount: number; pix_key: string; pix_type: string; status: string; admin_note: string | null; created_at: string; processed_at: string | null };

function Indicacoes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !user) navigate({ to: "/entrar" }); }, [loading, user, navigate]);

  const profileQ = useQuery({
    queryKey: ["my-profile-ref", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("referral_code, display_name").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const commissionsQ = useQuery({
    queryKey: ["my-commissions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("referral_commissions")
        .select("*").eq("referrer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Commission[];
    },
  });

  const withdrawalsQ = useQuery({
    queryKey: ["my-withdrawals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("withdrawal_requests")
        .select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
  });

  const commissions = commissionsQ.data ?? [];
  const stats = useMemo(() => {
    const available = commissions.filter((c) => c.status === "available").reduce((s, c) => s + Number(c.amount), 0);
    const locked = commissions.filter((c) => c.status === "locked").reduce((s, c) => s + Number(c.amount), 0);
    const paid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0);
    const sales = commissions.filter((c) => c.status !== "canceled").length;
    const rate = sales >= 5 ? 20 : 15;
    return { available, locked, paid, sales, rate, total: available + locked + paid };
  }, [commissions]);

  const refCode = profileQ.data?.referral_code ?? "";
  const refUrl = typeof window !== "undefined" && refCode ? `${window.location.origin}/?ref=${refCode}` : "";

  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState("cpf");
  const [fullName, setFullName] = useState("");

  const requestMut = useMutation({
    mutationFn: async () => {
      const v = parseFloat(amount.replace(",", "."));
      if (!v || v < 20) throw new Error("Mínimo R$ 20,00");
      if (v > stats.available) throw new Error("Saldo insuficiente");
      if (!pixKey.trim()) throw new Error("Informe a chave PIX");
      const { error } = await (supabase as any).rpc("request_withdrawal", {
        _amount: v, _pix_key: pixKey.trim(), _pix_type: pixType, _full_name: fullName.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada! Pagamento em até 48h.");
      setAmount(""); setPixKey(""); setFullName("");
      qc.invalidateQueries({ queryKey: ["my-commissions"] });
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao solicitar saque"),
  });

  if (!user) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link to="/minha-conta" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar para minha conta</Link>
        <div className="mt-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Programa de indicação</h1>
          <p className="mt-1 text-sm text-muted-foreground">Indique a ativosfy e ganhe <b className="text-primary">{stats.rate}%</b> em cada venda. A partir de 5 vendas, sua taxa sobe para <b className="text-primary">20%</b>.</p>
        </div>

        {/* Link de indicação */}
        <div className="mt-6 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">Seu link exclusivo</div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1 truncate rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground">
              {refUrl || "—"}
            </div>
            <Button
              onClick={() => { navigator.clipboard.writeText(refUrl); toast.success("Link copiado!"); }}
              disabled={!refUrl}
            >
              <Copy className="mr-1.5 h-4 w-4" />Copiar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const text = `🚀 Conheça a ativosfy — entrega automática de contas premium. Use meu link: ${refUrl}`;
                if (navigator.share) navigator.share({ title: "ativosfy", text, url: refUrl }).catch(()=>{});
                else { navigator.clipboard.writeText(text); toast.success("Texto copiado!"); }
              }}
              disabled={!refUrl}
            >
              <Share2 className="mr-1.5 h-4 w-4" />Compartilhar
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Quando alguém criar conta pelo seu link e fizer um pedido pago, você recebe a comissão automaticamente.
          </p>
        </div>

        {/* Saldo */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Wallet} label="Saldo disponível" value={`R$ ${stats.available.toFixed(2)}`} highlight />
          <StatCard icon={Clock} label="Em saque (travado)" value={`R$ ${stats.locked.toFixed(2)}`} />
          <StatCard icon={CheckCircle2} label="Já recebido" value={`R$ ${stats.paid.toFixed(2)}`} />
          <StatCard icon={Users} label="Vendas indicadas" value={`${stats.sales}`} sub={`Taxa atual: ${stats.rate}%`} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* Solicitar saque */}
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-foreground">Solicitar saque via PIX</h2>
            <p className="mt-1 text-xs text-muted-foreground">Mínimo R$ 20,00 • Pagamento em até 48h úteis.</p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => { e.preventDefault(); if (!requestMut.isPending) requestMut.mutate(); }}
            >
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor (R$)</label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de chave PIX</label>
                <select
                  value={pixType}
                  onChange={(e) => setPixType(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="cpf">CPF</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Chave aleatória</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chave PIX</label>
                <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Sua chave PIX" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome completo do titular</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como aparece no banco" />
              </div>
              <Button type="submit" className="w-full" disabled={requestMut.isPending || stats.available < 20}>
                {requestMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                Solicitar saque
              </Button>
              {stats.available < 20 && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Você precisa de pelo menos R$ 20,00 disponível para sacar.
                </p>
              )}
            </form>
          </div>

          {/* Histórico */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><Wallet className="h-4 w-4 text-primary" />Histórico de saques</h3>
              <div className="mt-3 space-y-2">
                {(withdrawalsQ.data ?? []).length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nenhum saque ainda.</div>
                )}
                {(withdrawalsQ.data ?? []).map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-bold text-foreground">R$ {Number(w.amount).toFixed(2)}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {w.pix_type.toUpperCase()} · {w.pix_key} · {new Date(w.created_at).toLocaleDateString("pt-BR")}
                      </div>
                      {w.admin_note && <div className="mt-0.5 text-[11px] text-muted-foreground">Nota: {w.admin_note}</div>}
                    </div>
                    <StatusBadge status={w.status} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><TrendingUp className="h-4 w-4 text-primary" />Comissões</h3>
              <div className="mt-3 space-y-2">
                {commissions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nenhuma comissão ainda. Compartilhe seu link!</div>
                )}
                {commissions.slice(0, 20).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-bold text-foreground">+ R$ {Number(c.amount).toFixed(2)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Pedido R$ {Number(c.order_total).toFixed(2)} · {c.rate}% · {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, sub, highlight }: { icon: any; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />{label}
      </div>
      <div className={`mt-1.5 text-2xl font-extrabold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    available: { label: "Disponível", cls: "bg-emerald-500/15 text-emerald-500", icon: CheckCircle2 },
    locked: { label: "Em saque", cls: "bg-amber-500/15 text-amber-500", icon: Clock },
    paid: { label: "Pago", cls: "bg-primary/15 text-primary", icon: CheckCircle2 },
    pending: { label: "Pendente", cls: "bg-amber-500/15 text-amber-500", icon: Clock },
    rejected: { label: "Rejeitado", cls: "bg-destructive/15 text-destructive", icon: XCircle },
    canceled: { label: "Cancelado", cls: "bg-muted text-muted-foreground", icon: XCircle },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground", icon: Clock };
  const I = m.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${m.cls}`}>
      <I className="h-3 w-3" />{m.label}
    </span>
  );
}
