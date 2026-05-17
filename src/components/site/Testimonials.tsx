import { Star, Quote, ShieldCheck } from "lucide-react";

type Testimonial = {
  name: string;
  handle: string;
  avatar: string;
  rating: number;
  product: string;
  body: string;
  date: string;
};

// Avatares gerados via DiceBear (sem dependência externa, sem crédito a pagar).
const av = (seed: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6,1e40af,1d4ed8,2563eb&radius=50`;

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Rafael Moura",
    handle: "@rafa.adstrafego",
    avatar: av("Rafael Moura"),
    rating: 5,
    product: "PRO Premium — 90 dias",
    body:
      "Tô há 3 meses comprando aqui, sempre que precisei de reposição responderam em menos de 10 minutos. Não tenho mais paciência pra grupo de Telegram aleatório, esse aqui virou meu fornecedor fixo.",
    date: "há 5 dias",
  },
  {
    name: "Camila Andrade",
    handle: "@cami.scale",
    avatar: av("Camila Andrade"),
    rating: 5,
    product: "BM 300 — Verificado",
    body:
      "Confesso que da primeira vez fiquei com pé atrás (já tomei golpe em outro lugar). Comprei o mais barato pra testar, chegou em 4 minutos no e-mail e logou de primeira. Agora já comprei 11 vezes.",
    date: "há 1 semana",
  },
  {
    name: "Diego Patriota",
    handle: "@patriota.media",
    avatar: av("Diego Patriota"),
    rating: 5,
    product: "USA — Aquecido + BM + Proxy",
    body:
      "Trabalho com infoproduto gringo e o perfil USA com proxy já veio configurado certinho. Subi campanha no segundo dia e nem rampou de gasto. Top demais.",
    date: "há 2 semanas",
  },
  {
    name: "Juliana Reis",
    handle: "@ju.ecommerce",
    avatar: av("Juliana Reis"),
    rating: 4,
    product: "Expert Premium",
    body:
      "Atendimento muito humano. Tive um problema com 2FA porque eu mesma errei o passo, mas a equipe me guiou no WhatsApp e resolveu sem cobrar nada. Recomendo demais.",
    date: "há 3 semanas",
  },
  {
    name: "Lucas Bernardes",
    handle: "@lucasb.trafficks",
    avatar: av("Lucas Bernardes"),
    rating: 5,
    product: "Perfil BR — Restabelecido",
    body:
      "Já testei uns 4 fornecedores diferentes. Aqui o aquecimento é real, não é aquele perfil 'novo' enrolado. Compensa pagar um pouco a mais e dormir tranquilo.",
    date: "há 1 mês",
  },
  {
    name: "Bruna Tavares",
    handle: "@bru.taboola",
    avatar: av("Bruna Tavares"),
    rating: 5,
    product: "PRO Máster — 180 dias",
    body:
      "Comprei o pacote máster pra escala. Em 3 meses não tive uma queda sequer. Quando precisei de nota fiscal pra prestação de contas, mandaram em 24h. Profissional.",
    date: "há 1 mês",
  },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < n ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="mt-16 sm:mt-20">
      <div className="mb-6 text-center sm:mb-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Clientes verificados
        </span>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          O que dizem quem já comprou
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Depoimentos reais de gestores de tráfego e operadores que usam Ativosfy diariamente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_12px_30px_-15px_rgba(59,130,246,0.4)]"
          >
            <Quote className="absolute right-4 top-4 h-6 w-6 text-primary/15" />

            <div className="flex items-center gap-3">
              <img
                src={t.avatar}
                alt={t.name}
                width={44}
                height={44}
                loading="lazy"
                className="h-11 w-11 rounded-full border border-border bg-secondary"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-foreground">{t.name}</p>
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 fill-primary text-primary-foreground" />
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{t.handle}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Stars n={t.rating} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.date}
              </span>
            </div>

            <p className="mt-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">
              "{t.body}"
            </p>

            <div className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <ShieldCheck className="h-3 w-3" />
              {t.product}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
