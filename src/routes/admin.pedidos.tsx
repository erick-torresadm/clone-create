import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pedidos")({ component: AdminPedidos });

function AdminPedidos() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, user, isAdmin, navigate]);
  if (!user || !isAdmin) return null;

  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["all-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: any) => { const { error } = await supabase.from("orders").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["all-orders"] }); },
  });

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Pedidos</h1>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Data</th><th className="p-3">Cliente</th><th className="p-3">Total</th><th className="p-3">Cupom</th><th className="p-3">Status</th><th className="p-3">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id} className="text-foreground">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3">{o.email ?? "—"}</td>
                  <td className="p-3 font-semibold">R$ {Number(o.total).toFixed(2)}</td>
                  <td className="p-3 text-xs">{o.coupon_code ?? "—"}</td>
                  <td className="p-3"><span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{o.status}</span></td>
                  <td className="p-3">
                    <select className="rounded-md border border-border bg-background px-2 py-1 text-xs" value={o.status} onChange={(e) => setStatus.mutate({ id: o.id, status: e.target.value })}>
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                      <option value="delivered">delivered</option>
                      <option value="canceled">canceled</option>
                    </select>
                  </td>
                </tr>
              ))}
              {!orders.length && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">Nenhum pedido ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
