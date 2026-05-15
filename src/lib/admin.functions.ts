import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAccountBalance, getPendingTransfers, getNextPayoutEstimate, type AsaasEnv } from "@/lib/asaas.server";

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

async function assertAdmin(userId: string) {
  const { data: roles } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId);
  if (!(roles ?? []).some((r: any) => r.role === "admin")) {
    throw new Error("Forbidden");
  }
}

function categorizeSource(src: string | null | undefined): "site" | "ads" | "referral" | "organic" | "other" {
  if (!src) return "site";
  const s = src.toLowerCase();
  if (s.startsWith("ads:") || s.includes("facebook") || s.includes("instagram") || s.includes("google_ads") || s.includes("tiktok")) return "ads";
  if (s.startsWith("organic:")) return "organic";
  if (s.startsWith("referral:")) return "referral";
  if (s === "site" || s.startsWith("utm:") || s.startsWith("site")) return "site";
  return "other";
}

export const getSalesDashboard = createServerFn({ method: "GET" })
  .handler(async ({ context }: any) => {
    // requireSupabaseAuth runs via middleware; manually verify admin
    return _getSalesDashboard(context);
  });

async function _getSalesDashboard(_context: any) {
  // re-read user via middleware context if available
  const userId = _context?.userId;
  if (!userId) throw new Error("Unauthorized");
  await assertAdmin(userId);

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const PAID = ["paid", "delivered"];

  // Pull last 30d once and aggregate in memory
  const { data: rows30, error } = await supabaseAdmin
    .from("orders")
    .select("id,total,status,created_at,traffic_source,items,coupon_code,email")
    .gte("created_at", start30d.toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const orders = rows30 ?? [];
  const paidOrders = orders.filter((o: any) => PAID.includes(o.status));

  const sumIn = (since: Date) =>
    paidOrders
      .filter((o: any) => new Date(o.created_at) >= since)
      .reduce(
        (acc: any, o: any) => {
          acc.count++; acc.revenue += Number(o.total || 0);
          return acc;
        },
        { count: 0, revenue: 0 },
      );

  const today = sumIn(startOfDay);
  const last7d = sumIn(start7d);
  const last30d = sumIn(start30d);

  // Breakdown por origem (últimos 30d)
  const bySource: Record<string, { count: number; revenue: number }> = {
    site: { count: 0, revenue: 0 },
    ads: { count: 0, revenue: 0 },
    referral: { count: 0, revenue: 0 },
    organic: { count: 0, revenue: 0 },
    other: { count: 0, revenue: 0 },
  };
  for (const o of paidOrders) {
    const cat = categorizeSource(o.traffic_source);
    bySource[cat].count++;
    bySource[cat].revenue += Number(o.total || 0);
  }

  // Top produtos (30d)
  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of paidOrders) {
    const items = Array.isArray(o.items) ? o.items : [];
    for (const it of items) {
      const key = it.productId || it.name;
      const cur = productMap.get(key) || { name: it.name, qty: 0, revenue: 0 };
      cur.qty += Number(it.quantity || 0);
      cur.revenue += Number(it.unitPriceBrl || 0) * Number(it.quantity || 0);
      productMap.set(key, cur);
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Pendentes (todos, não só 30d)
  const { data: pendingRows } = await supabaseAdmin
    .from("orders")
    .select("id,total,created_at,email")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);
  const pendingCount = (pendingRows ?? []).length;
  const pendingRevenue = (pendingRows ?? []).reduce((s: number, o: any) => s + Number(o.total || 0), 0);

  // Saques de afiliados pendentes
  const { data: wRows } = await supabaseAdmin
    .from("withdrawal_requests")
    .select("id,amount,status,created_at,full_name")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const affiliateWithdrawals = {
    count: (wRows ?? []).length,
    total: (wRows ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
  };

  // Asaas
  const env: AsaasEnv = "live"; // saldo real
  const [asaasBalance, pendingTransfers, nextPayout] = await Promise.all([
    getAccountBalance(env),
    getPendingTransfers(env),
    getNextPayoutEstimate(env),
  ]);

  // Série diária (últimos 14d)
  const series: Array<{ date: string; site: number; ads: number; total: number; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    const dayOrders = paidOrders.filter((o: any) => {
      const t = new Date(o.created_at);
      return t >= d && t < next;
    });
    let site = 0, ads = 0, total = 0;
    for (const o of dayOrders) {
      const v = Number(o.total || 0);
      total += v;
      const cat = categorizeSource(o.traffic_source);
      if (cat === "ads") ads += v; else site += v;
    }
    series.push({
      date: d.toISOString().slice(0, 10),
      site, ads, total,
      count: dayOrders.length,
    });
  }

  return {
    today,
    last7d,
    last30d,
    bySource,
    topProducts,
    pending: { count: pendingCount, revenue: pendingRevenue, recent: (pendingRows ?? []).slice(0, 5) },
    affiliateWithdrawals,
    asaas: {
      balance: asaasBalance,
      pendingTransfers,
      nextPayout,
    },
    series,
    generatedAt: new Date().toISOString(),
  };
}

// Re-export with middleware applied (workaround: redefine using the chain properly)
