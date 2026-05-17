import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Crown } from "lucide-react";
import { getCustomerLoyaltyInfo } from "@/lib/loyalty.functions";

export function RepeatBonusBanner({ email }: { email: string }) {
  const fn = useServerFn(getCustomerLoyaltyInfo);
  const [info, setInfo] = useState<Awaited<ReturnType<typeof fn>> | null>(null);
  const trimmed = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  useEffect(() => {
    if (!emailValid) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fn({ data: { email: trimmed } });
        if (!cancelled) setInfo(r);
      } catch {}
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmed, emailValid, fn]);

  if (!info) return null;

  const { purchaseCount, bonusPercent, nextSequence, cashbackBalance } = info;

  if (purchaseCount === 0) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-foreground">🎁 Primeira compra? Ótima escolha.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A partir da 2ª compra você começa a ganhar <strong>créditos bônus</strong> e
            <strong> cashback</strong> de 5% para usar na próxima recarga.
          </p>
        </div>
      </div>
    );
  }

  const isTopTier = bonusPercent >= 15;

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border p-4 ${
        isTopTier
          ? "border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-pink-500/10"
          : "border-emerald-500/30 bg-emerald-500/5"
      }`}
    >
      {isTopTier ? (
        <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
      ) : (
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
      )}
      <div className="flex-1 text-sm">
        <p className="font-semibold text-foreground">
          {isTopTier
            ? `👑 Cliente Top — +${bonusPercent}% de créditos bônus nesta recarga`
            : `🎁 Esta é sua ${nextSequence}ª compra — +${bonusPercent}% de créditos bônus`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          O bônus é aplicado automaticamente quando o pagamento for confirmado.
          {cashbackBalance > 0 && (
            <>
              {" "}Você também tem <strong>R$ {cashbackBalance.toFixed(2).replace(".", ",")}</strong> de cashback disponível.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
