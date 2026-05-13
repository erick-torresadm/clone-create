import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Zap, Headphones } from "lucide-react";
import { Layout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { SECTIONS } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FDM store — Assinaturas" },
      { name: "description", content: "Assinaturas digitais com entrega automática, suporte 24/7 e os melhores preços." },
      { property: "og:title", content: "FDM store — Assinaturas digitais" },
      { property: "og:description", content: "Streaming, contas e serviços premium com os melhores preços." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const featured = SECTIONS[0].products.slice(0, 3);
  return (
    <Layout>
      <section className="relative mx-auto max-w-7xl overflow-hidden px-6 pb-16 pt-16 sm:pt-24">
        {/* Animated aurora blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
          <div className="aurora-blob aurora-blob-1 left-[10%] top-[5%] h-72 w-72" />
          <div className="aurora-blob aurora-blob-2 right-[8%] top-[15%] h-80 w-80" />
          <div className="aurora-blob aurora-blob-3 left-[40%] top-[40%] h-64 w-64" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            ✦ Loja oficial verificada
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Assinaturas premium <br />
            <span className="text-primary">
              pelo melhor preço.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Streaming, música, contas e ferramentas premium com entrega automática e suporte 24/7.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/produtos"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-10px_rgba(99,140,255,0.8)] transition hover:brightness-110"
            >
              Ver produtos <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/sobre"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/50"
            >
              Sobre nós
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Entrega imediata", desc: "Receba seu acesso em segundos após a compra." },
            { icon: ShieldCheck, title: "100% garantido", desc: "Reposição grátis e suporte durante toda a assinatura." },
            { icon: Headphones, title: "Suporte 24/7", desc: "Atendimento humano todos os dias da semana." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-primary to-primary/30 shadow-[0_0_12px_rgba(99,140,255,0.6)]" />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Em destaque</h2>
          </div>
          <Link to="/produtos" className="text-sm font-medium text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </Layout>
  );
}
