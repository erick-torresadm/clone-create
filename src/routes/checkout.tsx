import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/use-cart";
import { useAuth } from "@/lib/use-auth";
import { createCartCheckout, checkPaymentStatus } from "@/lib/checkout.functions";
import { ArrowLeft, Copy, Loader2, ShieldCheck, CheckCircle2, QrCode } from "lucide-react";
import { toast } from "sonner";

const ENV = (import.meta.env.MODE === "production" ? "live" : "sandbox") as "sandbox" | "live";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

type PixSession = {
  orderId: string;
  paymentId: string;
  pixPayload: string;
  pixQrBase64: string;
  expiresAt: string;
  totalBrl: number;
};

function CheckoutPage() {
  const { items, clear } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const checkoutFn = useServerFn(createCartCheckout);
  const checkFn = useServerFn(checkPaymentStatus);

  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [creating, setCreating] = useState(false);
  const [pix, setPix] = useState<PixSession | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate({ to: "/entrar", search: { redirect: "/checkout" } as any });
    else if (!items.length && !pix) navigate({ to: "/carrinho" });
  }, [items.length, navigate, user, authLoading, pix]);

  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);

  async function handleGenerate() {
    if (!user?.email || !user?.id) return;
    if (!name.trim()) return toast.error("Informe seu nome completo");
    setCreating(true);
    try {
      const res = await checkoutFn({
        data: {
          items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
          customerEmail: user.email,
          customerName: name.trim(),
          cpfCnpj: cpf.replace(/\D/g, "") || undefined,
          userId: user.id,
          environment: ENV,
        },
      });
      setPix(res);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar Pix");
    } finally {
      setCreating(false);
    }
  }

  // Polling do status do pagamento
  const polling = useRef(false);
  useEffect(() => {
    if (!pix || paid) return;
    let stop = false;
    polling.current = true;
    const tick = async () => {
      try {
        const r = await checkFn({ data: { paymentId: pix.paymentId, environment: ENV } });
        if (stop) return;
        if (r.paid) {
          setPaid(true);
          clear();
          toast.success("Pagamento confirmado!");
          setTimeout(() => navigate({ to: "/minha-conta" }), 1200);
          return;
        }
      } catch { /* keep polling */ }
      if (!stop) setTimeout(tick, 4000);
    };
    tick();
    return () => { stop = true; polling.current = false; };
  }, [pix, paid, checkFn, clear, navigate]);

  if (authLoading || !user) return null;

  return (
    <Layout>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Link to="/carrinho" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao carrinho
          </Link>
          <div className="mt-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Pagamento via Pix</h1>
            <p className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Processado por Asaas · ambiente {ENV}
            </p>
          </div>

          {!pix && (
            <div className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-6">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome completo *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como aparece no seu CPF" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPF / CNPJ <span className="text-muted-foreground/60">(opcional)</span></label>
                <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
              </div>
              <Button size="lg" className="w-full" onClick={handleGenerate} disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                Gerar QR Code Pix · R$ {total.toFixed(2)}
              </Button>
            </div>
          )}

          {pix && !paid && (
            <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-2xl bg-white p-4 ring-4 ring-primary/20">
                  <img
                    src={`data:image/png;base64,${pix.pixQrBase64}`}
                    alt="QR Code Pix"
                    className="h-64 w-64 object-contain"
                  />
                </div>
                <p className="mt-4 text-sm text-muted-foreground">Abra o app do seu banco e escaneie o QR Code</p>
                <p className="text-xs text-muted-foreground/80">ou use o copia-e-cola abaixo</p>
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 p-2">
                  <code className="flex-1 truncate font-mono text-xs text-foreground">{pix.pixPayload}</code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(pix.pixPayload);
                      toast.success("Código Pix copiado");
                    }}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
                  </Button>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Aguardando pagamento... a confirmação é automática.
              </div>
            </div>
          )}

          {paid && (
            <div className="mt-6 flex flex-col items-center rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              <h2 className="mt-4 text-2xl font-bold text-foreground">Pagamento confirmado!</h2>
              <p className="mt-2 text-sm text-muted-foreground">Redirecionando para suas contas...</p>
            </div>
          )}
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
            <span className="text-xl font-extrabold text-primary">R$ {(pix?.totalBrl ?? total).toFixed(2)}</span>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Após o pagamento, suas contas aparecem em <Link to="/minha-conta" className="text-primary hover:underline">Minha conta</Link>.
          </p>
        </aside>
      </div>
    </Layout>
  );
}
