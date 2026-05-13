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
};
export type DBSection = { id: string; title: string; emoji: string | null; sort_order: number; active: boolean };
export type DBCoupon = { id: string; code: string; discount_type: "percent" | "fixed"; value: number; min_order: number; max_uses: number | null; used_count: number; expires_at: string | null; active: boolean };
export type DBPopup = { id: string; title: string; body: string | null; image_url: string | null; cta_label: string | null; cta_url: string | null; audience: string; active: boolean; starts_at: string | null; ends_at: string | null };
export type DBSettings = { id: number; store_name: string; hero_title: string; hero_subtitle: string; announcement_bar: string | null; primary_color: string; accent_color: string; logo_url: string | null; whatsapp: string | null; telegram: string | null };

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
