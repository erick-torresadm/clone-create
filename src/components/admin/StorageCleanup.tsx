import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { previewCleanup, runCleanup } from "@/lib/admin.functions";
import { Trash2, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Counts = Record<string, number>;

const LABELS: Record<string, string> = {
  abandonedPending: "Pedidos pendentes abandonados",
  oldOrders: "Pedidos antigos finalizados",
  closedSupport: "Conversas de suporte encerradas",
  deliveredStock: "Estoque já entregue",
  oldBroadcasts: "Broadcasts antigos",
};

export function StorageCleanup({ dbPct }: { dbPct: number }) {
  const preview = useServerFn(previewCleanup);
  const run = useServerFn(runCleanup);
  const qc = useQueryClient();

  const [opts, setOpts] = useState({
    ordersDays: 180,
    abandonedPendingDays: 7,
    closedSupportDays: 60,
    deliveredStockDays: 90,
    broadcastsDays: 90,
  });
  const [counts, setCounts] = useState<Counts | null>(null);

  const previewMut = useMutation({
    mutationFn: () => preview({ data: opts }),
    onSuccess: (r: any) => setCounts(r.counts),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao calcular"),
  });

  const runMut = useMutation({
    mutationFn: () => run({ data: opts }),
    onSuccess: (r: any) => {
      const total = Object.values(r.counts as Counts).reduce((a, b) => a + b, 0);
      toast.success(`${total} registros apagados. Espaço liberado!`);
      setCounts(null);
      qc.invalidateQueries({ queryKey: ["admin", "platform-stats"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao limpar"),
  });

  const totalToDelete = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const danger = dbPct > 80;

  return (
    <div className={`mt-6 rounded-2xl border p-5 ${danger ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            {danger ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Sparkles className="h-4 w-4 text-primary" />}
            Limpeza de espaço — manter no plano grátis
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {danger
              ? `Banco em ${dbPct.toFixed(1)}% — recomendado limpar agora para evitar cobrança.`
              : "Apaga registros antigos para liberar espaço no banco. Ajuste os períodos abaixo."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { k: "abandonedPendingDays", label: "Pendentes > X dias", val: opts.abandonedPendingDays },
          { k: "ordersDays", label: "Pedidos finalizados > X dias", val: opts.ordersDays },
          { k: "closedSupportDays", label: "Suporte fechado > X dias", val: opts.closedSupportDays },
          { k: "deliveredStockDays", label: "Estoque entregue > X dias", val: opts.deliveredStockDays },
          { k: "broadcastsDays", label: "Broadcasts > X dias", val: opts.broadcastsDays },
        ].map((f) => (
          <label key={f.k} className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{f.label}</span>
            <input
              type="number"
              min={0}
              value={f.val}
              onChange={(e) => setOpts((o) => ({ ...o, [f.k]: Math.max(0, Number(e.target.value || 0)) }))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">Use 0 em qualquer campo para pular essa categoria.</p>

      {counts && (
        <div className="mt-4 rounded-xl border border-border bg-background p-4">
          <div className="text-xs font-bold text-foreground">Será apagado:</div>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(counts).map(([k, v]) => (
              <li key={k} className="flex justify-between text-muted-foreground">
                <span>{LABELS[k] ?? k}</span>
                <span className="font-bold text-foreground">{v}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-border pt-1 text-sm font-bold text-foreground">
              <span>Total</span>
              <span>{totalToDelete}</span>
            </li>
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => previewMut.mutate()}
          disabled={previewMut.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/50"
        >
          {previewMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Calcular o que pode ser apagado
        </button>
        <button
          onClick={() => {
            if (!counts) return toast.info("Calcule a prévia primeiro");
            if (totalToDelete === 0) return toast.info("Nada a apagar");
            if (!confirm(`Apagar ${totalToDelete} registros? Esta ação é permanente.`)) return;
            runMut.mutate();
          }}
          disabled={runMut.isPending || !counts || totalToDelete === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
        >
          {runMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Apagar agora
        </button>
      </div>
    </div>
  );
}
