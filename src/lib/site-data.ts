import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DBProduct = {
  id: string;
  name: string;
  slug: string | null;
  section_id: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  badge: string | null;
  description: string | null;
  sold: number;
  rating: number | null;
  reviews: number;
  active: boolean;
  sort_order: number;
  source?: string;
  external_provider?: string | null;
  external_id?: string | null;
  external_price?: number | null;
  external_currency?: string | null;
  external_quantity?: number | null;
  tags?: string[] | null;
};
export type DBSection = { id: string; title: string; emoji: string | null; sort_order: number; active: boolean };
export type DBCoupon = { id: string; code: string; discount_type: "percent" | "fixed"; value: number; min_order: number; max_uses: number | null; used_count: number; expires_at: string | null; active: boolean };
export type DBPopup = { id: string; title: string; body: string | null; image_url: string | null; cta_label: string | null; cta_url: string | null; audience: string; active: boolean; starts_at: string | null; ends_at: string | null };
export type DBSettings = { id: number; store_name: string; hero_title: string; hero_subtitle: string; announcement_bar: string | null; primary_color: string; accent_color: string; logo_url: string | null; whatsapp: string | null; telegram: string | null; brl_per_vnd: number; brl_per_usd: number; home_max_products: number; home_show_categories: boolean; home_show_all_products: boolean; home_grid_cols: number; welcome_coupon_enabled: boolean; welcome_coupon_text: string; welcome_coupon_code: string; sounds_enabled: boolean; meta_pixel_id: string | null };

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("sort_order");
      if (error) throw error;
      return data as DBProduct[];
    },
  });
}
export function useSections() {
  return useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("*").order("sort_order");
      if (error) throw error;
      return data as DBSection[];
    },
  });
}
export function useCoupons() {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as DBCoupon[];
    },
  });
}
export function usePopups() {
  return useQuery({
    queryKey: ["popups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("popups").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as DBPopup[];
    },
  });
}
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as DBSettings | null;
    },
  });
}

export function formatBRL(v: number) {
  return Number(v).toFixed(2).replace(".", ",");
}
export function discount(oldP: number | null, p: number) {
  if (!oldP || oldP <= p) return 0;
  return Math.round(((oldP - p) / oldP) * 100);
}

// ---- DB → UI catalog adapter ----
import type { Product, Section } from "@/lib/products";

const DEFAULT_DESC = `Entrega 100% automática após confirmação do pagamento.

✅ Produto original e garantido
✅ Suporte 24/7 via Telegram
✅ Reposição em caso de problema nas primeiras 24h
✅ Tutorial completo de uso

Após o pagamento via Pix, o acesso é enviado em poucos minutos.`;

function dbToProduct(
  p: DBProduct,
  manualStock: number | undefined,
  resellerPrice: number | null,
  stockLoaded: boolean = true,
): Product {
  const isExternal = !!p.source && p.source !== "manual";
  const publicPrice = Number(p.price);
  const finalPrice = resellerPrice ?? publicPrice;
  // Quando revendedor: o preço público vira o "old price" riscado
  const oldPrice = resellerPrice != null
    ? publicPrice
    : Number(p.old_price ?? p.price);
  // Estoque: para externos vem do DB; para manuais depende do RPC.
  // Enquanto o RPC ainda não carregou, deixamos `undefined` para não exibir
  // "Esgotado" indevidamente no card.
  const stockValue = isExternal
    ? (p.external_quantity ?? 0)
    : (stockLoaded ? (manualStock ?? 0) : undefined);
  return {
    id: p.id,
    name: p.name,
    price: finalPrice,
    oldPrice,
    sold: p.sold ?? undefined,
    description: p.description ?? DEFAULT_DESC,
    rating: p.rating ?? undefined,
    reviews: p.reviews ?? undefined,
    image: p.image_url ?? undefined,
    badge: p.badge ?? undefined,
    stock: stockValue,
    tags: p.tags ?? [],
    provider: p.external_provider ?? null,
    minQuantity: Math.max(1, Number((p as any).min_quantity ?? 1)),
  };
}

export function useStockCounts() {
  return useQuery({
    queryKey: ["stock-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_stock_counts");
      if (error) throw error;
      const map = new Map<string, number>();
      (data ?? []).forEach((r: any) => map.set(r.product_id, Number(r.available)));
      return map;
    },
  });
}

import { useResellerStatus, resellerPriceFor } from "@/lib/reseller";

export function useCatalog() {
  const products = useProducts();
  const sections = useSections();
  const stock = useStockCounts();
  const settings = useSettings();
  const reseller = useResellerStatus();

  const ready = !products.isLoading && !sections.isLoading;
  const dbProducts = (products.data ?? []).filter((p) => p.active);
  const dbSections = sections.data ?? [];
  const stockMap = stock.data ?? new Map<string, number>();

  const toProd = (p: DBProduct) => {
    const rp = reseller.data.isReseller
      ? resellerPriceFor(p, settings.data, reseller.data.discountPct)
      : null;
    return dbToProduct(p, stockMap.get(p.id), rp);
  };
  const allProducts: Product[] = dbProducts.map(toProd);

  const sectionsList: Section[] = dbSections
    .filter((s) => s.active)
    .map((s) => ({
      title: s.emoji ? `${s.emoji} ${s.title}` : s.title,
      products: dbProducts.filter((p) => p.section_id === s.id).map(toProd),
    }))
    .filter((s) => s.products.length > 0);

  const orphan = dbProducts.filter((p) => !p.section_id).map(toProd);
  if (orphan.length) sectionsList.push({ title: "Outros", products: orphan });

  return {
    isLoading: !ready,
    sections: sectionsList,
    allProducts,
    getProduct: (id: string) => allProducts.find((p) => p.id === id),
    isReseller: reseller.data.isReseller,
    resellerDiscount: reseller.data.discountPct,
  };
}
