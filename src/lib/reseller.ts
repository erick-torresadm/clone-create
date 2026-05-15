import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import type { DBProduct, DBSettings } from "@/lib/site-data";

export type ResellerStatus = {
  isReseller: boolean;
  discountPct: number;
  status: "none" | "pending" | "approved" | "rejected";
  request: {
    whatsapp: string | null;
    telegram: string | null;
    reason: string | null;
    admin_note: string | null;
    created_at: string;
  } | null;
};

export function useResellerStatus(): {
  data: ResellerStatus;
  isLoading: boolean;
  refetch: () => void;
} {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["reseller-status", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<ResellerStatus> => {
      const { data, error } = await supabase
        .from("reseller_accounts")
        .select("status, discount_pct, whatsapp, telegram, reason, admin_note, created_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { isReseller: false, discountPct: 0, status: "none", request: null };
      const status = data.status as "pending" | "approved" | "rejected";
      return {
        isReseller: status === "approved",
        discountPct: status === "approved" ? Number(data.discount_pct ?? 50) : 0,
        status,
        request: {
          whatsapp: data.whatsapp,
          telegram: data.telegram,
          reason: data.reason,
          admin_note: data.admin_note,
          created_at: data.created_at,
        },
      };
    },
  });
  return {
    data: q.data ?? { isReseller: false, discountPct: 0, status: "none", request: null },
    isLoading: q.isLoading,
    refetch: () => q.refetch(),
  };
}

/**
 * Preço de revendedor:
 * - Produto via API com external_price: usa o CUSTO real (external_price * câmbio)
 *   acrescido de uma margem definida por `discountPct` (ex.: 50 → custo * 1.5).
 *   Ignora completamente o preço de cliente final — o revendedor paga baseado no custo.
 * - Produto manual (sem custo de API): aplica desconto `discountPct` sobre o preço público.
 *
 * Nunca expomos o custo no front; só o resultado final do cálculo.
 */
export function resellerPriceFor(
  p: Pick<DBProduct, "price" | "source" | "external_price" | "external_currency">,
  settings: Pick<DBSettings, "brl_per_usd" | "brl_per_vnd"> | null | undefined,
  discountPct: number,
): number {
  if (!discountPct || discountPct <= 0) return Number(p.price);
  const base = Number(p.price);

  // API: preço = custo * câmbio * (1 + margem%)
  if (p.source && p.source !== "manual" && p.external_price && settings) {
    const cur = (p.external_currency || "USD").toUpperCase();
    const rate =
      cur === "VND" ? Number(settings.brl_per_vnd)
      : cur === "USD" ? Number(settings.brl_per_usd)
      : cur === "BRL" ? 1
      : 0;
    if (rate > 0) {
      const marginMult = 1 + discountPct / 100;
      const costPrice = Number(p.external_price) * rate * marginMult;
      // Nunca cobrar acima do preço público (senão deixa de ser vantagem).
      return round2(Math.min(costPrice, base));
    }
  }

  // Manual: desconto sobre o preço público
  return round2(base * (1 - discountPct / 100));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
