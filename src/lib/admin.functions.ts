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

    // DB size via SECURITY DEFINER function
    let dbBytes = 0;
    try {
      const { data: dbRow } = await (supabaseAdmin as any).rpc("get_db_size");
      if (typeof dbRow === "number") dbBytes = dbRow;
      else if (typeof dbRow === "string") dbBytes = Number(dbRow) || 0;
    } catch {}

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
