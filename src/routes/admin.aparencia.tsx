import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { useSettings } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/aparencia")({ component: AdminAparencia });

function AdminAparencia() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);

  const { data: s } = useSettings();
  const qc = useQueryClient();
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (s) {
      setF(s);
      // Carregar telegram chat id da tabela admin
      supabase.from("admin_settings").select("telegram_admin_chat_id").eq("id", 1).maybeSingle()
        .then(({ data }) => { if (data) setF((cur: any) => ({ ...cur, telegram_admin_chat_id: (data as any).telegram_admin_chat_id ?? "" })); });
    }
  }, [s]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        store_name: f.store_name, hero_title: f.hero_title, hero_subtitle: f.hero_subtitle,
        announcement_bar: f.announcement_bar || null, primary_color: f.primary_color, accent_color: f.accent_color,
        logo_url: f.logo_url || null, whatsapp: f.whatsapp || null, telegram: f.telegram || null,
        brl_per_vnd: Number(f.brl_per_vnd) || 0.00024, brl_per_usd: Number(f.brl_per_usd) || 5.5,
        home_max_products: Math.max(1, Math.min(60, Number(f.home_max_products) || 12)),
        home_show_categories: !!f.home_show_categories,
        home_show_all_products: !!f.home_show_all_products,
        home_grid_cols: Math.max(2, Math.min(6, Number(f.home_grid_cols) || 4)),
      };
      const { error } = await supabase.from("site_settings").update(payload).eq("id", 1);
      if (error) throw error;
      const chatId = (f.telegram_admin_chat_id || "").toString().trim() || null;
      const { error: e2 } = await supabase.from("admin_settings").upsert({ id: 1, telegram_admin_chat_id: chatId });
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user || !isAdmin || !s) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Aparência & Configurações</h1>

        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div><Label>Nome da loja</Label><Input value={f.store_name ?? ""} onChange={(e) => setF({ ...f, store_name: e.target.value })} /></div>
          <div><Label>Faixa de aviso (topo)</Label><Input value={f.announcement_bar ?? ""} onChange={(e) => setF({ ...f, announcement_bar: e.target.value })} placeholder="Frete grátis em pedidos acima de R$ 50" /></div>
          <div><Label>Título do hero</Label><Input value={f.hero_title ?? ""} onChange={(e) => setF({ ...f, hero_title: e.target.value })} /></div>
          <div><Label>Subtítulo do hero</Label><Input value={f.hero_subtitle ?? ""} onChange={(e) => setF({ ...f, hero_subtitle: e.target.value })} /></div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Cor primária (hex)</Label><Input value={f.primary_color ?? ""} onChange={(e) => setF({ ...f, primary_color: e.target.value })} /></div>
            <div><Label>Cor de acento (hex)</Label><Input value={f.accent_color ?? ""} onChange={(e) => setF({ ...f, accent_color: e.target.value })} /></div>
          </div>
          <div><Label>Logo URL</Label><Input value={f.logo_url ?? ""} onChange={(e) => setF({ ...f, logo_url: e.target.value })} /></div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label>WhatsApp</Label><Input value={f.whatsapp ?? ""} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></div>
            <div><Label>Telegram</Label><Input value={f.telegram ?? ""} onChange={(e) => setF({ ...f, telegram: e.target.value })} /></div>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="mb-1 text-sm font-semibold text-foreground">Notificações no Telegram (admin)</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Receba avisos no bot conectado quando alguém comprar, gerar PIX ou pagar. Cole aqui seu <b>chat ID</b> do Telegram (envie <code>/start</code> para o bot e use <a className="underline" href="https://t.me/userinfobot" target="_blank" rel="noreferrer">@userinfobot</a> para descobrir seu ID). Pode ser um chat pessoal ou um grupo (com <code>-</code> na frente).
            </p>
            <div><Label>Telegram chat ID</Label><Input value={f.telegram_admin_chat_id ?? ""} onChange={(e) => setF({ ...f, telegram_admin_chat_id: e.target.value })} placeholder="123456789" /></div>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Visibilidade da página inicial</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Máximo de produtos</Label><Input type="number" min={1} max={60} value={f.home_max_products ?? 12} onChange={(e) => setF({ ...f, home_max_products: e.target.value })} /></div>
              <div><Label>Colunas no grid (2-6)</Label><Input type="number" min={2} max={6} value={f.home_grid_cols ?? 4} onChange={(e) => setF({ ...f, home_grid_cols: e.target.value })} /></div>
            </div>
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={!!f.home_show_categories} onChange={(e) => setF({ ...f, home_show_categories: e.target.checked })} />
                Mostrar filtros de categorias na página inicial
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={!!f.home_show_all_products} onChange={(e) => setF({ ...f, home_show_all_products: e.target.checked })} />
                Mostrar todos os produtos agrupados por categoria
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Taxas de câmbio (importação API)</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>BRL por VND</Label><Input type="number" step="0.00001" value={f.brl_per_vnd ?? ""} onChange={(e) => setF({ ...f, brl_per_vnd: e.target.value })} /></div>
              <div><Label>BRL por USD</Label><Input type="number" step="0.01" value={f.brl_per_usd ?? ""} onChange={(e) => setF({ ...f, brl_per_usd: e.target.value })} /></div>
            </div>
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full"><Save className="mr-2 h-4 w-4" />Salvar</Button>
        </div>
      </div>
    </Layout>
  );
}
