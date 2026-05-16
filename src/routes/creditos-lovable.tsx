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
    setCreating(true);
    try {
      const res = await createFn({
        data: {
          packageId: selected.id,
          buyerEmail: buyerEmail.trim(),
          lovableEmail: lovableEmail.trim(),
          environment: ENV,
        },
      });
      setPix(res);
      setPaid(false);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar PIX");
    } finally {
      setCreating(false);
    }
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
  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />Recarga rápida via PIX
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Créditos Lovable
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Continue criando sem parar. Pacotes para todos os tamanhos de projeto, com ativação em poucos minutos após o pagamento.
          </p>
        </div>

        {/* Pacotes */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CREDIT_PACKAGES.map((p) => {
            const isSel = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`group relative rounded-2xl border p-5 text-left transition-all ${
                  isSel
                    ? "border-primary bg-primary/5 shadow-[0_0_30px_-10px_rgba(99,140,255,0.6)]"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-2 left-4 rounded-full bg-gradient-to-r from-primary to-primary/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    Mais escolhido
                  </span>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">{p.credits.toLocaleString("pt-BR")}</span>
                  <span className="text-sm text-muted-foreground">créditos</span>
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">{p.name}</p>
                <div className="mt-4 text-2xl font-bold text-foreground">{formatBrl(p.priceBrl)}</div>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" />{p.cycles} ciclos</li>
                  <li className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" />Entrega em ~{p.days} dia{p.days > 1 ? "s" : ""}</li>
                </ul>
                <div className={`mt-4 rounded-lg border px-3 py-2 text-center text-xs font-semibold transition ${
                  isSel ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground group-hover:border-primary/50"
                }`}>
                  {isSel ? "Selecionado ✓" : "Selecionar"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Formulário */}
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">Dados da compra</h2>
          <p className="mt-1 text-sm text-muted-foreground">Preencha para gerar o PIX.</p>
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
            <Button onClick={startCheckout} disabled={!formValid || creating} className="w-full" size="lg">
              {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando PIX…</> :
                selected ? <>Pagar {formatBrl(selected.priceBrl)} com PIX</> : "Escolha um pacote"}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />Pagamento processado pelo Asaas
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
