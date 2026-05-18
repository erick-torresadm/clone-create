import { MessageCircle, Send } from "lucide-react";
import { WHATSAPP_URL, TELEGRAM_GROUP_URL, DISCORD_URL } from "@/lib/community";

// Ícone do Discord (lucide ainda não tem oficial)
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a.07.07 0 0 0-.074.035c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.249.073.073 0 0 0-.074-.035 19.74 19.74 0 0 0-3.759 1.369.067.067 0 0 0-.031.027C2.533 8.045 1.78 11.602 2.15 15.115a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.073.073 0 0 0 .079-.026c.462-.63.873-1.295 1.226-1.994a.072.072 0 0 0-.04-.1 13.1 13.1 0 0 1-1.872-.892.073.073 0 0 1-.008-.122c.126-.094.252-.192.372-.291a.071.071 0 0 1 .074-.01c3.927 1.793 8.18 1.793 12.061 0a.071.071 0 0 1 .075.009c.12.099.246.198.373.292a.073.073 0 0 1-.006.122 12.3 12.3 0 0 1-1.873.891.072.072 0 0 0-.039.101c.36.699.772 1.364 1.225 1.993a.072.072 0 0 0 .078.027 19.84 19.84 0 0 0 6.002-3.03.073.073 0 0 0 .031-.055c.444-4.06-.741-7.587-3.135-10.719a.06.06 0 0 0-.03-.028zM8.02 12.999c-1.182 0-2.156-1.085-2.156-2.418 0-1.333.955-2.418 2.156-2.418 1.21 0 2.176 1.094 2.156 2.418 0 1.333-.955 2.418-2.156 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.418 0-1.333.955-2.418 2.157-2.418 1.21 0 2.175 1.094 2.156 2.418 0 1.333-.946 2.418-2.156 2.418z" />
    </svg>
  );
}

export function CommunityCTA() {
  const links = [
    {
      href: WHATSAPP_URL,
      icon: MessageCircle,
      label: "WhatsApp",
      sub: "Suporte direto, resposta humana em minutos",
      bg: "from-emerald-500 to-emerald-600",
      ring: "hover:border-emerald-500/60",
    },
    {
      href: TELEGRAM_GROUP_URL,
      icon: Send,
      label: "Grupo no Telegram",
      sub: "Avisos de reposição, drops e cupons exclusivos",
      bg: "from-sky-500 to-sky-600",
      ring: "hover:border-sky-500/60",
    },
    {
      href: DISCORD_URL,
      icon: DiscordIcon,
      label: "Servidor no Discord",
      sub: "Comunidade ativa de operadores e gestores",
      bg: "from-indigo-500 to-indigo-600",
      ring: "hover:border-indigo-500/60",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
              Fale com a gente antes de comprar
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Suporte humano de verdade — escolha o canal que preferir.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online agora
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className={`group flex items-center gap-3 rounded-xl border border-border bg-background/60 p-4 transition ${l.ring}`}
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${l.bg} text-white shadow-lg`}>
                <l.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{l.label}</div>
                <div className="truncate text-xs text-muted-foreground">{l.sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
