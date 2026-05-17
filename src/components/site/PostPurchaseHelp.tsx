import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageCircle, Lock, Clock } from "lucide-react";
import { TutorialVideo } from "./TutorialVideo";

const SUPPORT_WHATSAPP = "5511930070320";
const COMMUNITY_URL = "https://chat.whatsapp.com/CAQzvoaGFQUDLAGdxqWy1o";
const UNLOCK_MINUTES = 20;

export function PostPurchaseHelp({ purchaseId, lovableEmail }: { purchaseId: string; lovableEmail?: string }) {
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    supabase
      .from("credit_purchases")
      .select("created_at")
      .eq("id", purchaseId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data?.created_at) setCreatedAt(new Date(data.created_at).getTime());
      });
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [purchaseId]);

  const unlockAt = createdAt ? createdAt + UNLOCK_MINUTES * 60 * 1000 : null;
  const remainingMs = unlockAt ? Math.max(0, unlockAt - now) : UNLOCK_MINUTES * 60 * 1000;
  const unlocked = unlockAt !== null && now >= unlockAt;
  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);

  const waMsg = encodeURIComponent(
    `Olá! Comprei créditos Lovable e preciso de ajuda.\nCompra: ${purchaseId}${lovableEmail ? `\nConta Lovable: ${lovableEmail}` : ""}`,
  );

  return (
    <div className="mt-8 space-y-6">
      {/* 🎥 Tutorial */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">Tutorial: como adicionar o bot na sua conta Lovable</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Assista o vídeo abaixo (1 min) — é bem simples e você consegue fazer sozinho.
        </p>
        <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
          {TUTORIAL_VIDEO_URL ? (
            <iframe
              src={TUTORIAL_VIDEO_URL}
              title="Tutorial créditos Lovable"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Vídeo em breve
            </div>
          )}
        </div>
      </div>

      {/* 👥 Comunidade */}
      <a
        href={COMMUNITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 transition hover:border-emerald-500/60"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Entre na comunidade no WhatsApp</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tire dúvidas com outros clientes e nossa equipe. Disponível desde já.
          </p>
        </div>
        <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">Entrar</span>
      </a>

      {/* 🆘 Suporte direto (libera em 20 min) */}
      {unlocked ? (
        <a
          href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl border border-primary/40 bg-primary/5 p-5 transition hover:border-primary"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Falar com o suporte (WhatsApp direto)</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Atendimento humano 1:1 para quem tentou e não conseguiu sozinho.
            </p>
          </div>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Abrir chat</span>
        </a>
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-5 opacity-90">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Suporte direto via WhatsApp</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tente primeiro pelo tutorial e pela comunidade — a maioria resolve em poucos minutos.
              Se ainda assim não der certo, este botão libera automaticamente em{" "}
              <strong className="text-foreground">
                {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
              </strong>
              .
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Clock className="h-3 w-3" /> {UNLOCK_MINUTES} min
          </span>
        </div>
      )}
    </div>
  );
}
