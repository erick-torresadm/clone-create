import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fulfillCheckoutOrder } from "@/lib/checkout.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useCart } from "@/lib/use-cart";
import { LogOut, Package, Eye, EyeOff, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/minha-conta")({
  validateSearch: (s: Record<string, unknown>): { checkout?: string; session_id?: string } => ({
    checkout: typeof s.checkout === "string" ? s.checkout : undefined,
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: MinhaConta,
});

function MinhaConta() {
  const { user, loading, signOut } = useAuth();
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const fulfill = useServerFn(fulfillCheckoutOrder);
  const { clear } = useCart();
  const [processingSession, setProcessingSession] = useState(false);
  useEffect(() => { if (!loading && !user) navigate({ to: "/entrar" }); }, [loading, user, navigate]);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: (query) => ((query.state.data as any[] | undefined)?.some((o) => ["pending", "processing", "paid"].includes(o.status) && !o.delivered_data) ? 3000 : false),
  });

  const handledSessions = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user || !session_id) return;
    if (handledSessions.current.has(session_id)) return;
    handledSessions.current.add(session_id);
    let cancelled = false;
    setProcessingSession(true);
    fulfill({ data: { sessionId: session_id, environment: getStripeEnvironment() } })
      .then((res) => {
        if (cancelled) return;
        if (res.status === "paid") {
          clear();
          toast.success("Pagamento confirmado. Entrega processada.");
        }
        refetch();
        // limpa o session_id da URL para não reprocessar em refetches
        navigate({ to: "/minha-conta", replace: true });
      })
      .catch((e: any) => !cancelled && toast.error(e?.message || "Erro ao processar entrega."))
      .finally(() => !cancelled && setProcessingSession(false));
    return () => { cancelled = true; };
  }, [user, session_id, fulfill, clear, refetch, navigate]);

  const backgroundFulfilling = useRef(false);
  useEffect(() => {
    if (!user || session_id || backgroundFulfilling.current) return;
    const pendingSessions = orders
      .filter((o) => ["pending", "paid"].includes(o.status) && o.stripe_session_id && !o.delivered_data)
      .filter((o) => !handledSessions.current.has(o.stripe_session_id))
      .slice(0, 3);
    if (!pendingSessions.length) return;
    backgroundFulfilling.current = true;
    pendingSessions.forEach((o) => handledSessions.current.add(o.stripe_session_id));
    let cancelled = false;
    (async () => {
      for (const order of pendingSessions) {
        if (cancelled) return;
        await fulfill({ data: { sessionId: order.stripe_session_id, environment: getStripeEnvironment() } }).catch(() => null);
      }
      if (!cancelled) await refetch();
    })().finally(() => { backgroundFulfilling.current = false; });
    return () => { cancelled = true; };
  }, [user, session_id, orders, fulfill, refetch]);

  if (!user) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Minha conta</h1>
            <p className="text-sm text-muted-foreground">Olá, {user.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sair</Button>
        </div>

        <h2 className="mt-10 flex items-center gap-2 text-xl font-bold text-foreground"><Package className="h-5 w-5 text-primary" />Meus pedidos</h2>
        {processingSession && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Verificando pagamento... Se você pagou via Pix, pode levar alguns segundos para confirmar.
          </div>
        )}
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
    delivered: "bg-emerald-500/15 text-emerald-600",
    canceled: "bg-red-500/15 text-red-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">#{String(order.id).slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusColor[order.status] ?? "bg-muted text-foreground"}`}>{order.status}</span>
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
              {delivered.map((d: any, i: number) => (
                <div key={i}>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{d.name} {d.error ? "· ⚠ " + d.error : ""}</p>
                  <div className="space-y-1.5">
                    {(d.accounts ?? []).map((a: any, j: number) => {
                      const text = a.full_info ?? a.uid ?? "";
                      return (
                        <div key={j} className="flex items-center gap-2 rounded bg-background p-2 font-mono text-xs text-foreground">
                          <span className="flex-1 break-all">{text || "—"}</span>
                          {text && (
                            <button onClick={() => { navigator.clipboard.writeText(text); toast.success("Copiado"); }} className="text-primary hover:underline">
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
