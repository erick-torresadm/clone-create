import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/use-cart";
import { useAuth } from "@/lib/use-auth";
import { createCartCheckout, checkPaymentStatus } from "@/lib/checkout.functions";
import { supabase } from "@/integrations/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { ArrowLeft, Copy, Loader2, ShieldCheck, CheckCircle2, QrCode, Clock, Zap, Lock, Mail, User as UserIcon, Sparkles, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [creating, setCreating] = useState(false);
  const [pix, setPix] = useState<PixSession | null>(null);
  const [paid, setPaid] = useState(false);
  const [accountCreated, setAccountCreated] = useState<{ email: string; password: string } | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; type: "percent" | "fixed"; value: number } | null>(null);

  function maskCpf(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 14);
    if (d.length <= 11) {
      return d
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return d
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const raw = sessionStorage.getItem("applied_coupon"); if (raw) setCoupon(JSON.parse(raw)); } catch {}
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user?.email) setEmail((e) => e || user.email!);
    if (!items.length && !pix) navigate({ to: "/carrinho" });
  }, [items.length, navigate, user, authLoading, pix]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);
  const discount = useMemo(() => {
    if (!coupon) return 0;
    if (coupon.type === "percent") return (subtotal * coupon.value) / 100;
    return Math.min(coupon.value, subtotal);
  }, [coupon, subtotal]);
  const total = Math.max(0, subtotal - discount);

  function generatePassword() {
    // Senha aleatória forte para evitar bloqueio anti-pwned
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let p = "";
    const arr = new Uint32Array(14);
    crypto.getRandomValues(arr);
    for (let i = 0; i < arr.length; i++) p += chars[arr[i] % chars.length];
    return p + "!9";
  }

  async function ensureAuthenticated(): Promise<{ id: string; email: string } | null> {
    if (user?.id && user.email) return { id: user.id, email: user.email };
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { toast.error("Informe seu e-mail"); return null; }
    // Tenta criar conta automaticamente
    const password = generatePassword();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/minha-conta`,
        data: { display_name: name.trim() || cleanEmail.split("@")[0] },
      },
    });
    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
        toast.error("Este e-mail já tem cadastro. Faça login para continuar.", {
          action: { label: "Entrar", onClick: () => navigate({ to: "/entrar", search: { redirect: "/checkout" } as any }) },
        });
        return null;
      }
      toast.error(translateAuthError(error.message, "Não foi possível criar a conta"));
      return null;
    }
    if (!data.session || !data.user) {
      toast.error("Conta criada, mas não foi possível iniciar a sessão. Faça login.");
      return null;
    }
    setAccountCreated({ email: cleanEmail, password });
    setShowAccount(true);
    return { id: data.user.id, email: cleanEmail };
  }

  async function handleGenerate() {
    if (!name.trim()) return toast.error("Informe seu nome completo");
    if (!user && !email.trim()) return toast.error("Informe seu e-mail");
    setCreating(true);
    try {
      const account = await ensureAuthenticated();
      if (!account) { setCreating(false); return; }
      const res = await checkoutFn({
        data: {
          items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
          customerEmail: account.email,
          customerName: name.trim(),
          cpfCnpj: cpf.replace(/\D/g, "") || undefined,
          userId: account.id,
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

  if (authLoading) return null;

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

              {!user && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-3 text-xs">
                  <span className="text-muted-foreground">Já tem conta?</span>
                  <div className="flex items-center gap-2">
                    <Link
                      to="/entrar"
                      search={{ redirect: "/checkout" } as any}
                      className="rounded-lg px-3 py-1.5 font-semibold text-primary hover:underline"
                    >
                      Entrar
                    </Link>
                    <Link
                      to="/entrar"
                      search={{ redirect: "/checkout", mode: "signup" } as any}
                      className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground hover:bg-secondary"
                    >
                      Cadastrar antes
                    </Link>
                  </div>
                </div>
              )}

              <div className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-foreground">Seus dados</h2>
                    <p className="text-[11px] text-muted-foreground">Leva 30 segundos · entrega imediata após o pagamento</p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    <Lock className="h-3 w-3" /> 100% seguro
                  </span>
                </div>

                {!user && (
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Mail className="h-3 w-3" /> E-mail *
                    </label>
                    <div className="relative">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        autoComplete="email"
                        inputMode="email"
                        className={emailValid ? "pr-9 border-emerald-500/50 focus-visible:ring-emerald-500/30" : ""}
                      />
                      {emailValid && (
                        <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Criamos sua conta automaticamente · seus produtos ficam em <Link to="/minha-conta" className="text-primary hover:underline">Minha conta</Link>.
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <UserIcon className="h-3 w-3" /> Nome completo *
                  </label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome como no documento" autoComplete="name" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    CPF / CNPJ <span className="text-muted-foreground/60 normal-case">(opcional)</span>
                  </label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(maskCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-medium text-muted-foreground">
                  <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/40 p-2">
                    <Zap className="h-3.5 w-3.5 text-primary" /> Entrega na hora
                  </div>
                  <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/40 p-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Garantia total
                  </div>
                  <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/40 p-2">
                    <Lock className="h-3.5 w-3.5 text-primary" /> Pagto. seguro
                  </div>
                </div>

                <Button
                  size="lg"
                  className="h-14 w-full text-base font-bold shadow-[0_10px_30px_-10px_rgba(99,140,255,0.7)] transition hover:brightness-110"
                  onClick={handleGenerate}
                  disabled={creating}
                >
                  {creating ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Gerando Pix...</>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <QrCode className="h-5 w-5" />
                      Gerar Pix · <span className="font-extrabold">R$ {total.toFixed(2)}</span>
                    </span>
                  )}
                </Button>

                <p className="text-center text-[10px] text-muted-foreground">
                  Ao continuar você concorda com a <Link to="/garantia" className="underline hover:text-foreground">garantia</Link>.
                </p>
              </div>
            </div>
          )}

          {pix && !paid && (
            <div className="mt-6 space-y-4">
              {accountCreated && (
                <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                  <button
                    type="button"
                    onClick={() => setShowAccount((s) => !s)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-emerald-500/10"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="font-semibold text-foreground">Conta criada com sucesso</span>
                      <span className="hidden text-[11px] text-muted-foreground sm:inline">— guarde sua senha</span>
                    </div>
                    {showAccount ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {showAccount && (
                    <div className="border-t border-emerald-500/20 bg-background/40 p-4">
                      <p className="mb-3 text-xs text-muted-foreground">
                        Acesse com estes dados em <Link to="/minha-conta" className="text-primary hover:underline">Minha conta</Link>. Você pode trocar a senha a qualquer momento.
                      </p>
                      <div className="grid gap-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">E-mail</span>
                          <code className="truncate font-mono text-foreground">{accountCreated.email}</code>
                        </div>
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Senha</span>
                          <div className="flex items-center gap-1">
                            <code className="font-mono text-foreground">
                              {showPwd ? accountCreated.password : "•".repeat(accountCreated.password.length)}
                            </code>
                            <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => setShowPwd((s) => !s)}>
                              {showPwd ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => { navigator.clipboard.writeText(accountCreated.password); toast.success("Senha copiada"); }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 shadow-[0_20px_60px_-20px_rgba(99,140,255,0.4)]">
                <div className="flex items-center justify-between border-b border-border bg-background/40 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">Pix · Pagamento instantâneo</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Pedido #{pix.orderId.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  <PixCountdown expiresAt={pix.expiresAt} />
                </div>

                {/* Valor em destaque */}
                <div className="flex items-end justify-between gap-3 border-b border-border px-6 py-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor a pagar</div>
                    <div className="text-3xl font-extrabold text-primary">R$ {pix.totalBrl.toFixed(2)}</div>
                  </div>
                  <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
                    <div className="font-bold text-foreground">Confirmação automática</div>
                    em até 30 segundos após o pagamento
                  </div>
                </div>

                {/* COPIA E COLA EM DESTAQUE — primeiro, é como a maioria paga no mobile */}
                <div className="border-b border-border bg-background/40 p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Pix copia e cola
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                      <Sparkles className="h-3 w-3" /> Mais rápido
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-background px-3 py-3 font-mono text-xs text-foreground">
                      {pix.pixPayload}
                    </code>
                    <Button
                      size="lg"
                      className="h-12 shrink-0 font-bold sm:h-auto"
                      onClick={() => {
                        navigator.clipboard.writeText(pix.pixPayload);
                        toast.success("Código Pix copiado");
                      }}
                    >
                      <Copy className="mr-1.5 h-4 w-4" /> Copiar código
                    </Button>
                  </div>
                </div>

                {/* QR Code + Como pagar */}
                <details className="group border-b border-border">
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-semibold text-foreground hover:bg-background/40">
                    <span className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-primary" /> Pagar pelo QR Code
                    </span>
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <div className="grid gap-5 p-5 pt-0 sm:grid-cols-[auto_1fr] sm:items-center">
                    <div className="mx-auto rounded-2xl bg-white p-3 ring-4 ring-primary/20 sm:mx-0">
                      <img
                        src={`data:image/png;base64,${pix.pixQrBase64}`}
                        alt="QR Code Pix"
                        className="h-44 w-44 object-contain"
                      />
                    </div>
                    <ol className="space-y-2 text-sm text-foreground">
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
                        Abra o app do seu banco
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</span>
                        Escolha pagar com Pix → ler QR Code
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">3</span>
                        Confirme — você é redirecionado automaticamente
                      </li>
                    </ol>
                  </div>
                </details>

                <div className="flex items-center justify-center gap-2 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando pagamento... confirmação automática
                </div>
              </div>

              <ScarcityPanel seed={pix.orderId} compact />

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
            <div className="mt-6 flex flex-col items-center rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-10 text-center shadow-[0_20px_60px_-20px_rgba(16,185,129,0.4)]">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/10">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
              <h2 className="mt-5 text-2xl font-extrabold text-foreground sm:text-3xl">Pagamento confirmado!</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Estamos preparando suas contas. Você será redirecionado em instantes para visualizá-las.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecionando para suas contas...
              </div>
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
