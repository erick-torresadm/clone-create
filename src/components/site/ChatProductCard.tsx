import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/use-cart";
import { ShoppingCart, ExternalLink, Loader2 } from "lucide-react";

export function parseChatMedia(body: string):
  | { kind: "image"; url: string }
  | { kind: "audio"; url: string }
  | { kind: "gif"; url: string }
  | { kind: "product"; id: string }
  | null {
  const img = body.match(/^\[img\](https?:\/\/\S+)$/);
  if (img) return { kind: "image", url: img[1] };
  const aud = body.match(/^\[audio\](https?:\/\/\S+)$/);
  if (aud) return { kind: "audio", url: aud[1] };
  const gif = body.match(/^\[gif\](https?:\/\/\S+)$/);
  if (gif) return { kind: "gif", url: gif[1] };
  const prod = body.match(/^\[product\]([0-9a-fA-F-]{36})$/);
  if (prod) return { kind: "product", id: prod[1] };
  return null;
}

export function ChatProductCard({ id, dark }: { id: string; dark?: boolean }) {
  const navigate = useNavigate();
  const { add, openDrawer } = useCart();
  const q = useQuery({
    queryKey: ["chat-product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, slug, min_quantity")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; price: number; image_url: string | null; slug: string | null; min_quantity: number } | null;
    },
    staleTime: 60_000,
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs opacity-80">
        <Loader2 className="h-3 w-3 animate-spin" /> Carregando produto…
      </div>
    );
  }
  if (!q.data) return <div className="text-xs italic opacity-80">Produto indisponível</div>;
  const p = q.data;

  const buyNow = () => {
    add({ id: p.id, name: p.name, price: Number(p.price), image: p.image_url ?? null }, p.min_quantity || 1);
    openDrawer();
    navigate({ to: "/carrinho" });
  };

  return (
    <div className={`flex w-[15rem] max-w-full flex-col gap-2 rounded-xl border p-2 ${dark ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-border bg-background/60"}`}>
      <div className="flex items-center gap-2">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
          {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-bold leading-tight">{p.name}</div>
          <div className="text-[11px] font-extrabold opacity-90">
            {Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
      </div>
      <div className="flex gap-1.5">
        <Link
          to="/produto/$id"
          params={{ id: p.id }}
          className={`inline-flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition ${dark ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" : "border-border text-foreground hover:border-primary/50"}`}
        >
          <ExternalLink className="h-3 w-3" /> Ver
        </Link>
        <button
          onClick={buyNow}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-500 px-2 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-600"
        >
          <ShoppingCart className="h-3 w-3" /> Comprar
        </button>
      </div>
    </div>
  );
}
