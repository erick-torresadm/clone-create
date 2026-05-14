import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FREE_TIER_BYTES = 500 * 1024 * 1024; // 500 MB Supabase free plan
const STORAGE_FREE_BYTES = 1024 * 1024 * 1024; // 1 GB

export const getPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // verify admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden");

    // DB size
    const { data: dbRow, error: dbErr } = await supabaseAdmin.rpc("pg_db_size" as any).single();
    let dbBytes = 0;
    if (!dbErr && dbRow && typeof (dbRow as any).size === "number") {
      dbBytes = Number((dbRow as any).size);
    } else {
      // Fallback: query via SQL using a temp function isn't possible; estimate via object counts
      const tables = ["orders", "products", "product_stock", "profiles", "popups", "coupons"];
      let total = 0;
      for (const t of tables) {
        const { count } = await supabaseAdmin.from(t).select("*", { head: true, count: "exact" });
        total += (count ?? 0) * 512; // rough estimate
      }
      dbBytes = total;
    }

    // Storage size: list all buckets and sum
    let storageBytes = 0;
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      for (const b of buckets ?? []) {
        const { data: files } = await supabaseAdmin.storage.from(b.id).list("", { limit: 1000 });
        for (const f of files ?? []) {
          storageBytes += (f.metadata as any)?.size ?? 0;
        }
      }
    } catch {}

    return {
      db: { used: dbBytes, limit: FREE_TIER_BYTES },
      storage: { used: storageBytes, limit: STORAGE_FREE_BYTES },
    };
  });
