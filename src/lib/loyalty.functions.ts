import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Regras de fidelidade — bônus capados em 15%.
export type LoyaltyTier = "bronze" | "prata" | "ouro" | "diamante";

export const TIERS: Array<{ tier: LoyaltyTier; min: number; bonus: number; label: string }> = [
  { tier: "bronze",   min: 0,   bonus: 0,  label: "Bronze" },
  { tier: "prata",    min: 100, bonus: 5,  label: "Prata" },
  { tier: "ouro",     min: 300, bonus: 10, label: "Ouro" },
  { tier: "diamante", min: 700, bonus: 15, label: "Diamante" },
];

// Bônus por sequência de recompra (ANTES da compra).
export function sequenceBonusPercent(purchaseSequence: number): number {
  if (purchaseSequence <= 1) return 0;
  if (purchaseSequence === 2) return 5;
  if (purchaseSequence === 3) return 10;
  return 15; // 4+ compras — cap
}

export function tierFor(totalSpent: number) {
  let current = TIERS[0];
  for (const t of TIERS) if (totalSpent >= t.min) current = t;
  const next = TIERS.find((t) => t.min > totalSpent) ?? null;
  return {
    tier: current.tier,
    label: current.label,
    bonusPercent: current.bonus,
    nextLabel: next?.label ?? null,
    nextMin: next?.min ?? null,
    deltaToNext: next ? Math.max(0, next.min - totalSpent) : 0,
  };
}

// Bônus efetivo aplicado: o maior entre sequência e tier, capado em 15%.
export function effectiveBonusPercent(purchaseSequence: number, totalSpent: number) {
  const a = sequenceBonusPercent(purchaseSequence);
  const b = tierFor(totalSpent).bonusPercent;
  return Math.min(15, Math.max(a, b));
}

const schema = z.object({ email: z.string().email().max(160) });

export const getCustomerLoyaltyInfo = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const { data: rows } = await (supabaseAdmin as any)
      .from("credit_purchases")
      .select("price_brl,paid_at,status,cashback_generated,cashback_applied,cashback_expires_at")
      .eq("buyer_email", email)
      .in("status", ["paid", "done"]);
    const list = (rows ?? []) as any[];
    const purchaseCount = list.length;
    const totalSpent = list.reduce((s, r) => s + Number(r.price_brl || 0), 0);

    // Cashback disponível = soma de cashback_generated - cashback_applied (de TODAS), das não expiradas
    const nowMs = Date.now();
    let cashbackBalance = 0;
    let cashbackExpiresAt: string | null = null;
    for (const r of list) {
      const exp = r.cashback_expires_at ? new Date(r.cashback_expires_at).getTime() : 0;
      const generated = Number(r.cashback_generated || 0);
      if (!generated) continue;
      if (exp && exp < nowMs) continue;
      cashbackBalance += generated;
      // pega a expiração mais próxima
      if (exp && (!cashbackExpiresAt || exp < new Date(cashbackExpiresAt).getTime())) {
        cashbackExpiresAt = r.cashback_expires_at;
      }
    }
    // subtrai o que já foi aplicado em compras subsequentes
    const applied = list.reduce((s, r) => s + Number(r.cashback_applied || 0), 0);
    cashbackBalance = Math.max(0, cashbackBalance - applied);

    const nextSequence = purchaseCount + 1;
    const tierInfo = tierFor(totalSpent);
    const bonusPercent = effectiveBonusPercent(nextSequence, totalSpent);

    return {
      purchaseCount,
      nextSequence,
      totalSpent,
      bonusPercent,
      tier: tierInfo,
      cashbackBalance,
      cashbackExpiresAt,
    };
  });
