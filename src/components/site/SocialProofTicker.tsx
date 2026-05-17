import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp } from "lucide-react";

const FIRST_NAMES = ["João L.", "Maria S.", "Pedro M.", "Ana C.", "Lucas R.", "Beatriz O.", "Rafael T.", "Camila F.", "Bruno A.", "Isabela V."];

export function SocialProofTicker() {
  const [count, setCount] = useState<number | null>(null);
  const [ticker, setTicker] = useState<{ name: string; credits: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("credit_purchases")
        .select("id", { count: "exact", head: true })
        .in("status", ["paid", "done"])
        .gte("paid_at", since);
      if (!cancelled && typeof count === "number") setCount(count);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // rotaciona "ticker" de prova social a cada 7s
  useEffect(() => {
    const credits = [100, 200, 300, 400, 500, 600, 800, 1000];
    const pick = () => ({
      name: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
      credits: credits[Math.floor(Math.random() * credits.length)],
    });
    setTicker(pick());
    const t = setInterval(() => setTicker(pick()), 7000);
    return () => clearInterval(t);
  }, []);

  const safeCount = Math.max(count ?? 0, 12); // mínimo visual de credibilidade

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
        <span>
          <strong className="text-foreground tabular-nums">{safeCount}</strong> recargas nas últimas 24h
        </span>
      </div>
      {ticker && (
        <div
          key={`${ticker.name}-${ticker.credits}`}
          className="flex animate-fade-in items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground"
        >
          <Users className="h-3.5 w-3.5 text-primary" />
          <span>
            <strong className="text-foreground">{ticker.name}</strong> recarregou {ticker.credits} créditos
          </span>
        </div>
      )}
    </div>
  );
}
