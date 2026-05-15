import { useEffect, useState } from "react";
import { Eye, Users, Clock, TrendingUp } from "lucide-react";

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Simulated live activity based on a stable seed (productId/orderId) */
export function ScarcityPanel({ seed, compact = false }: { seed: string; compact?: boolean }) {
  const base = hashSeed(seed);
  const [viewers, setViewers] = useState(8 + (base % 22)); // 8 - 29
  const [buyers, setBuyers] = useState(2 + (base % 6)); // 2 - 7
  const [recent] = useState(3 + (base % 12)); // 3 - 14 nas últimas 24h

  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => Math.max(5, Math.min(40, v + (Math.random() > 0.5 ? 1 : -1))));
      if (Math.random() > 0.7) setBuyers((b) => Math.max(1, Math.min(9, b + (Math.random() > 0.5 ? 1 : -1))));
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const items = [
    { icon: <Eye className="h-3.5 w-3.5" />, label: `${viewers} pessoas vendo agora`, tone: "primary" as const },
    { icon: <Users className="h-3.5 w-3.5" />, label: `${buyers} comprando neste momento`, tone: "destructive" as const },
    { icon: <TrendingUp className="h-3.5 w-3.5" />, label: `${recent} vendas nas últimas 24h`, tone: "emerald" as const },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span
            key={it.label}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              it.tone === "primary"
                ? "border-primary/30 bg-primary/10 text-primary"
                : it.tone === "destructive"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {it.tone === "destructive" && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
              </span>
            )}
            {it.icon}
            {it.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Clock className="h-3.5 w-3.5 text-primary" /> Atividade ao vivo
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs font-semibold text-foreground"
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-full ${
                it.tone === "primary"
                  ? "bg-primary/15 text-primary"
                  : it.tone === "destructive"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-emerald-500/15 text-emerald-400"
              }`}
            >
              {it.icon}
            </span>
            {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}
