import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/use-cart";
import { useAuth } from "@/lib/use-auth";
import { createCartCheckout, checkPaymentStatus } from "@/lib/checkout.functions";
import { ArrowLeft, Copy, Loader2, ShieldCheck, CheckCircle2, QrCode, Clock, Zap, Lock } from "lucide-react";
import { ScarcityPanel } from "@/components/site/Scarcity";
import { playSuccess } from "@/lib/sound";
import { toast } from "sonner";
import { fbTrack } from "@/lib/meta-pixel";

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
  const [coupon, setCoupon] = useState<{ code: string; type: "percent" | "fixed"; value: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const raw = sessionStorage.getItem("applied_coupon"); if (raw) setCoupon(JSON.parse(raw)); } catch {}
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate({ to: "/entrar", search: { redirect: "/checkout" } as any });
    else if (!items.length && !pix) navigate({ to: "/carrinho" });
  }, [items.length, navigate, user, authLoading, pix]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);
  const discount = useMemo(() => {
    if (!coupon) return 0;
    if (coupon.type === "percent") return (subtotal * coupon.value) / 100;
    return Math.min(coupon.value, subtotal);
  }, [coupon, subtotal]);
  const total = Math.max(0, subtotal - discount);

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
          couponCode: coupon?.code,
        },
      });
      setPix(res);
      fbTrack("InitiateCheckout", {
        value: res.totalBrl,
        currency: "BRL",
        num_items: items.reduce((s, i) => s + i.qty, 0),
        content_ids: items.map((i) => i.id),
      });
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
          try { sessionStorage.removeItem("applied_coupon"); } catch {}
          playSuccess();
          fbTrack("Purchase", {
            value: pix.totalBrl,
            currency: "BRL",
            content_ids: items.map((i) => i.id),
            num_items: items.reduce((s, i) => s + i.qty, 0),
            order_id: pix.orderId,
          });
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
            <div className="mt-6 space-y-4">
              <ScarcityPanel seed={items.map((i) => i.id).join("-") || "checkout"} compact />
              <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
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
            </div>
          )}

          {pix && !paid && (
            <div className="mt-6 space-y-4">
              <ScarcityPanel seed={pix.orderId} compact />

              <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 shadow-[0_20px_60px_-20px_rgba(99,140,255,0.4)]">
                {/* Header strip */}
                <div className="flex items-center justify-between border-b border-border bg-background/40 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">Pix • Pagamento instantâneo</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Pedido #{pix.orderId.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  <PixCountdown expiresAt={pix.expiresAt} />
                </div>

                <div className="grid gap-5 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="mx-auto rounded-2xl bg-white p-3 ring-4 ring-primary/20 sm:mx-0">
                    <img
                      src={`data:image/png;base64,${pix.pixQrBase64}`}
                      alt="QR Code Pix"
                      className="h-52 w-52 object-contain"
                    />
                  </div>

                  <div className="space-y-3">
                    <ol className="space-y-1.5 text-sm text-foreground">
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
                        Abra o app do seu banco
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</span>
                        Escaneie o QR ou cole o código
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">3</span>
                        Confirme — entrega automática
                      </li>
                    </ol>
                    <div className="text-2xl font-extrabold text-primary">R$ {pix.totalBrl.toFixed(2)}</div>
                  </div>
                </div>

                <div className="border-t border-border bg-background/40 p-4">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pix copia e cola</div>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2">
                    <code className="flex-1 truncate font-mono text-xs text-foreground">{pix.pixPayload}</code>
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(pix.pixPayload);
                        toast.success("Código Pix copiado");
                      }}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 border-t border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando pagamento... confirmação automática
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-[11px] text-muted-foreground">
                <div className="rounded-xl border border-border bg-card/60 p-3">
                  <Lock className="mx-auto mb-1 h-4 w-4 text-primary" />
                  Pagamento seguro
                </div>
                <div className="rounded-xl border border-border bg-card/60 p-3">
                  <Zap className="mx-auto mb-1 h-4 w-4 text-primary" />
                  Entrega imediata
                </div>
                <div className="rounded-xl border border-border bg-card/60 p-3">
                  <ShieldCheck className="mx-auto mb-1 h-4 w-4 text-primary" />
                  Garantia total
                </div>
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
          {coupon && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">R$ {subtotal.toFixed(2)}</span>
            </div>
          )}
          {coupon && discount > 0 && (
            <div className="flex items-center justify-between text-xs text-primary">
              <span>Cupom <b>{coupon.code}</b></span>
              <span>- R$ {discount.toFixed(2)}</span>
            </div>
          )}
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

function PixCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, new Date(expiresAt).getTime() - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const expired = ms <= 0;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${expired ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
      <Clock className="h-3.5 w-3.5" />
      {expired ? "Expirado" : `Expira em ${m}:${String(s).padStart(2, "0")}`}
    </span>
  );
}
