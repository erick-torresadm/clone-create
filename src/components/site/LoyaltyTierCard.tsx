import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Trophy, Medal, Award, Gift } from "lucide-react";
import { getCustomerLoyaltyInfo } from "@/lib/loyalty.functions";

const ICONS = {
  bronze: Medal,
  prata: Award,
  ouro: Trophy,
  diamante: Crown,
} as const;

const COLORS = {
  bronze: "from-orange-600/20 to-amber-700/10 border-orange-500/30 text-orange-300",
  prata: "from-slate-400/20 to-slate-500/10 border-slate-400/30 text-slate-200",
  ouro: "from-amber-400/20 to-yellow-500/10 border-amber-400/40 text-amber-300",
  diamante: "from-cyan-400/20 to-purple-500/10 border-cyan-400/40 text-cyan-200",
} as const;

export function LoyaltyTierCard({ email }: { email: string }) {
  const fn = useServerFn(getCustomerLoyaltyInfo);
  const [info, setInfo] = useState<Awaited<ReturnType<typeof fn>> | null>(null);

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fn({ data: { email } });
        if (!cancelled) setInfo(r);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [email, fn]);

  if (!info || info.purchaseCount === 0) return null;

  const { tier, totalSpent, cashbackBalance, cashbackExpiresAt } = info;
  const Icon = ICONS[tier.tier];
  const color = COLORS[tier.tier];

  const progress = tier.nextMin
    ? Math.min(100, Math.round((totalSpent / tier.nextMin) * 100))
    : 100;

  return (
    <div className={`mt-6 rounded-2xl border bg-gradient-to-br p-5 ${color}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-background/30 p-2">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">Seu nível</p>
            <p className="text-xl font-extrabold">{tier.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-80">Total recarregado</p>
          <p className="text-lg font-bold tabular-nums">
            R$ {totalSpent.toFixed(2).replace(".", ",")}
          </p>
        </div>
      </div>

      {tier.bonusPercent > 0 && (
        <p className="mt-3 text-sm font-semibold">
          +{tier.bonusPercent}% de créditos bônus em toda recarga
        </p>
      )}

      {tier.nextLabel && tier.nextMin && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-90">Próximo: {tier.nextLabel}</span>
            <span className="font-semibold tabular-nums">
              Faltam R$ {tier.deltaToNext.toFixed(2).replace(".", ",")}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/30">
            <div
              className="h-full rounded-full bg-current transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {cashbackBalance > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-background/30 p-3">
          <Gift className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1 text-xs">
            <p className="font-semibold">
              R$ {cashbackBalance.toFixed(2).replace(".", ",")} em cashback disponível
            </p>
            {cashbackExpiresAt && (
              <p className="opacity-80">
                Expira em {new Date(cashbackExpiresAt).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
