import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestCreditPurchaseRecovery } from "@/lib/credits-recovery.functions";
import { Mail, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/minha-compra")({
  head: () => ({
    meta: [
      { title: "Recuperar acesso à compra — Ativosfy" },
      {
        name: "description",
        content:
          "Recupere o link da sua compra de créditos Lovable digitando o email usado no pagamento.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: RecoveryPage,
});

function RecoveryPage() {
  const send = useServerFn(requestCreditPurchaseRecovery);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      await send({ data: { email: email.trim() } });
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <section className="mx-auto max-w-md px-4 py-12">
        <Link
          to="/creditos-lovable"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        {done ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Verifique seu email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Se houver uma compra registrada em <strong className="text-foreground">{email}</strong>,
              enviamos os links de acesso agora. Pode levar até 2 minutos pra chegar.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Não chegou? Confira a pasta de spam ou{" "}
              <button
                type="button"
                onClick={() => {
                  setDone(false);
                  setEmail("");
                }}
                className="text-primary underline"
              >
                tentar com outro email
              </button>
              .
            </p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Mail className="h-4 w-4" />
              Recuperar acesso à compra
            </div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">
              Perdeu a página da sua compra?
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Digite o mesmo email que você usou no checkout e nós enviaremos o link da página
              de progresso pra você.
            </p>

            <label className="mt-6 block text-xs font-semibold text-muted-foreground">
              Seu email
            </label>
            <Input
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              autoFocus
            />

            <Button
              type="submit"
              disabled={!valid || loading}
              className="mt-6 w-full rounded-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                "Receber link por email"
              )}
            </Button>

            <p className="mt-4 text-[11px] text-muted-foreground">
              Por segurança, não dizemos se o email existe ou não — você só recebe o email se
              houver uma compra associada.
            </p>
          </form>
        )}
      </section>
    </Layout>
  );
}
