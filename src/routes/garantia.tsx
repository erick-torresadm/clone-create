import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ShieldCheck, AlertTriangle, RefreshCcw, Clock, BookOpen } from "lucide-react";

export const Route = createFileRoute("/garantia")({
  head: () => ({
    meta: [
      { title: "Política de Garantia e Reembolso — FarmFy" },
      { name: "description", content: "Garantia de login de 7 dias, política de reembolso e regras de uso dos perfis e contas premium." },
      { property: "og:title", content: "Política de Garantia e Reembolso" },
      { property: "og:description", content: "Garantia de login de 7 dias, política de reembolso e regras de uso." },
    ],
  }),
  component: GarantiaPage,
});

function GarantiaPage() {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Garantia & Reembolso
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Política de Garantia
          </h1>
          <p className="mt-3 text-muted-foreground">
            Leia com atenção antes de qualquer compra. Estas regras valem para todos os perfis e contas vendidas na loja.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card icon={<Clock className="h-5 w-5" />} title="Garantia de login">
            <b>7 dias</b> — válida até o cliente conseguir logar no perfil.
          </Card>
          <Card icon={<RefreshCcw className="h-5 w-5" />} title="Reposição">
            Caso o perfil não logue dentro do prazo, fazemos a <b>troca imediata</b>.
          </Card>
          <Card icon={<AlertTriangle className="h-5 w-5" />} title="Após o login">
            Qualquer alteração após o primeiro acesso passa por <b>análise do suporte</b>.
          </Card>
        </div>

        <Section title="O que está coberto pela garantia">
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Aquecimento do perfil entregue conforme descrito no anúncio.</li>
            <li>Entrega do perfil completa, com tutoriais de acesso.</li>
            <li>Reposição quando o perfil <b>não loga</b> dentro do prazo de 7 dias.</li>
          </ul>
        </Section>

        <Section title="O que NÃO está coberto" tone="warn">
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Bloqueios aplicados pela <b>Meta/Facebook após a entrega</b> — qualquer alteração é entre o usuário e a Meta. Se ele infringiu alguma regra das políticas deles, não há possibilidade de responsabilização da agência intermediadora.</li>
            <li>Quedas por uso de IP/proxy ruim, mistura de geolocalização ou comportamento atípico.</li>
            <li>Trocas de senha, e-mail ou 2FA feitas <b>antes do tempo recomendado</b> (ver dicas de aquecimento).</li>
            <li>Subir campanhas nas primeiras 24h após o login.</li>
          </ul>
        </Section>

        <Section title="Reembolso">
          <p className="text-muted-foreground">
            Caso a entrega não ocorra ou o perfil não logue dentro do prazo, e não tenhamos um substituto disponível,
            o valor pago via PIX é devolvido integralmente em até <b>2 dias úteis</b> para a mesma chave PIX da origem do pagamento.
          </p>
          <p className="mt-3 text-muted-foreground">
            Pedidos já entregues e logados com sucesso <b>não são reembolsáveis</b>, conforme prática do mercado de produtos digitais (CDC, art. 49, exceção para bens consumidos imediatamente).
          </p>
        </Section>

        <Section title="Como acionar a garantia">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Vá em <Link to="/minha-conta" className="text-primary hover:underline">Minha conta</Link> e localize o pedido.</li>
            <li>Entre em contato pelo <Link to="/contato" className="text-primary hover:underline">canal de suporte</Link> com o ID do pedido.</li>
            <li>Descreva o problema (mensagem de erro, prints) — analisamos e respondemos em até 24h úteis.</li>
          </ol>
        </Section>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row">
          <div>
            <p className="text-sm font-semibold text-foreground">Quer aproveitar ao máximo seu perfil?</p>
            <p className="text-sm text-muted-foreground">Veja o passo a passo de acesso, 2FA e aquecimento.</p>
          </div>
          <Link
            to="/dicas"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <BookOpen className="h-4 w-4" /> Ver dicas e tutoriais
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "warn" }) {
  return (
    <section className={`mt-10 rounded-2xl border p-6 ${tone === "warn" ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"}`}>
      <h2 className="mb-3 text-xl font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
