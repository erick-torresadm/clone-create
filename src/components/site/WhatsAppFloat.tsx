import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/community";

export function WhatsAppFloat() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-5 left-5 z-[60] flex flex-col items-start gap-2 sm:bottom-6 sm:left-6">
      {open && (
        <div className="relative max-w-[260px] rounded-2xl border border-emerald-500/30 bg-card/95 p-3 pr-8 text-xs text-foreground shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-2">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="font-semibold text-foreground">Suporte humano no WhatsApp</p>
          <p className="mt-1 text-muted-foreground">
            Tire dúvidas antes de comprar — respondemos em poucos minutos.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Abrir conversa
          </a>
        </div>
      )}

      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        onMouseEnter={() => setOpen(true)}
        aria-label="Falar no WhatsApp"
        className="group relative grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_12px_30px_-8px_rgba(16,185,129,0.7)] transition hover:scale-105 hover:brightness-110 active:scale-95"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />
        <MessageCircle className="relative h-7 w-7" />
      </a>
    </div>
  );
}
