import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Sparkles, Gift, Clock, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type Props = {
  credits: number;
  bonusCredits: number;
  purchaseSequence?: number | null;
  cashbackGenerated?: number;
  cashbackExpiresAt?: string | null;
};

export function PostPurchaseEuphoria({
  credits,
  bonusCredits,
  purchaseSequence,
  cashbackGenerated = 0,
  cashbackExpiresAt,
}: Props) {
  const total = credits + bonusCredits;
  const [count, setCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(24 * 60 * 60);

  // 🎉 Confete
  useEffect(() => {
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.6 },
        particleCount: Math.floor(180 * particleRatio),
        ...opts,
      });
    };
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.1 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  // 🔢 Contador animado
  useEffect(() => {
    const duration = 1400;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * total));
      if (p < 1) requestAnimationFrame(tick);
      else setCount(total);
    };
    requestAnimationFrame(tick);
  }, [total]);

  // ⏰ Countdown 24h
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = Math.floor(secondsLeft / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);

  const headline = (() => {
    if (purchaseSequence && purchaseSequence >= 5) return "👑 Cliente Top — recarga confirmada!";
    if (purchaseSequence && purchaseSequence >= 3) return `🔥 Sua ${purchaseSequence}ª recarga! Você está construindo de verdade.`;
    if (purchaseSequence === 2) return "🚀 Bem-vindo de volta! Sua 2ª recarga.";
    return "🎉 Bem-vindo! Sua primeira recarga.";
  })();

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-pink-500/10 to-purple-500/10 p-6 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
          <Sparkles className="h-3.5 w-3.5" />
          {headline}
        </div>
        <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
          Créditos liberados
        </p>
        <p className="mt-1 bg-gradient-to-r from-amber-300 via-pink-300 to-purple-300 bg-clip-text text-5xl font-extrabold text-transparent tabular-nums">
          +{count.toLocaleString("pt-BR")}
        </p>
        {bonusCredits > 0 && (
          <p className="mt-1 text-sm font-semibold text-emerald-400">
            🎁 inclui {bonusCredits.toLocaleString("pt-BR")} créditos bônus
          </p>
        )}
      </div>

      {cashbackGenerated > 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                Você ganhou R$ {cashbackGenerated.toFixed(2).replace(".", ",")} de cashback
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Use na próxima recarga
                {cashbackExpiresAt
                  ? ` antes de ${new Date(cashbackExpiresAt).toLocaleDateString("pt-BR")}.`
                  : "."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              Recarregue de novo em 24h e ganhe +10% de créditos bônus
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Oferta válida por <strong className="text-primary tabular-nums">{hours}h {mins.toString().padStart(2, "0")}m</strong>. Use o cupom <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary">RECOMPRA10</code> ou volte por aqui.
            </p>
            <Link to="/creditos-lovable" search={{ coupon: "RECOMPRA10" }}>
              <Button className="mt-3 rounded-full" size="sm">
                Recarregar com bônus
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
