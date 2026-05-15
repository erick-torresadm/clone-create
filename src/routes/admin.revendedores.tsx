import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BadgeCheck, Loader2, XCircle, Search, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/revendedores")({ component: AdminResellers });

type Row = {
  user_id: string;
  status: "pending" | "approved" | "rejected";
  whatsapp: string | null;
  telegram: string | null;
  reason: string | null;
  discount_pct: number;
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
};

function AdminResellers() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);

  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");

  const listQ = useQuery({
    queryKey: ["admin-resellers"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const profilesQ = useQuery({
    queryKey: ["admin-resellers-profiles", listQ.data?.map((r) => r.user_id).join(",")],
    enabled: !!listQ.data?.length,
    queryFn: async () => {
      const ids = listQ.data!.map((r) => r.user_id);
      const { data, error } = await supabase
        .from("profiles").select("id,email,display_name").in("id", ids);
      if (error) throw error;
      const map = new Map<string, { email: string | null; display_name: string | null }>();
      (data ?? []).forEach((p: any) => map.set(p.id, { email: p.email, display_name: p.display_name }));
      return map;
    },
  });

  const process = useMutation({
    mutationFn: async ({ userId, approve, note, discountPct }: { userId: string; approve: boolean; note: string; discountPct?: number }) => {
      const { error } = await (supabase as any).rpc("process_reseller", {
        _user_id: userId, _approve: approve, _note: note || null,
        _discount_pct: typeof discountPct === "number" ? discountPct : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-resellers"] }); toast.success("Atualizado"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const setDiscount = useMutation({
    mutationFn: async ({ userId, discountPct }: { userId: string; discountPct: number }) => {
      const { error } = await (supabase as any).rpc("set_reseller_discount", {
        _user_id: userId, _discount_pct: discountPct,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-resellers"] }); toast.success("Desconto atualizado"); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const rows = (listQ.data ?? []).filter((r) => r.status === tab).filter((r) => {
    if (!search.trim()) return true;
    const p = profilesQ.data?.get(r.user_id);
    const hay = `${p?.email ?? ""} ${p?.display_name ?? ""} ${r.whatsapp ?? ""} ${r.telegram ?? ""}`.toLowerCase();
    return hay.includes(search.trim().toLowerCase());
  });

  const counts = {
    pending: (listQ.data ?? []).filter((r) => r.status === "pending").length,
    approved: (listQ.data ?? []).filter((r) => r.status === "approved").length,
    rejected: (listQ.data ?? []).filter((r) => r.status === "rejected").length,
  };

  if (loading || roleLoading) return <Layout><div className="p-12 text-center text-muted-foreground">Carregando...</div></Layout>;
  if (!user || !isAdmin) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">Revendedores</h1>
        <p className="text-sm text-muted-foreground">Aprove ou rejeite pedidos de cadastro como revendedor.</p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <TabBtn active={tab === "pending"} onClick={() => setTab("pending")} icon={Clock} label="Pendentes" count={counts.pending} />
          <TabBtn active={tab === "approved"} onClick={() => setTab("approved")} icon={CheckCircle2} label="Aprovados" count={counts.approved} />
          <TabBtn active={tab === "rejected"} onClick={() => setTab("rejected")} icon={XCircle} label="Rejeitados" count={counts.rejected} />
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {listQ.isLoading && <div className="grid place-items-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {!listQ.isLoading && rows.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">Nenhum pedido aqui.</div>
          )}
          {rows.map((r) => {
            const p = profilesQ.data?.get(r.user_id);
            return <ResellerRow
              key={r.user_id}
              r={r}
              email={p?.email ?? null}
              name={p?.display_name ?? null}
              onProcess={(approve, note, discountPct) => process.mutate({ userId: r.user_id, approve, note, discountPct })}
              onSaveDiscount={(discountPct) => setDiscount.mutate({ userId: r.user_id, discountPct })}
              pending={process.isPending || setDiscount.isPending}
            />;
          })}
        </div>
      </div>
    </Layout>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: any; label: string; count: number }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"}`}>
      <Icon className="h-3.5 w-3.5" /> {label} <span className={`rounded-full px-1.5 ${active ? "bg-white/20" : "bg-muted"}`}>{count}</span>
    </button>
  );
}

function ResellerRow({ r, email, name, onProcess, onSaveDiscount, pending }: { r: Row; email: string | null; name: string | null; onProcess: (approve: boolean, note: string, discountPct?: number) => void; onSaveDiscount: (discountPct: number) => void; pending: boolean }) {
  const [note, setNote] = useState(r.admin_note ?? "");
  const [discount, setDiscount] = useState<string>(String(Number(r.discount_pct ?? 0)));
  const parsedDiscount = Math.max(0, Math.min(90, Number(discount) || 0));
  const dirtyDiscount = parsedDiscount !== Number(r.discount_pct);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-base font-bold text-foreground">{name || email || r.user_id.slice(0, 8)}</div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.status === "approved" ? "bg-emerald-500 text-white" : r.status === "pending" ? "bg-amber-500 text-white" : "bg-destructive text-destructive-foreground"}`}>{r.status}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{email}</div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <Info label="WhatsApp" value={r.whatsapp} />
            <Info label="Telegram" value={r.telegram} />
            <Info label="Desconto atual" value={`${Number(r.discount_pct)}%`} />
            <Info label="Cadastrado em" value={new Date(r.created_at).toLocaleString("pt-BR")} />
          </div>
          {r.reason && (
            <div className="mt-3 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
              <div className="font-bold text-foreground">Motivo</div>
              <div className="mt-1 whitespace-pre-wrap">{r.reason}</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Desconto do revendedor (%)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={90}
            step={1}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <span className="text-sm text-muted-foreground">%</span>
          {r.status === "approved" && dirtyDiscount && (
            <button
              disabled={pending}
              onClick={() => onSaveDiscount(parsedDiscount)}
              className="rounded-lg border border-primary/50 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              Salvar desconto
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Entre 0 e 90. Aplicado nas compras desse revendedor.</p>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nota interna (opcional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: aprovado após contato no WhatsApp" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {r.status !== "approved" && (
          <button disabled={pending} onClick={() => onProcess(true, note, parsedDiscount)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-60">
            <BadgeCheck className="h-4 w-4" /> Aprovar com {parsedDiscount}%
          </button>
        )}
        {r.status !== "rejected" && (
          <button disabled={pending} onClick={() => onProcess(false, note)} className="inline-flex items-center gap-2 rounded-lg border border-destructive/50 px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-60">
            <XCircle className="h-4 w-4" /> Rejeitar
          </button>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-foreground">{value || "—"}</div>
    </div>
  );
}
