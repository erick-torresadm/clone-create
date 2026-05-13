import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE = "https://maxvia88.com/api/v1";

export const Route = createFileRoute("/api/public/sync-maxvia-stock")({
  server: {
    handlers: {
      POST: async () => {
        const { data: products, error } = await supabaseAdmin
          .from("products")
          .select("id, external_id, external_provider, auto_sync, section_id")
          .eq("source", "api")
          .eq("external_provider", "maxvia")
          .eq("auto_sync", true);

        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        if (!products?.length) return Response.json({ ok: true, updated: 0 });

        // Build a map of category->products fetched (cache by category to reduce calls)
        // We don't know category, so fetch all categories' products until found.
        const cats = await fetch(`${BASE}/categories`).then((r) => r.json()).catch(() => ({ data: [] }));
        const byExt = new Map<string, { quantity: number; price: number }>();
        for (const c of cats?.data ?? []) {
          const r = await fetch(`${BASE}/category/${c.id}`).then((x) => x.json()).catch(() => null);
          for (const p of r?.data ?? []) {
            byExt.set(String(p.id_product), { quantity: p.quantity, price: p.price });
          }
        }

        let updated = 0;
        for (const p of products) {
          const live = byExt.get(String(p.external_id));
          if (!live) continue;
          await supabaseAdmin
            .from("products")
            .update({
              external_quantity: live.quantity,
              external_price: live.price,
              active: live.quantity > 0,
            })
            .eq("id", p.id);
          updated++;
        }
        return Response.json({ ok: true, updated, totalLive: byExt.size });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to sync" }),
    },
  },
});
