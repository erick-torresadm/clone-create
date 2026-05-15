import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { useCoupons } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { broadcastCoupon } from "@/lib/telegram.functions";

export const Route = createFileRoute("/admin/cupons")({ component: AdminCupons });

function AdminCupons() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);
  if (!user || !isAdmin) return null;

  const { data: coupons = [] } = useCoupons();
  const qc = useQueryClient();
  const [f, setF] = useState({ code: "", discount_type: "percent", value: "", min_order: "0", max_uses: "", expires_at: "", notify: true });
  const broadcastFn = useServerFn(broadcastCoupon);

  const create = useMutation({
    mutationFn: async () => {
      if (!f.code || !f.value) throw new Error("Código e valor obrigatórios");
      const { data: inserted, error } = await supabase.from("coupons").insert({
        code: f.code.toUpperCase(),
        discount_type: f.discount_type as any,
        value: Number(f.value),
        min_order: Number(f.min_order || 0),
        max_uses: f.max_uses ? Number(f.max_uses) : null,
        expires_at: f.expires_at || null,
      }).select("id").single();
      if (error) throw error;
      if (f.notify && inserted?.id) {
        try {
          const r: any = await broadcastFn({ data: { couponId: inserted.id } });
          if (r?.skipped) toast.info("Aviso já enviado anteriormente");
          else if (r?.sent > 0) toast.success(`Cupom enviado para ${r.sent} inscrito(s) no Telegram`);
        } catch (e: any) {
          toast.warning(`Cupom criado, mas aviso falhou: ${e.message}`);
        }
      }
    },
    onSuccess: () => { toast.success("Cupom criado"); setF({ code: "", discount_type: "percent", value: "", min_order: "0", max_uses: "", expires_at: "", notify: true }); qc.invalidateQueries({ queryKey: ["coupons"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: any) => { const { error } = await supabase.from("coupons").update({ active }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("coupons").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Cupons</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,360px]">
          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-4 font-semibold text-foreground">Lista ({coupons.length})</div>
            <div className="divide-y divide-border">
              {coupons.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <p className="font-mono text-sm font-bold text-foreground">{c.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.discount_type === "percent" ? `${c.value}% off` : `R$ ${c.value} off`} · min R$ {c.min_order} · usado {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}
                    </p>
                  </div>
                  <Switch checked={c.active} onCheckedChange={(v) => toggle.mutate({ id: c.id, active: v })} />
                  <Button variant="ghost" size="icon" onClick={() => confirm("Remover?") && remove.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {!coupons.length && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum cupom.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Novo cupom</h2>
            <div><Label>Código</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="FDM20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label>
                <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={f.discount_type} onChange={(e) => setF({ ...f, discount_type: e.target.value })}>
                  <option value="percent">%</option><option value="fixed">R$</option>
                </select>
              </div>
              <div><Label>Valor</Label><Input type="number" step="0.01" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min. pedido</Label><Input type="number" step="0.01" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} /></div>
              <div><Label>Usos máx</Label><Input type="number" value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value })} /></div>
            </div>
            <div><Label>Expira em</Label><Input type="datetime-local" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></div>
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full"><Plus className="mr-2 h-4 w-4" />Criar</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
