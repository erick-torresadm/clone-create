import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

type Row = {
  id: string;
  credits: number;
  cycles: number;
  cycles_completed: number;
  daily_cycles_completed: number;
  last_cycle_date: string | null;
  status: string;
};

export function CreditProgressCard({ purchaseId }: { purchaseId: string }) {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetchRow = async () => {
      const { data } = await supabase
        .from("credit_purchases")
        .select("id, credits, cycles, cycles_completed, daily_cycles_completed, last_cycle_date, status")
        .eq("id", purchaseId)
        .maybeSingle();
      if (alive && data) {
        setRow(data as Row);
        setLoading(false);
      }
    };
    fetchRow();

    const channel = supabase
      .channel(`credit-progress-${purchaseId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "credit_purchases", filter: `id=eq.${purchaseId}` },
        (payload) => {
          if (alive && payload.new) setRow(payload.new as Row);
        },
      )
      .subscribe();

    // Fallback polling a cada 8s caso o realtime falhe
    const poll = setInterval(fetchRow, 8000);

    return () => {
      alive = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [purchaseId]);

  if (loading || !row) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando progresso…
        </div>
      </div>
    );
  }

  const perCycle = row.cycles > 0 ? Math.round(row.credits / row.cycles) : 20;
  const applied = Math.min(row.credits, row.cycles_completed * perCycle);
  const pct = row.credits > 0 ? Math.min(100, (applied / row.credits) * 100) : 0;
  const done = row.status === "done";

  return (
    <div
      className={`mt-6 rounded-2xl border p-6 ${
        done ? "border-emerald-500/40 bg-emerald-500/5" : "border-primary/30 bg-primary/5"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Sparkles className="h-5 w-5 animate-pulse text-primary" />
          )}
          <h3 className="text-base font-bold text-foreground">
            {done ? "Créditos aplicados com sucesso" : "Aplicando créditos…"}
          </h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            done ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
          }`}
        >
          {done ? "Concluído" : row.status === "paid" ? "Em andamento" : "Aguardando"}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-foreground">
            {applied} <span className="text-sm font-medium text-muted-foreground">/ {row.credits} créditos</span>
          </span>
          <span className="text-sm font-semibold text-muted-foreground">{Math.round(pct)}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              done ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-primary/70"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Ciclos</div>
          <div className="mt-1 font-bold text-foreground">
            {row.cycles_completed} / {row.cycles}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background/50 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Hoje</div>
          <div className="mt-1 font-bold text-foreground">{row.daily_cycles_completed} ciclos</div>
        </div>
      </div>

      {!done && (
        <p className="mt-4 text-xs text-muted-foreground">
          Esta tela atualiza em tempo real. Você pode deixar aberta ou voltar depois — o progresso fica salvo.
        </p>
      )}
    </div>
  );
}
