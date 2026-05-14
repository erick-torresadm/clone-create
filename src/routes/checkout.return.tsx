import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { useCart } from "@/lib/use-cart";
import { fulfillCheckoutOrder } from "@/lib/checkout.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { CheckCircle2, Copy, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: ReturnPage,
});

type DeliveredItem = {
  productId: string;
  name: string;
  quantity: number;
  externalOrderId?: number | string | null;
  accounts?: Array<{ uid?: string; full_info?: string; link_backup?: string | null }>;
  error?: string;
};

function ReturnPage() {
  const { session_id } = Route.useSearch();
  const { clear } = useCart();
  const fulfill = useServerFn(fulfillCheckoutOrder);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DeliveredItem[]>([]);
  const [status, setStatus] = useState<"paid" | "pending" | "error">("pending");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session_id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fulfill({ data: { sessionId: session_id, environment: getStripeEnvironment() } });
        if (cancelled) return;
        setStatus(res.status);
        setItems(res.items as DeliveredItem[]);
        if (res.status === "paid") clear();
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(e?.message || "Erro ao processar entrega.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session_id, fulfill, clear]);

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-6 py-16">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Processando seu pedido…</p>
          </div>
        ) : !session_id ? (
          <p className="text-center text-muted-foreground">Sessão não encontrada.</p>
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="mt-6 text-3xl font-extrabold text-foreground">
                {status === "paid" ? "Pedido confirmado!" : status === "pending" ? "Aguardando confirmação…" : "Algo deu errado"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {status === "paid"
                  ? "Pagamento aprovado. Seus acessos estão abaixo — guarde-os com segurança."
                  : status === "pending"
                  ? "Estamos aguardando a confirmação do pagamento. Atualize a página em instantes."
                  : (errorMsg ?? "Tente novamente ou fale com o suporte.")}
              </p>
            </div>

            {status === "paid" && items.length > 0 && (
              <div className="mt-8 space-y-4">
                {items.map((it, idx) => (
                  <div key={idx} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{it.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          Quantidade: {it.quantity}
                          {it.externalOrderId ? ` · Pedido #${it.externalOrderId}` : ""}
                        </p>
                      </div>
                    </div>

                    {it.error ? (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{it.error}</span>
                      </div>
                    ) : it.accounts && it.accounts.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {it.accounts.map((a, i) => (
                          <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
                            <span className="truncate">{a.full_info ?? a.uid ?? "—"}</span>
                            {(a.full_info ?? a.uid) && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(a.full_info ?? a.uid ?? "");
                                  toast.success("Copiado!");
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent"
                              >
                                <Copy className="h-3 w-3" /> Copiar
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">Entrega registrada. Você receberá os dados por email em breve.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/minha-conta" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110">
                Ver no painel
              </Link>
              <Link to="/produtos" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent">
                Continuar comprando
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
