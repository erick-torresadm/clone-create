import { Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight } from "lucide-react";

export function GuaranteeStrip() {
  return (
    <section className="mt-16 sm:mt-20">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-primary/10 p-6 shadow-[0_20px_60px_-20px_rgba(16,185,129,0.35)] sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
        />

        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/30 sm:h-16 sm:w-16">
              <ShieldCheck className="h-7 w-7 text-emerald-400 sm:h-8 sm:w-8" />
            </div>
            <div>
              <span className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Garantia Ativosfy
              </span>
              <h3 className="mt-2 text-xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
                7 dias de garantia ou seu dinheiro de volta.
              </h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                Se o perfil não logar, fazemos a reposição imediata. Se não tivermos estoque,
                devolvemos 100% do valor no PIX em até 2 dias úteis. Sem letra miúda.
              </p>
            </div>
          </div>

          <Link
            to="/garantia"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Ler a política completa <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
