import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { checkPaymentStatus } from "@/lib/checkout.functions";
import { LogOut, Package, Eye, EyeOff, Copy, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

const ENV = (import.meta.env.MODE === "production" ? "live" : "sandbox") as "sandbox" | "live";

export const Route = createFileRoute("/minha-conta")({
  component: MinhaConta,
});

function MinhaConta() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const check = useServerFn(checkPaymentStatus);
  useEffect(() => { if (!loading && !user) navigate({ to: "/entrar" }); }, [loading, user, navigate]);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: (query) => ((query.state.data as any[] | undefined)?.some((o) => ["pending", "processing", "paid"].includes(o.status) && !o.delivered_data) ? 4000 : false),
  });

  // Em background, confirma com o Asaas eventuais pedidos pendentes
  const handled = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const pend = orders.filter((o) => o.asaas_payment_id && !o.delivered_data && ["pending", "paid"].includes(o.status) && !handled.current.has(o.asaas_payment_id));
    if (!pend.length) return;
    pend.forEach((o) => handled.current.add(o.asaas_payment_id));
    (async () => {
      for (const o of pend.slice(0, 3)) {
        await check({ data: { paymentId: o.asaas_payment_id, environment: ENV } }).catch(() => null);
      }
      refetch();
    })();
  }, [user, orders, check, refetch]);

  if (!user) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Minha conta</h1>
            <p className="text-sm text-muted-foreground">Olá, {user.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
        </div>

        <h2 className="mt-10 flex items-center gap-2 text-xl font-bold text-foreground"><Package className="h-5 w-5 text-primary" />Meus pedidos</h2>
        <div className="mt-4 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && !orders.length && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
              Você ainda não fez pedidos. <Link to="/produtos" className="text-primary hover:underline">Ver produtos →</Link>
            </div>
          )}
          {orders.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      </div>
    </Layout>
  );
}

function OrderCard({ order }: { order: any }) {
  const [show, setShow] = useState(false);
  const items = Array.isArray(order.items) ? order.items : [];
  const delivered = order.delivered_data;
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-600",
    paid: "bg-blue-500/15 text-blue-600",
    processing: "bg-blue-500/15 text-blue-600",
    delivered: "bg-emerald-500/15 text-emerald-600",
    canceled: "bg-red-500/15 text-red-600",
    refunded: "bg-red-500/15 text-red-600",
  };
  const statusLabel: Record<string, string> = {
    pending: "Aguardando Pix",
    paid: "Pago · processando",
    processing: "Processando",
    delivered: "Entregue",
    canceled: "Cancelado",
    refunded: "Estornado",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{String(order.id).slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusColor[order.status] ?? "bg-muted text-foreground"}`}>
          {statusLabel[order.status] ?? order.status}
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-foreground">
        {items.map((it: any, i: number) => (
          <li key={i} className="flex justify-between">
            <span>{it.name} × {it.quantity ?? 1}</span>
            <span>R$ {Number(it.unitPriceBrl ?? it.price ?? 0).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className="font-bold text-foreground">R$ {Number(order.total).toFixed(2)}</span>
      </div>

      {order.status === "pending" && order.pix_payload && (
        <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Aguardando pagamento Pix
          </p>
          {order.pix_qr_base64 && (
            <div className="mt-3 flex justify-center">
              <img src={`data:image/png;base64,${order.pix_qr_base64}`} alt="Pix QR" className="h-40 w-40 rounded-lg bg-white p-2" />
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 rounded bg-background p-2">
            <code className="flex-1 truncate font-mono text-xs">{order.pix_payload}</code>
            <button onClick={() => { navigator.clipboard.writeText(order.pix_payload); toast.success("Copiado"); }} className="text-primary hover:underline">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {Array.isArray(delivered) && delivered.length > 0 && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">🔓 Dados entregues</p>
            <Button size="sm" variant="ghost" onClick={() => setShow(!show)}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="ml-1">{show ? "Ocultar" : "Mostrar"}</span>
            </Button>
          </div>
          {show && (
            <div className="mt-3 space-y-3">
              {delivered.map((d: any, i: number) => {
                const accountsRaw: any[] = Array.isArray(d.accounts) ? d.accounts : [];
                const lines = accountsRaw
                  .map((a) => (typeof a === "string" ? a : a?.full_info ?? a?.uid ?? ""))
                  .filter((s) => s && String(s).trim().length > 0);
                const downloadTxt = () => {
                  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${(d.name || "contas").replace(/[^\w-]+/g, "_")}-${String(order.id).slice(0, 8)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                };
                return (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {d.name} · {lines.length}/{d.quantity ?? lines.length} {d.error ? "· ⚠ " + d.error : ""}
                      </p>
                      {lines.length > 0 && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={downloadTxt}>
                            <Download className="mr-1 h-3 w-3" /> .txt
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { navigator.clipboard.writeText(lines.join("\n")); toast.success("Tudo copiado"); }}>
                            <Copy className="mr-1 h-3 w-3" /> Copiar tudo
                          </Button>
                        </div>
                      )}
                    </div>
                    {lines.length === 0 ? (
                      <div className="rounded bg-background p-2 text-xs text-muted-foreground">Sem dados.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {lines.map((text, j) => (
                          <div key={j} className="flex items-start gap-2 rounded bg-background p-2 font-mono text-xs text-foreground">
                            <pre className="flex-1 whitespace-pre-wrap break-all font-mono">{text}</pre>
                            <button onClick={() => { navigator.clipboard.writeText(text); toast.success("Copiado"); }} className="text-primary hover:underline">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
