import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RefreshCw, ChevronDown, ChevronRight, Download, Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { adminRedeliverOrder } from "@/lib/checkout.functions";

export const Route = createFileRoute("/admin/pedidos")({ component: AdminPedidos });

function AdminPedidos() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);
  if (!user || !isAdmin) return null;

  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders = [] } = useQuery({
    queryKey: ["all-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: any) => { const { error } = await supabase.from("orders").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["all-orders"] }); },
  });

  const redeliverFn = useServerFn(adminRedeliverOrder);
  const redeliver = useMutation({
    mutationFn: async (orderId: string) => await redeliverFn({ data: { orderId } }),
    onSuccess: (res: any) => {
      const errs = (res?.items ?? []).filter((i: any) => i.error);
      if (errs.length) toast.warning(`Reentrega parcial: ${errs.map((e: any) => `${e.name}: ${e.error}`).join(" | ")}`);
      else toast.success("Reentregue com sucesso");
      qc.invalidateQueries({ queryKey: ["all-orders"] });
    },
    onError: (e: any) => toast.error(e?.message || "Falha na reentrega"),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!term) return true;
      return (
        String(o.id).toLowerCase().includes(term) ||
        String(o.email ?? "").toLowerCase().includes(term) ||
        String(o.coupon_code ?? "").toLowerCase().includes(term) ||
        String(o.asaas_payment_id ?? "").toLowerCase().includes(term)
      );
    });
  }, [orders, q, statusFilter]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Pedidos</h1>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por email, id, cupom, payment id..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="all">Todos status</option>
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="processing">processing</option>
            <option value="delivered">delivered</option>
            <option value="canceled">canceled</option>
            <option value="refunded">refunded</option>
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3">Data</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Itens</th>
                <th className="p-3">Total</th>
                <th className="p-3">Entregue</th>
                <th className="p-3">Status</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  onStatus={(status) => setStatus.mutate({ id: o.id, status })}
                  onRedeliver={() => { if (confirm("Reentregar esse pedido? Vai chamar o fornecedor/estoque novamente.")) redeliver.mutate(o.id); }}
                  redelivering={redeliver.isPending}
                />
              ))}
              {!filtered.length && <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">Nenhum pedido.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function OrderRow({ order, onStatus, onRedeliver, redelivering }: { order: any; onStatus: (s: string) => void; onRedeliver: () => void; redelivering: boolean }) {
  const [open, setOpen] = useState(false);
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const delivered: any[] = Array.isArray(order.delivered_data) ? order.delivered_data : [];
  const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
  const deliveredCount = delivered.reduce((s, d) => {
    const accs: any[] = Array.isArray(d.accounts) ? d.accounts : [];
    return s + accs.filter((a) => (typeof a === "string" ? a : a?.full_info ?? a?.uid ?? "").toString().trim().length > 0).length;
  }, 0);
  const hasErr = delivered.some((d) => d.error);
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-700",
    paid: "bg-blue-500/15 text-blue-700",
    processing: "bg-blue-500/15 text-blue-700",
    delivered: "bg-emerald-500/15 text-emerald-700",
    canceled: "bg-red-500/15 text-red-700",
    refunded: "bg-red-500/15 text-red-700",
  };

  return (
    <>
      <tr className="text-foreground hover:bg-muted/20">
        <td className="p-3">
          <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(order.created_at).toLocaleString("pt-BR")}</td>
        <td className="p-3">
          <div className="font-medium">{order.email ?? "—"}</div>
          <div className="font-mono text-[10px] text-muted-foreground">#{String(order.id).slice(0, 8)}</div>
        </td>
        <td className="p-3 text-xs text-muted-foreground">{totalQty} item(s)</td>
        <td className="p-3 font-semibold whitespace-nowrap">R$ {Number(order.total).toFixed(2)}</td>
        <td className="p-3">
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${deliveredCount >= totalQty && !hasErr ? "bg-emerald-500/15 text-emerald-700" : hasErr ? "bg-red-500/15 text-red-700" : "bg-muted text-foreground"}`}>
            {deliveredCount}/{totalQty}{hasErr ? " ⚠" : ""}
          </span>
        </td>
        <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusColor[order.status] ?? "bg-muted text-foreground"}`}>{order.status}</span></td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <select className="rounded-md border border-border bg-background px-2 py-1 text-xs" value={order.status} onChange={(e) => onStatus(e.target.value)}>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="processing">processing</option>
              <option value="delivered">delivered</option>
              <option value="canceled">canceled</option>
              <option value="refunded">refunded</option>
            </select>
            <Button size="sm" variant="outline" disabled={redelivering} onClick={onRedeliver}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Reentregar
            </Button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-muted/10">
          <td></td>
          <td colSpan={7} className="p-4">
            <OrderDetail order={order} />
          </td>
        </tr>
      )}
    </>
  );
}

function OrderDetail({ order }: { order: any }) {
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const delivered: any[] = Array.isArray(order.delivered_data) ? order.delivered_data : [];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-3 text-xs">
        <p className="mb-2 font-semibold text-foreground">Cliente</p>
        <Field label="Email" value={order.email} />
        <Field label="User ID" value={order.user_id} mono />
        <Field label="Order ID" value={order.id} mono />
        <Field label="Criado" value={new Date(order.created_at).toLocaleString("pt-BR")} />
      </div>
      <div className="rounded-lg border border-border bg-card p-3 text-xs">
        <p className="mb-2 font-semibold text-foreground">Pagamento</p>
        <Field label="Subtotal" value={`R$ ${Number(order.subtotal).toFixed(2)}`} />
        <Field label="Desconto" value={`R$ ${Number(order.discount ?? 0).toFixed(2)}`} />
        <Field label="Total" value={`R$ ${Number(order.total).toFixed(2)}`} />
        <Field label="Cupom" value={order.coupon_code ?? "—"} />
        <Field label="Asaas Customer" value={order.asaas_customer_id} mono />
        <Field label="Asaas Payment" value={order.asaas_payment_id} mono />
        <Field label="Stripe Session" value={order.stripe_session_id} mono />
        <Field label="External Order" value={order.external_order_id} mono />
      </div>
      <div className="rounded-lg border border-border bg-card p-3 text-xs">
        <p className="mb-2 font-semibold text-foreground">Itens ({items.length})</p>
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate">{it.name} × {it.quantity ?? 1}</span>
              <span className="text-muted-foreground whitespace-nowrap">R$ {Number(it.unitPriceBrl ?? it.price ?? 0).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="md:col-span-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <p className="mb-3 text-sm font-semibold text-foreground">🔓 Dados entregues</p>
        {delivered.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum dado entregue ainda.</p>
        ) : (
          <div className="space-y-3">
            {delivered.map((d, i) => <DeliveredBlock key={i} item={d} orderId={order.id} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  if (value === null || value === undefined || value === "") return (
    <div className="flex justify-between gap-2 py-0.5"><span className="text-muted-foreground">{label}</span><span className="text-muted-foreground">—</span></div>
  );
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-[10px]" : ""} break-all`}>{String(value)}</span>
    </div>
  );
}

function DeliveredBlock({ item, orderId }: { item: any; orderId: string }) {
  const accountsRaw: any[] = Array.isArray(item.accounts) ? item.accounts : [];
  const lines = accountsRaw
    .map((a) => (typeof a === "string" ? a : a?.full_info ?? a?.uid ?? ""))
    .filter((s) => s && String(s).trim().length > 0);
  const downloadTxt = () => {
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(item.name || "contas").replace(/[^\w-]+/g, "_")}-${String(orderId).slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">
          {item.name} · <span className="text-muted-foreground">{lines.length}/{item.quantity ?? lines.length}</span>
          {item.error && <span className="ml-2 text-red-600">⚠ {item.error}</span>}
        </p>
        {lines.length > 0 && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={downloadTxt}>
              <Download className="mr-1 h-3 w-3" /> .txt
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { navigator.clipboard.writeText(lines.join("\n")); toast.success("Copiado"); }}>
              <Copy className="mr-1 h-3 w-3" /> Copiar
            </Button>
          </div>
        )}
      </div>
      {lines.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem dados.</p>
      ) : (
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/30 p-2 font-mono text-[11px] text-foreground">{lines.join("\n")}</pre>
      )}
    </div>
  );
}
