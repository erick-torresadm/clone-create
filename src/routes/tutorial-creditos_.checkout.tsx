import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CREDIT_PACKAGES,
  createCreditCheckout,
  checkCreditPayment,
  type CreditPackage,
} from "@/lib/credits.functions";
import { CreditProgressCard } from "@/components/site/CreditProgressCard";
import { PostPurchaseHelp } from "@/components/site/PostPurchaseHelp";
import { TutorialVideo } from "@/components/site/TutorialVideo";
import { ScarcityPanel } from "@/components/site/Scarcity";
import { useAuth } from "@/lib/use-auth";
import { fbTrack } from "@/lib/meta-pixel";
import {
  initCreditsPixel,
  fbCreditsTrack,
  creditsPurchaseEventId,
} from "@/lib/meta-pixel-credits";
import {
  Copy,
  CheckCircle2,
  Loader2,
  Clock,
  ShieldCheck,
  ArrowLeft,
  QrCode,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const ENV = "sandbox" as "sandbox" | "live";
const SUPPORT_EMAIL = "er.ic.klo.vabl.ecredits@gmail.com";
const LS_KEY = "credits-active-purchase";

type CheckoutSearch = { pkg?: string; purchase?: string };

export const Route = createFileRoute("/tutorial-creditos_/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    pkg: typeof search.pkg === "string" ? search.pkg : undefined,
    purchase: typeof search.purchase === "string" ? search.purchase : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tutorial Checkout — Sandbox" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CheckoutPage,
});

type PixSession = {
  purchaseId: string;
  paymentId: string;
  pixPayload: string;
  pixQrBase64: string;
  expiresAt: string;
  totalBrl: number;
};

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { pkg, purchase } = Route.useSearch();
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const createFn = useServerFn(createCreditCheckout);
  const checkFn = useServerFn(checkCreditPayment);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/entrar" });
  }, [loading, user, navigate]);

  const selected: CreditPackage | undefined =
    CREDIT_PACKAGES.find((p) => p.id === pkg) ?? CREDIT_PACKAGES[0];

  const [buyerEmail, setBuyerEmail] = useState("");
  const [lovableEmail, setLovableEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [creating, setCreating] = useState(false);
  const [pix, setPix] = useState<PixSession | null>(null);
  const [paid, setPaid] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [recent, setRecent] = useState<{ purchaseId: string; lovableEmail: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const purchaseFiredRef = useRef(false);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const buyerValid = emailRe.test(buyerEmail.trim());
  const lovableValid = emailRe.test(lovableEmail.trim());
  const cpfDigits = cpfCnpj.replace(/\D/g, "");
  const cpfValid = cpfDigits.length === 11 || cpfDigits.length === 14;
  const formValid = !!selected && buyerValid && lovableValid && cpfValid;

  const remaining = useMemo(() => {
    if (!pix) return 0;
    return Math.max(
      0,
      Math.floor((new Date(pix.expiresAt).getTime() - now) / 1000),
    );
  }, [pix, now]);

  // ⏱️ Tick para countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 🎯 Pixel dedicado do funil de créditos: init + InitiateCheckout
  useEffect(() => {
    initCreditsPixel();
  }, []);
  useEffect(() => {
    if (!selected) return;
    const payload = {
      content_ids: [selected.id],
      content_name: `${selected.credits} créditos Lovable`,
      content_type: "product",
      value: selected.priceBrl,
      currency: "BRL",
      num_items: 1,
    };
    fbTrack("InitiateCheckout", payload);
    fbCreditsTrack("InitiateCheckout", payload);
  }, [selected]);

  // 🔁 Resumir compra via ?purchase=<id>
  useEffect(() => {
    if (!purchase) return;
    let cancelled = false;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("credit_purchases")
        .select("id,lovable_email,price_brl,status,asaas_payment_id")
        .eq("id", purchase)
        .maybeSingle();
      if (cancelled || !data) return;
      if (data.lovable_email) setLovableEmail(data.lovable_email);
      setPix({
        purchaseId: data.id,
        paymentId: data.asaas_payment_id ?? "",
        pixPayload: "",
        pixQrBase64: "",
        expiresAt: new Date().toISOString(),
        totalBrl: Number(data.price_brl) || 0,
      });
      setPaid(data.status === "paid" || data.status === "done");
    })();
    return () => {
      cancelled = true;
    };
  }, [purchase]);

  // 💾 Detecta compra recente (apenas notifica, NÃO bloqueia nova compra)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { purchaseId: string; lovableEmail: string; savedAt?: number };
      if (!saved?.purchaseId) return;
      // expira em 7 dias para não poluir indefinidamente
      if (saved.savedAt && Date.now() - saved.savedAt > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(LS_KEY);
        return;
      }
      setRecent({ purchaseId: saved.purchaseId, lovableEmail: saved.lovableEmail || "" });
      if (saved.lovableEmail) setLovableEmail(saved.lovableEmail);
    } catch {}
  }, []);

  function resumeRecent() {
    if (!recent) return;
    setPaid(true);
    setPix({
      purchaseId: recent.purchaseId,
      paymentId: "",
      pixPayload: "",
      pixQrBase64: "",
      expiresAt: new Date().toISOString(),
      totalBrl: 0,
    });
  }

  function dismissRecent() {
    try { localStorage.removeItem(LS_KEY); } catch {}
    setRecent(null);
  }

  // 🔄 Polling do PIX
  useEffect(() => {
    if (!pix || paid) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await checkFn({
          data: { paymentId: pix.paymentId, environment: ENV },
        });
        if (r.paid) {
          setPaid(true);
          try {
            localStorage.setItem(
              LS_KEY,
              JSON.stringify({
                purchaseId: pix.purchaseId,
                lovableEmail: lovableEmail.trim(),
                savedAt: Date.now(),
              }),
            );
          } catch {}
          // 🎯 Meta Pixel: Purchase (browser) - mesmo event_id que o server (CAPI) usa
          if (!purchaseFiredRef.current && selected) {
            purchaseFiredRef.current = true;
            const payload = {
              content_ids: [selected.id],
              content_name: `${selected.credits} créditos Lovable`,
              content_type: "product",
              value: pix.totalBrl || selected.priceBrl,
              currency: "BRL",
              num_items: 1,
            };
            const eventId = creditsPurchaseEventId(pix.purchaseId);
            fbTrack("Purchase", payload);
            fbCreditsTrack("Purchase", payload, eventId);
          }
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pix, paid, checkFn, lovableEmail, selected]);

  async function startCheckout() {
    if (!formValid || !selected) return;
    setCreating(true);
    try {
      // 🎯 Meta Pixel: AddPaymentInfo (browser + funil dedicado)
      const payInfo = {
        content_ids: [selected.id],
        value: selected.priceBrl,
        currency: "BRL",
      };
      fbTrack("AddPaymentInfo", payInfo);
      fbCreditsTrack("AddPaymentInfo", payInfo);
      const r = await createFn({
        data: {
          packageId: selected.id,
          buyerEmail: buyerEmail.trim(),
          lovableEmail: lovableEmail.trim(),
          cpfCnpj: cpfDigits,
          environment: ENV,
        },
      });
      setPix(r);
      setPaid(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar PIX");
    } finally {
      setCreating(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => toast.success("Copiado!"));
  }

  function reset() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    setPix(null);
    setPaid(false);
    setBuyerEmail("");
    setLovableEmail("");
    setCpfCnpj("");
    navigate({ to: "/creditos-lovable" });
  }

  // 🔐 Guarda de admin
  if (loading || (user && roleLoading)) {
    return <Layout><div className="p-12 text-center text-muted-foreground">Carregando…</div></Layout>;
  }
  if (!user) return null;
  if (!isAdmin) {
    return (
      <Layout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta página é apenas para administradores.</p>
        </div>
      </Layout>
    );
  }

  // ✅ SUCCESS
  if (paid && pix) {
    return (
      <Layout><div className="w-full border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-300">🧪 MODO TUTORIAL — Asaas Sandbox (pagamento simulado)</div>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">
              Pagamento confirmado!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Agora siga estes passos para receber seus créditos:
            </p>
          </div>

          <ol className="mt-8 space-y-4">
            <li className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  1
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    Abra as configurações da sua conta Lovable
                  </p>
                  <a
                    href="https://lovable.dev/settings/people"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm text-primary underline"
                  >
                    https://lovable.dev/settings/people
                  </a>
                </div>
              </div>
            </li>
            <li className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  2
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    Clique em "Invite members"
                  </p>
                </div>
              </div>
            </li>
            <li className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  3
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    Adicione como <span className="text-primary">Owner</span> o
                    email abaixo:
                  </p>
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                    <code className="flex-1 break-all text-sm text-foreground">
                      {SUPPORT_EMAIL}
                    </code>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copy(SUPPORT_EMAIL)}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
            </li>
            <li className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                  ✓
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Pronto!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Os créditos serão liberados na conta{" "}
                    <strong>{lovableEmail || pix.purchaseId}</strong>.
                  </p>
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left">
                    <p className="text-xs text-amber-200">
                      ⏱️ <strong>Atenção:</strong> devido à alta demanda, pode
                      levar até <strong>10 minutos</strong> para a contagem dos
                      créditos começar. Mantenha esta página aberta para
                      acompanhar em tempo real.
                    </p>
                  </div>
                </div>
              </div>
            </li>
          </ol>

          <CreditProgressCard purchaseId={pix.purchaseId} />
          <PostPurchaseHelp purchaseId={pix.purchaseId} lovableEmail={lovableEmail} />

          <div className="mt-8 text-center">
            <Button variant="outline" onClick={reset}>
              Comprar mais créditos
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // 💸 PIX
  if (pix) {
    const mins = Math.floor(remaining / 60)
      .toString()
      .padStart(2, "0");
    const secs = (remaining % 60).toString().padStart(2, "0");
    return (
      <Layout><div className="w-full border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-300">🧪 MODO TUTORIAL — Asaas Sandbox (pagamento simulado)</div>
        <div className="mx-auto max-w-xl px-4 py-10">
          <button
            onClick={() => setPix(null)}
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <QrCode className="h-4 w-4" />
              Pague com PIX
            </div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">
              {formatBrl(pix.totalBrl)}
            </h1>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Expira em {mins}:{secs}
            </div>

            <div className="mt-6 flex justify-center">
              <img
                src={`data:image/png;base64,${pix.pixQrBase64}`}
                alt="QR Code PIX"
                className="h-64 w-64 rounded-lg border border-border bg-white p-2"
              />
            </div>

            <div className="mt-6">
              <label className="text-xs font-semibold text-muted-foreground">
                PIX copia-e-cola
              </label>
              <div className="mt-1 flex gap-2">
                <Input
                  readOnly
                  value={pix.pixPayload}
                  className="font-mono text-xs"
                />
                <Button onClick={() => copy(pix.pixPayload)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Aguardando pagamento…
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // 📋 FORMULÁRIO
  return (
    <Layout><div className="w-full border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-300">🧪 MODO TUTORIAL — Asaas Sandbox (pagamento simulado)</div>
      <section className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/creditos-lovable"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Trocar pacote
          </Link>
          <Link
            to="/minha-compra"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Já comprei — recuperar acesso
          </Link>
        </div>

        {recent && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Você tem uma compra em andamento
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {recent.lovableEmail ? `Conta: ${recent.lovableEmail}` : "Acompanhe o progresso dos créditos."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={resumeRecent} className="rounded-full">
                  Ver progresso
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissRecent} className="rounded-full">
                  <X className="mr-1 h-3.5 w-3.5" /> Iniciar nova compra
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <ScarcityPanel seed={`credits-${selected?.id ?? "p"}`} compact />
        </div>

        <div className="mb-4">
          <TutorialVideo
            title="Veja antes de comprar: como liberar seus créditos (1 min)"
            subtitle="Mostramos exatamente o que você precisa fazer depois do pagamento. É simples, mesmo se você nunca usou o Lovable."
          />
        </div>

        <div
          id="credit-checkout-form"
          className="rounded-2xl border border-border bg-card p-6 shadow-xl"
        >
          <h1 className="text-2xl font-bold text-foreground">Finalizar compra</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selected ? (
              <>
                Pacote selecionado:{" "}
                <strong className="text-foreground">
                  {selected.credits.toLocaleString("pt-BR")} créditos
                </strong>{" "}
                · {formatBrl(selected.priceBrl)}
              </>
            ) : (
              "Escolha um pacote primeiro."
            )}
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Seu email (para contato)
              </label>
              <Input
                type="email"
                placeholder="voce@email.com"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Email da sua conta no Lovable
              </label>
              <Input
                type="email"
                placeholder="conta@lovable.dev"
                value={lovableEmail}
                onChange={(e) => setLovableEmail(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                É nessa conta que os créditos serão liberados. Confira antes de
                comprar.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                CPF ou CNPJ
              </label>
              <Input
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpfCnpj}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 14);
                  let v = d;
                  if (d.length <= 11) {
                    v = d
                      .replace(/^(\d{3})(\d)/, "$1.$2")
                      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
                      .replace(/\.(\d{3})(\d)/, ".$1-$2");
                  } else {
                    v = d
                      .replace(/^(\d{2})(\d)/, "$1.$2")
                      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                      .replace(/\.(\d{3})(\d)/, ".$1/$2")
                      .replace(/(\d{4})(\d)/, "$1-$2");
                  }
                  setCpfCnpj(v);
                }}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Exigido pelo provedor de pagamento para gerar o PIX.
              </p>
            </div>
            <Button
              onClick={startCheckout}
              disabled={!formValid || creating}
              className="w-full rounded-full bg-gradient-to-r from-pink-500 to-orange-500 font-bold text-white hover:from-pink-600 hover:to-orange-600"
              size="lg"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando PIX…
                </>
              ) : selected ? (
                <>Pagar {formatBrl(selected.priceBrl)} com PIX</>
              ) : (
                "Escolha um pacote"
              )}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Pagamento processado pelo Asaas
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
