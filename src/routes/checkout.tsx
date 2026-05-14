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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const checkoutFn = useServerFn(createCartCheckout);
  const [coupon] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/entrar", search: { redirect: "/checkout" } as any });
      return;
    }
    if (!items.length) navigate({ to: "/carrinho" });
  }, [items.length, navigate, user, authLoading]);

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
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/carrinho" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao carrinho
        </Link>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Pagamento</h1>
            <p className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Checkout criptografado · processado pelo Stripe
            </p>
          </div>
          <span className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline">
            Pix instantâneo
          </span>
        </div>

        <div className="relative mt-6">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-xl" aria-hidden />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-white p-1 shadow-2xl shadow-primary/10 ring-1 ring-black/5 dark:bg-zinc-50">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Após o pagamento confirmado, suas contas aparecem automaticamente em <Link to="/minha-conta" className="text-primary hover:underline">Minha conta</Link>.
        </p>
      </div>
    </Layout>
  );
}
