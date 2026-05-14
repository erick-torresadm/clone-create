import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Layout } from "@/components/site/Layout";
import { useCart } from "@/lib/use-cart";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: ReturnPage,
});

function ReturnPage() {
  const { session_id } = Route.useSearch();
  const { clear } = useCart();
  useEffect(() => { if (session_id) clear(); }, [session_id, clear]);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold text-foreground">Pedido confirmado!</h1>
        <p className="mt-2 text-muted-foreground">
          {session_id ? "Recebemos seu pagamento. Em breve você receberá os acessos por email." : "Sessão não encontrada."}
        </p>
        <Link to="/produtos" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:brightness-110">
          Continuar comprando
        </Link>
      </div>
    </Layout>
  );
}
