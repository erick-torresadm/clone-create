import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { usePopups } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/popups")({ component: AdminPopups });

function AdminPopups() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);
  if (!user || !isAdmin) return null;

  const { data: popups = [] } = usePopups();
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", body: "", image_url: "", cta_label: "", cta_url: "", starts_at: "", ends_at: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!f.title) throw new Error("Título obrigatório");
      const { error } = await supabase.from("popups").insert({
        title: f.title, body: f.body || null, image_url: f.image_url || null,
        cta_label: f.cta_label || null, cta_url: f.cta_url || null,
        starts_at: f.starts_at || null, ends_at: f.ends_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Popup criado"); setF({ title: "", body: "", image_url: "", cta_label: "", cta_url: "", starts_at: "", ends_at: "" }); qc.invalidateQueries({ queryKey: ["popups"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async ({ id, active }: any) => { const { error } = await supabase.from("popups").update({ active }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["popups"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("popups").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["popups"] }),
  });

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Popups & Notícias</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,420px]">
          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-4 font-semibold">Lista ({popups.length})</div>
            <div className="divide-y divide-border">
              {popups.map((p) => (
                <div key={p.id} className="flex gap-3 p-3">
                  {p.image_url && <img src={p.image_url} className="h-14 w-14 rounded object-cover" />}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{p.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{p.body}</p>
                  </div>
                  <Switch checked={p.active} onCheckedChange={(v) => toggle.mutate({ id: p.id, active: v })} />
                  <Button variant="ghost" size="icon" onClick={() => confirm("Remover?") && remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {!popups.length && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum popup.</div>}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Novo popup</h2>
            <div><Label>Título</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><Label>Texto</Label><textarea className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
            <div><Label>Imagem URL</Label><Input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CTA texto</Label><Input value={f.cta_label} onChange={(e) => setF({ ...f, cta_label: e.target.value })} /></div>
              <div><Label>CTA URL</Label><Input value={f.cta_url} onChange={(e) => setF({ ...f, cta_url: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início</Label><Input type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></div>
            </div>
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full"><Plus className="mr-2 h-4 w-4" />Criar</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
