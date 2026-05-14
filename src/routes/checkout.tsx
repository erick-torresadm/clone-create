import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { useCart } from "@/lib/use-cart";
import { useAuth } from "@/lib/use-auth";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCartCheckout } from "@/lib/checkout.functions";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const checkoutFn = useServerFn(createCartCheckout);
  const [coupon] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!items.length) navigate({ to: "/carrinho" });
  }, [items.length, navigate]);

  const fetchClientSecret = useMemo(() => {
    return async (): Promise<string> => {
      try {
        const cs = await checkoutFn({
          data: {
            items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
            couponCode: coupon,
            customerEmail: user?.email || undefined,
            userId: user?.id,
            returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
            environment: getStripeEnvironment(),
          },
        });
        if (!cs) throw new Error("Sessão sem client_secret");
        return cs;
      } catch (e: any) {
        toast.error(e.message || "Erro ao iniciar pagamento");
        throw e;
      }
    };
  }, [items, user, coupon, checkoutFn]);

  if (!items.length) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link to="/carrinho" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao carrinho
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl">Pagamento</h1>
        <p className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Checkout seguro processado pelo Stripe
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </Layout>
  );
}
