import { useState } from "react";
import { PlayCircle, Maximize2, X, ChevronDown } from "lucide-react";

const YT_ID = "VN3t16oEjcI";
const EMBED_URL = `https://www.youtube.com/embed/${YT_ID}?rel=0&modestbranding=1`;

export function TutorialVideo({
  title = "Tutorial: como adicionar o bot na sua conta Lovable",
  subtitle = "Assista o vídeo (rápido) — é bem simples e você consegue fazer sozinho.",
  collapsed = false,
}: {
  title?: string;
  subtitle?: string;
  /** When true, renders a slim one-line toggle that expands to the video on click. */
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(!collapsed);

  const body = (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">{title}</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Ampliar
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={EMBED_URL}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <>
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-transparent px-4 py-3 text-left transition-colors hover:border-primary/50"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{title}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ) : (
          <div>
            {body}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="h-3.5 w-3.5 rotate-180" /> Ocultar vídeo
            </button>
          </div>
        )}

        {open && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <div
              className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`${EMBED_URL}&autoplay=1`}
                title={title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {body}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`${EMBED_URL}&autoplay=1`}
              title={title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
