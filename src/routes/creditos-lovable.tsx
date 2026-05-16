import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CREDIT_PACKAGES, createCreditCheckout, checkCreditPayment, type CreditPackage } from "@/lib/credits.functions";
import { Sparkles, Zap, Copy, CheckCircle2, Loader2, Clock, ShieldCheck, ArrowLeft, QrCode } from "lucide-react";
import { toast } from "sonner";

const ENV = "live" as "sandbox" | "live";
const SUPPORT_EMAIL = "er.ic.klo.vabl.ecredits@gmail.com";

export const Route = createFileRoute("/creditos-lovable")({
  head: () => ({
    meta: [
      { title: "Créditos Lovable — Recarga rápida via PIX" },
      { name: "description", content: "Compre créditos para sua conta Lovable. Pagamento via PIX, ativação em minutos." },
      { property: "og:title", content: "Créditos Lovable — Recarga rápida via PIX" },
      { property: "og:description", content: "Pacotes de 100 a 2.000 créditos Lovable. PIX, entrega rápida." },
    ],
    links: [{ rel: "canonical", href: "/creditos-lovable" }],
  }),
  component: CreditsPage,
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

function CreditsPage() {
  const createFn = useServerFn(createCreditCheckout);
  const checkFn = useServerFn(checkCreditPayment);

  const [selected, setSelected] = useState<CreditPackage | null>(null);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [lovableEmail, setLovableEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [pix, setPix] = useState<PixSession | null>(null);
  const [paid, setPaid] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const buyerValid = emailRe.test(buyerEmail.trim());
  const lovableValid = emailRe.test(lovableEmail.trim());
  const formValid = !!selected && buyerValid && lovableValid;

  const remaining = useMemo(() => {
    if (!pix) return 0;
    return Math.max(0, Math.floor((new Date(pix.expiresAt).getTime() - now) / 1000));
  }, [pix, now]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!pix || paid) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await checkFn({ data: { paymentId: pix.paymentId, environment: ENV } });
        if (r.paid) {
          setPaid(true);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pix, paid, checkFn]);

  async function startCheckout() {
    if (!formValid || !selected) return;
    // MODO TESTE: pula o PIX e libera direto a tela de instruções
    setPix({
      purchaseId: "test-" + Date.now(),
      paymentId: "test",
      pixPayload: "",
      pixQrBase64: "",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      totalBrl: selected.priceBrl,
    });
    setPaid(true);
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => toast.success("Copiado!"));
  }

  function reset() {
    setPix(null);
    setPaid(false);
    setSelected(null);
    setBuyerEmail("");
    setLovableEmail("");
  }

  // ---- SUCCESS / INSTRUÇÕES ----
  if (paid && pix) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Pagamento confirmado!</h1>
            <p className="mt-2 text-muted-foreground">
              Agora siga estes passos para receber seus créditos:
            </p>
          </div>

          <ol className="mt-8 space-y-4">
            <li className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">1</span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Abra as configurações da sua conta Lovable</p>
                  <a href="https://lovable.dev/settings/people" target="_blank" rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm text-primary underline">
                    https://lovable.dev/settings/people
                  </a>
                </div>
              </div>
            </li>
            <li className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">2</span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Clique em "Invite members"</p>
                </div>
              </div>
            </li>
            <li className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">3</span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Adicione como <span className="text-primary">Owner</span> o email abaixo:</p>
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                    <code className="flex-1 break-all text-sm text-foreground">{SUPPORT_EMAIL}</code>
                    <Button size="sm" variant="secondary" onClick={() => copy(SUPPORT_EMAIL)}>
                      <Copy className="mr-1 h-3.5 w-3.5" />Copiar
                    </Button>
                  </div>
                </div>
              </div>
            </li>
            <li className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">✓</span>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Pronto!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Em alguns minutos os créditos serão liberados na conta <strong>{lovableEmail || pix.purchaseId}</strong>.
                  </p>
                </div>
              </div>
            </li>
          </ol>

          <div className="mt-8 text-center">
            <Button variant="outline" onClick={reset}>Comprar mais créditos</Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ---- PIX MODAL/SECTION ----
  if (pix) {
    const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
    const secs = (remaining % 60).toString().padStart(2, "0");
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-4 py-10">
          <button onClick={() => setPix(null)} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Voltar
          </button>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <QrCode className="h-4 w-4" />Pague com PIX
            </div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">{formatBrl(pix.totalBrl)}</h1>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />Expira em {mins}:{secs}
            </div>

            <div className="mt-6 flex justify-center">
              <img
                src={`data:image/png;base64,${pix.pixQrBase64}`}
                alt="QR Code PIX"
                className="h-64 w-64 rounded-lg border border-border bg-white p-2"
              />
            </div>

            <div className="mt-6">
              <label className="text-xs font-semibold text-muted-foreground">PIX copia-e-cola</label>
              <div className="mt-1 flex gap-2">
                <Input readOnly value={pix.pixPayload} className="font-mono text-xs" />
                <Button onClick={() => copy(pix.pixPayload)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />Aguardando pagamento…
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ---- LANDING / SELEÇÃO ----
  const sliderIdx = selected ? CREDIT_PACKAGES.findIndex(p => p.id === selected.id) : 0;
  const currentPkg = selected ?? CREDIT_PACKAGES[0];

  function scrollToForm() {
    document.getElementById("credit-checkout-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]" />
        <div className="mx-auto max-w-4xl px-4 pt-12 pb-6 text-center sm:pt-16">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-pink-500/30">
            <Sparkles className="h-3.5 w-3.5" /> Novidade
          </div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Plano de Recarga
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Créditos entregues <strong className="text-foreground">direto no seu workspace Lovable</strong>, automaticamente, até completar o plano contratado.
          </p>
        </div>
      </section>

      {/* TOTAL + SLIDER */}
      <section className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-3xl border border-border bg-card/60 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
              <div className="mt-1 bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl">
                {formatBrl(currentPkg.priceBrl)}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentPkg.credits.toLocaleString("pt-BR")} créditos
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => { if (!selected) setSelected(CREDIT_PACKAGES[0]); scrollToForm(); }}
              className="group h-14 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-8 text-base font-bold text-white shadow-lg shadow-pink-500/30 hover:from-pink-600 hover:to-orange-600"
            >
              Comprar agora
              <Zap className="ml-2 h-5 w-5 transition group-hover:translate-x-0.5" />
            </Button>
          </div>

          {/* Slider */}
          <div className="mt-10">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Quantos créditos você quer?
            </p>
            <div className="mt-4 text-center">
              <span className="text-6xl font-extrabold text-foreground sm:text-7xl">
                {currentPkg.credits.toLocaleString("pt-BR")}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">créditos</span>
            </div>
            <input
              type="range"
              min={0}
              max={CREDIT_PACKAGES.length - 1}
              step={1}
              value={sliderIdx < 0 ? 0 : sliderIdx}
              onChange={(e) => setSelected(CREDIT_PACKAGES[Number(e.target.value)])}
              className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-pink-500"
            />
            <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {CREDIT_PACKAGES.map((p) => (
                <span key={p.id}>{p.credits >= 1000 ? `${p.credits / 1000}k` : p.credits}</span>
              ))}
            </div>
          </div>

          {/* Passos */}
          <ul className="mt-10 space-y-4">
            {[
              { icon: ShieldCheck, title: "Convide nosso bot", desc: "no seu workspace Lovable (em Settings → Members)" },
              { icon: Sparkles, title: "Promova a Owner", desc: "e a recarga começa automaticamente" },
              { icon: Zap, title: `${currentPkg.credits.toLocaleString("pt-BR")} créditos entregues`, desc: "no mesmo dia, de forma automática" },
              { icon: Clock, title: "Acompanhamento em tempo real", desc: "e suporte humano via WhatsApp" },
              { icon: CheckCircle2, title: "Workspace não compatível?", desc: "Enviamos um novo workspace já liberado, sem custo extra." },
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/20 to-orange-500/20 text-pink-400">
                  <s.icon className="h-4.5 w-4.5" />
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-bold text-foreground">{s.title}</span> {s.desc}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total</p>
              <div className="mt-1 bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-3xl font-extrabold text-transparent">
                {formatBrl(currentPkg.priceBrl)}
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => { if (!selected) setSelected(CREDIT_PACKAGES[0]); scrollToForm(); }}
              className="h-12 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-8 font-bold text-white shadow-lg shadow-pink-500/30 hover:from-pink-600 hover:to-orange-600"
            >
              Comprar agora
            </Button>
          </div>
        </div>
      </section>

      {/* PLANOS SUGERIDOS */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Planos Sugeridos</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Escolha uma das opções rápidas abaixo ou use o simulador acima.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CREDIT_PACKAGES.map((p) => {
            const isSel = selected?.id === p.id;
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border bg-card p-6 transition-all ${
                  isSel ? "border-pink-500/60 shadow-[0_0_40px_-10px_rgba(236,72,153,0.5)]" : "border-border hover:border-pink-500/40"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                    Mais escolhido
                  </span>
                )}
                <h3 className="text-lg font-bold text-foreground">{p.credits.toLocaleString("pt-BR")} Créditos</h3>
                <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Investimento</p>
                <div className="mt-1 bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-3xl font-extrabold text-transparent">
                  {formatBrl(p.priceBrl)}
                </div>
                <Button
                  onClick={() => { setSelected(p); scrollToForm(); }}
                  className="mt-5 w-full rounded-full bg-gradient-to-r from-pink-500 to-orange-500 font-bold text-white hover:from-pink-600 hover:to-orange-600"
                >
                  Comprar
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 text-center sm:grid-cols-4">
          {[
            { t: "No seu workspace", d: "Sem mudar de conta" },
            { t: "Entrega automática", d: "Até completar o plano" },
            { t: "Sem renovação", d: "Você decide quando" },
            { t: "Suporte humano", d: "WhatsApp direto" },
          ].map((b, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/60 p-4">
              <p className="text-sm font-bold text-foreground">{b.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section className="mx-auto max-w-xl px-4 pb-16">
        <div id="credit-checkout-form" className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <h2 className="text-lg font-bold text-foreground">Dados da compra</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selected
              ? <>Pacote selecionado: <strong className="text-foreground">{selected.credits.toLocaleString("pt-BR")} créditos</strong> · {formatBrl(selected.priceBrl)}</>
              : "Escolha um pacote acima."}
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Seu email (para contato)</label>
              <Input
                type="email"
                placeholder="voce@email.com"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Email da sua conta no Lovable</label>
              <Input
                type="email"
                placeholder="conta@lovable.dev"
                value={lovableEmail}
                onChange={(e) => setLovableEmail(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                É nessa conta que os créditos serão liberados. Confira antes de comprar.
              </p>
            </div>
            <Button
              onClick={startCheckout}
              disabled={!formValid || creating}
              className="w-full rounded-full bg-gradient-to-r from-pink-500 to-orange-500 font-bold text-white hover:from-pink-600 hover:to-orange-600"
              size="lg"
            >
              {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando PIX…</> :
                selected ? <>Pagar {formatBrl(selected.priceBrl)} com PIX</> : "Escolha um pacote"}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />Pagamento processado pelo Asaas
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
