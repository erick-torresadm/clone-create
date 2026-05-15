import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ShoppingCart, ArrowRight, Trash2, Minus, Plus, Tag, ShieldCheck, Zap, Globe, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/use-cart";
import { useCatalog, formatBRL } from "@/lib/site-data";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Ativosfy" },
      { name: "description", content: "Revise os itens do seu carrinho." },
      { property: "og:title", content: "Carrinho — Ativosfy" },
      { property: "og:url", content: "/carrinho" },
    ],
    links: [{ rel: "canonical", href: "/carrinho" }],
  }),
  component: Carrinho,
});

function Carrinho() {
  const { items, subtotal, setQty, remove, add, clear } = useCart();
  const { allProducts: ALL_PRODUCTS } = useCatalog();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; type: "percent" | "fixed"; value: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try { const raw = sessionStorage.getItem("applied_coupon"); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (applied) sessionStorage.setItem("applied_coupon", JSON.stringify(applied));
    else sessionStorage.removeItem("applied_coupon");
  }, [applied]);

  const discount = useMemo(() => {
    if (!applied) return 0;
    if (applied.type === "percent") return (subtotal * applied.value) / 100;
    return Math.min(applied.value, subtotal);
  }, [applied, subtotal]);

  const total = Math.max(0, subtotal - discount);

  // Upsell: produtos não no carrinho, ordenados pelos mais vendidos
  const upsells = useMemo(() => {
    const ids = new Set(items.map((i) => i.id));
    return ALL_PRODUCTS.filter((p) => !ids.has(p.id))
      .sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))
      .slice(0, 4);
  }, [items]);

  // FastProxy upsell — só aparece se tem perfis ou BMs no carrinho
  const needsProxy = useMemo(() => {
    return items.some((it) => /perfil|perfis|\bbm\b|gerenciador|conta gerente/i.test(it.name));
  }, [items]);

  const applyCoupon = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return toast.error("Digite um cupom");
    const { data, error } = await supabase
      .from("coupons")
      .select("code,discount_type,value,min_order,max_uses,used_count,active,expires_at")
      .ilike("code", c)
      .maybeSingle();
    if (error || !data) return toast.error("Cupom inválido");
    if (!data.active) return toast.error("Cupom inativo");
    if (data.expires_at && new Date(data.expires_at) < new Date()) return toast.error("Cupom expirado");
    if (data.max_uses != null && data.used_count >= data.max_uses) return toast.error("Cupom esgotado");
    if (data.min_order && subtotal < Number(data.min_order))
      return toast.error(`Pedido mínimo R$ ${formatBRL(Number(data.min_order))} para usar ${c}`);
    const type = data.discount_type === "fixed" ? "fixed" : "percent";
    setApplied({ code: data.code, type, value: Number(data.value) });
    toast.success(`Cupom ${data.code} aplicado!`);
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card text-primary">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-foreground">Seu carrinho está vazio</h1>
          <p className="mt-2 text-muted-foreground">Explore o catálogo e adicione produtos para continuar.</p>
          <Link
            to="/produtos"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-10px_rgba(99,140,255,0.8)] transition hover:brightness-110"
          >
            Ver produtos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">Seu carrinho</h1>
        <p className="mt-1 text-sm text-muted-foreground">{items.length} {items.length === 1 ? "item" : "itens"}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Itens */}
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3 sm:p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary ring-1 ring-border">
                  {it.image ? (
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to="/produto/$id" params={{ id: it.id }} className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary">
                    {it.name}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">R$ {formatBRL(it.price)} cada</div>
                  <div className="mt-2 inline-flex items-center rounded-lg border border-border bg-background">
                    <button onClick={() => setQty(it.id, it.qty - 1)} className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground" aria-label="Diminuir">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground">{it.qty}</span>
                    <button onClick={() => setQty(it.id, it.qty + 1)} className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground" aria-label="Aumentar">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-base font-bold text-foreground">R$ {formatBRL(it.price * it.qty)}</div>
                  <button onClick={() => remove(it.id)} className="text-xs text-muted-foreground transition hover:text-destructive" aria-label="Remover">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* FastProxy — proteção de IP para perfis e BMs */}
            {needsProxy && (
              <a
                href="https://fastproxy.com.br"
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 sm:p-5 transition hover:border-emerald-500/60"
              >
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Recomendado
                      </span>
                      <h3 className="text-sm font-bold text-foreground">Proteja o IP da sua conta com FastProxy</h3>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Use proxies dedicados ao acessar perfis e BMs para evitar bloqueios e checkpoints. Cada conta com seu próprio IP, do mesmo país de origem.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:underline">
                      Comprar em fastproxy.com.br <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </a>
            )}

            {/* Upsell - aumenta ticket */}
            {upsells.length > 0 && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Leve junto e turbine seu pedido</h3>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {upsells.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary ring-1 ring-border">
                        {u.image ? <img src={u.image} alt={u.name} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-semibold text-foreground">{u.name}</div>
                        <div className="text-xs font-bold text-primary">R$ {formatBRL(u.price)}</div>
                      </div>
                      <button
                        onClick={() => add({ id: u.id, name: u.name, price: u.price, image: u.image })}
                        className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:brightness-110"
                        aria-label="Adicionar"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive">Esvaziar carrinho</button>
          </div>

          {/* Resumo */}
          <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-foreground">Resumo</h2>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
              <Tag className="ml-1 h-4 w-4 text-primary" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Cupom de desconto"
                className="flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button onClick={applyCoupon} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110">
                Aplicar
              </button>
            </div>
            {applied && (
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                <span>Cupom <b>{applied.code}</b> aplicado</span>
                <button onClick={() => setApplied(null)} className="text-muted-foreground hover:text-foreground">Remover</button>
              </div>
            )}

            <div className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>R$ {formatBRL(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Desconto</span><span>- R$ {formatBRL(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold text-foreground">
                <span>Total</span><span>R$ {formatBRL(total)}</span>
              </div>
              <div className="text-xs text-muted-foreground">à vista no Pix</div>
            </div>

            <button
              onClick={() => navigate({ to: "/checkout" })}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-[0_12px_30px_-10px_rgba(99,140,255,0.8)] transition hover:brightness-110"
            >
              Finalizar compra <ArrowRight className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Pagamento 100% seguro
            </div>

            <button onClick={() => navigate({ to: "/produtos" })} className="w-full text-xs text-muted-foreground hover:text-foreground">
              ← Continuar comprando
            </button>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
