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
 * Calcula o preço para revendedor, sem expor o custo de fornecedor.
 * - Manual: price * (1 - discountPct/100)
 * - API com external_price: external_price * brl_per_usd * (1 + discountPct/100 invertido)
 *   → na prática, aplica também desconto sobre o preço público.
 *
 * Mantemos a fórmula consistente: o cliente sempre vê desconto de discountPct
 * sobre o preço público — assim não vaza nenhum dado do fornecedor.
 */
export function resellerPriceFor(
  p: Pick<DBProduct, "price" | "source" | "external_price">,
  settings: Pick<DBSettings, "brl_per_usd"> | null | undefined,
  discountPct: number,
): number {
  if (!discountPct || discountPct <= 0) return Number(p.price);
  const base = Number(p.price);
  // 50% de margem sobre o custo, quando faz sentido
  if (
    p.source && p.source !== "manual" &&
    p.external_price && settings?.brl_per_usd
  ) {
    const marginPrice = Number(p.external_price) * Number(settings.brl_per_usd) * 1.5;
    // pega o menor entre desconto sobre preço público e preço com margem,
    // garantindo que nunca cobramos abaixo do custo*1.5
    const publicDiscount = base * (1 - discountPct / 100);
    return round2(Math.max(publicDiscount, marginPrice));
  }
  return round2(base * (1 - discountPct / 100));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
