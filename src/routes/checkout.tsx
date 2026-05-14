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
        if (!user?.email || !user?.id) throw new Error("Entre na sua conta para finalizar a compra.");
        const cs = await checkoutFn({
          data: {
            items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
            couponCode: coupon,
            customerEmail: user.email,
            userId: user.id,
            returnUrl: `${window.location.origin}/minha-conta?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
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

  if (authLoading || !user || !items.length) return null;

  return (
    <Layout>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Link to="/carrinho" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao carrinho
          </Link>
          <div className="mt-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Finalizar pagamento</h1>
            <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Checkout criptografado · processado pelo Stripe
            </p>
          </div>

          <div className="relative mt-6">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/40 via-primary/10 to-transparent blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card to-background p-2 shadow-2xl ring-1 ring-primary/10">
              <div className="rounded-2xl bg-white p-1 dark:bg-zinc-50">
                <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            </div>
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card/80 p-5 backdrop-blur lg:sticky lg:top-24">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Resumo do pedido</h2>
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-2.5">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary ring-1 ring-border">
                  {it.image ? <img src={it.image} alt={it.name} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-semibold text-foreground">{it.name}</div>
                  <div className="text-xs text-muted-foreground">Qtd: {it.qty}</div>
                </div>
                <div className="text-sm font-bold text-foreground">R$ {(it.price * it.qty).toFixed(2)}</div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-4 text-base">
            <span className="font-semibold text-foreground">Total</span>
            <span className="text-xl font-extrabold text-primary">
              R$ {items.reduce((s, i) => s + i.qty * i.price, 0).toFixed(2)}
            </span>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Após o pagamento, suas contas aparecem em <Link to="/minha-conta" className="text-primary hover:underline">Minha conta</Link>.
          </p>
          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Stripe · PCI DSS Nível 1
          </div>
        </aside>
      </div>
    </Layout>
  );
}
