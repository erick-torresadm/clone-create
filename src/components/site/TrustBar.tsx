import { ShieldCheck, Zap, Headphones, Lock } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, label: "Garantia de 7 dias" },
  { icon: Zap, label: "Entrega automática" },
  { icon: Headphones, label: "Suporte 24/7" },
  { icon: Lock, label: "Pagamento 100% seguro" },
];

export function TrustBar() {
  return (
    <div className="relative z-20 border-b border-primary/15 bg-card/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 overflow-x-auto px-4 py-2 sm:gap-8 sm:px-6">
        {ITEMS.map((it) => (
          <div
            key={it.label}
            className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:text-xs"
          >
            <it.icon className="h-3.5 w-3.5 text-emerald-400" />
            <span className="whitespace-nowrap">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
