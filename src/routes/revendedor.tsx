import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { useResellerStatus } from "@/lib/reseller";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Loader2, Percent, ShieldCheck, Sparkles, TrendingUp, Wallet, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/revendedor")({
  head: () => ({
    meta: [
      { title: "Programa de Revendedor — Ativosfy" },
      { name: "description", content: "Compre com preço de revendedor e revenda com margens maiores. Cadastro com aprovação." },
      { property: "og:title", content: "Programa de Revendedor — Ativosfy" },
      { property: "og:description", content: "Tenha acesso a preços exclusivos para revenda. Aprovação manual." },
      { property: "og:url", content: "/revendedor" },
    ],
    links: [{ rel: "canonical", href: "/revendedor" }],
  }),
  component: ResellerLanding,
});

function ResellerLanding() {
  const { user, loading } = useAuth();
  const { data: reseller, isLoading: rLoading, refetch } = useResellerStatus();
  const navigate = useNavigate();

  const [whatsapp, setWhatsapp] = useState("");
  const [telegram, setTelegram] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (reseller.request) {
      setWhatsapp(reseller.request.whatsapp ?? "");
      setTelegram(reseller.request.telegram ?? "");
      setReason(reseller.request.reason ?? "");
    }
  }, [reseller.request]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Faça login para continuar");
      if (whatsapp.trim().length < 8) throw new Error("Informe um WhatsApp válido");
      const { error } = await (supabase as any).rpc("request_reseller", {
        _whatsapp: whatsapp.trim(),
        _telegram: telegram.trim() || null,
        _reason: reason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido enviado! Vamos analisar e te avisar.");
      refetch();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao enviar"),
  });

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
        {/* Hero */}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-8 sm:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <Sparkles className="h-3 w-3" /> Programa de Revendedor
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Compre com <span className="text-emerald-400">preço exclusivo</span> e revenda com margens maiores.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Para revendedores aprovados, todos os produtos do site passam a aparecer com preço reduzido — você compra mais barato e revende pelo preço que quiser.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Benefit icon={Percent} title="Até 50% off" desc="Em todos os produtos do catálogo." />
            <Benefit icon={TrendingUp} title="Margem alta" desc="Venda pelo seu próprio preço." />
            <Benefit icon={ShieldCheck} title="Suporte VIP" desc="Atendimento prioritário no chat." />
          </div>
        </div>

        {/* Estado */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
          {loading || rLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
          ) : !user ? (
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Crie sua conta para se cadastrar</h2>
              <p className="mt-1 text-sm text-muted-foreground">É preciso ter uma conta para solicitar acesso ao programa.</p>
              <button
                onClick={() => navigate({ to: "/entrar", search: { redirect: "/revendedor" } as any })}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110"
              >
                Criar conta / Entrar
              </button>
            </div>
          ) : reseller.status === "approved" ? (
            <ApprovedBlock />
          ) : reseller.status === "pending" ? (
            <PendingBlock note={reseller.request?.admin_note ?? null} />
          ) : reseller.status === "rejected" ? (
            <RejectedBlock note={reseller.request?.admin_note ?? null} onResend={() => submit.mutate()} pending={submit.isPending} whatsapp={whatsapp} setWhatsapp={setWhatsapp} telegram={telegram} setTelegram={setTelegram} reason={reason} setReason={setReason} />
          ) : (
            <FormBlock onSubmit={() => submit.mutate()} pending={submit.isPending} whatsapp={whatsapp} setWhatsapp={setWhatsapp} telegram={telegram} setTelegram={setTelegram} reason={reason} setReason={setReason} />
          )}
        </div>
      </div>
    </Layout>
  );
}

function Benefit({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <Icon className="h-5 w-5 text-emerald-400" />
      <div className="mt-2 text-sm font-bold text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}

function FormBlock(props: { onSubmit: () => void; pending: boolean; whatsapp: string; setWhatsapp: (v: string) => void; telegram: string; setTelegram: (v: string) => void; reason: string; setReason: (v: string) => void }) {
  const { onSubmit, pending, whatsapp, setWhatsapp, telegram, setTelegram, reason, setReason } = props;
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <h2 className="text-xl font-bold text-foreground">Solicitar acesso</h2>
      <p className="mt-1 text-sm text-muted-foreground">Vamos analisar seu pedido em até 24h.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="WhatsApp *" value={whatsapp} onChange={setWhatsapp} placeholder="(11) 99999-9999" />
        <Field label="Telegram (opcional)" value={telegram} onChange={setTelegram} placeholder="@seuusuario" />
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Por que você quer ser revendedor?</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Conte rapidamente sobre seu negócio, volume estimado, etc."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
        Enviar solicitação
      </button>
    </form>
  );
}

function PendingBlock({ note }: { note: string | null }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/10 text-amber-400"><Clock className="h-6 w-6" /></div>
      <h2 className="mt-4 text-xl font-bold text-foreground">Cadastro em análise</h2>
      <p className="mt-1 text-sm text-muted-foreground">Vamos avaliar seu pedido e te responder em breve.</p>
      {note && <p className="mt-3 text-xs italic text-muted-foreground">Nota: {note}</p>}
    </div>
  );
}

function RejectedBlock(props: any) {
  return (
    <div>
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-destructive"><XCircle className="h-4 w-4" /> Pedido recusado</div>
        {props.note && <p className="mt-1 text-xs text-muted-foreground">Motivo: {props.note}</p>}
        <p className="mt-1 text-xs text-muted-foreground">Você pode atualizar os dados e enviar novamente.</p>
      </div>
      <div className="mt-5">
        <FormBlock {...props} onSubmit={props.onResend} />
      </div>
    </div>
  );
}

function ApprovedBlock() {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="h-6 w-6" /></div>
      <h2 className="mt-4 text-xl font-bold text-foreground">Você é revendedor aprovado 🎉</h2>
      <p className="mt-1 text-sm text-muted-foreground">Os preços de revendedor já estão aplicados em todo o site.</p>
      <Link to="/produtos" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:brightness-110">
        <Wallet className="h-4 w-4" /> Comprar agora
      </Link>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </div>
  );
}
