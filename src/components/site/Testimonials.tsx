import { Star, Quote } from "lucide-react";

type Testimonial = {
  name: string;
  handle?: string;
  avatar: string;
  rating: number;
  product: string;
  body: string;
  date: string;
};

// Avatares neutros (iniciais coloridas) — sem cara de "stock photo".
const av = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1e293b,334155,0f172a,1e40af,475569&textColor=ffffff&fontWeight=600`;

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Rafael M.",
    avatar: av("RM"),
    rating: 5,
    product: "PRO Premium",
    body:
      "Tô comprando aqui já faz uns meses. Já precisei de reposição duas vezes e resolveram rápido no whats. Tá valendo.",
    date: "há 5 dias",
  },
  {
    name: "Camila A.",
    handle: "@cami.scale",
    avatar: av("CA"),
    rating: 4,
    product: "BM 300",
    body:
      "Confesso que da primeira vez fiquei com pé atrás, já tinha tomado golpe antes. Comprei o mais barato pra testar e deu certo. Hoje sou cliente fixa.",
    date: "há 1 semana",
  },
  {
    name: "Diego P.",
    avatar: av("DP"),
    rating: 5,
    product: "USA Aquecido",
    body:
      "Perfil veio com proxy configurado. Subi campanha sem dor de cabeça. Recomendo.",
    date: "há 2 semanas",
  },
  {
    name: "Juliana R.",
    handle: "@ju.ecom",
    avatar: av("JR"),
    rating: 4,
    product: "Expert Premium",
    body:
      "Tive um probleminha com 2FA (culpa minha) e o suporte me ajudou no whats sem enrolação. Atendimento bom.",
    date: "há 3 semanas",
  },
  {
    name: "Lucas B.",
    avatar: av("LB"),
    rating: 5,
    product: "Perfil BR",
    body:
      "Já testei outros fornecedores. Aqui o aquecimento parece mais consistente, não é aquele perfil novo enrolado.",
    date: "há 1 mês",
  },
  {
    name: "Bruna T.",
    handle: "@bru.t",
    avatar: av("BT"),
    rating: 4,
    product: "PRO Máster",
    body:
      "Comprei o pacote maior pra escalar. Até agora sem quedas. Quando pedi nota pra prestar conta mandaram no dia seguinte.",
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
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          O que dizem quem já comprou
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Comentários de clientes coletados no atendimento e nos canais privados.
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
                <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                {t.handle && (
                  <p className="truncate text-[11px] text-muted-foreground">{t.handle}</p>
                )}
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

            <div className="mt-4 text-[11px] text-muted-foreground/80">
              Compra: <span className="text-foreground/80">{t.product}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
