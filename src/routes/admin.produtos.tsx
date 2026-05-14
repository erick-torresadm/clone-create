import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { useProducts, useSections, useSettings } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { maxviaBalance, maxviaCategories, maxviaProducts, maxviaImportProduct } from "@/lib/maxvia.functions";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, RefreshCw, Download, Wallet, Pencil } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/produtos")({
  component: AdminProdutos,
});

function AdminProdutos() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);
  if (!user || !isAdmin) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Produtos</h1>
        <p className="text-sm text-muted-foreground">Adicione manualmente ou importe da MaxVia API.</p>

        <Tabs defaultValue="manual" className="mt-6">
          <TabsList>
            <TabsTrigger value="manual">Manuais & lista</TabsTrigger>
            <TabsTrigger value="api">Importar da API (MaxVia)</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="mt-6"><ManualTab /></TabsContent>
          <TabsContent value="api" className="mt-6"><ApiTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function ManualTab() {
  const { data: products = [], refetch } = useProducts();
  const { data: sections = [] } = useSections();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", price: "", old_price: "", section_id: "", badge: "", image_url: "", description: "" });
  const [editing, setEditing] = useState<any | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.price) throw new Error("Nome e preço são obrigatórios.");
      const { error } = await supabase.from("products").insert({
        name: form.name, price: Number(form.price),
        old_price: form.old_price ? Number(form.old_price) : null,
        section_id: form.section_id || null,
        badge: form.badge || null, image_url: form.image_url || null,
        description: form.description || null, source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto criado");
      setForm({ name: "", price: "", old_price: "", section_id: "", badge: "", image_url: "", description: "" });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,420px]">
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold text-foreground">Catálogo ({products.length})</h2>
          <Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Recarregar</Button>
        </div>
        <div className="max-h-[640px] divide-y divide-border overflow-auto">
          {products.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              {p.image_url ? <img src={p.image_url} alt="" className="h-12 w-12 rounded-md object-cover" /> : <div className="h-12 w-12 rounded-md bg-muted" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                  {p.source === "api" && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">API</span>}
                </div>
                <p className="text-xs text-muted-foreground">R$ {Number(p.price).toFixed(2)} · {p.badge ?? "—"}</p>
              </div>
              <Switch checked={p.active} onCheckedChange={(v) => toggleActive.mutate({ id: p.id, active: v })} />
              <Button variant="ghost" size="icon" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover?")) remove.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {!products.length && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum produto.</div>}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Novo produto manual</h2>
        <div className="mt-4 space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><Label>De (R$)</Label><Input type="number" step="0.01" value={form.old_price} onChange={(e) => setForm({ ...form, old_price: e.target.value })} /></div>
          </div>
          <div>
            <Label>Seção</Label>
            <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })}>
              <option value="">— sem seção —</option>
              {sections.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Badge</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="TOP" /></div>
            <div><Label>Imagem URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          </div>
          <div><Label>Descrição</Label>
            <textarea className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full"><Plus className="mr-2 h-4 w-4" />Criar produto</Button>
        </div>
      </div>
    </div>
  );
}

function ApiTab() {
  const { data: settings } = useSettings();
  const { data: sections = [] } = useSections();
  const balanceFn = useServerFn(maxviaBalance);
  const catFn = useServerFn(maxviaCategories);
  const prodFn = useServerFn(maxviaProducts);
  const importFn = useServerFn(maxviaImportProduct);
  const qc = useQueryClient();

  const [selectedCat, setSelectedCat] = useState<{ id: number; name: string } | null>(null);
  const [markup, setMarkup] = useState<number>(80);
  const [section, setSection] = useState<string>("");
  const [overrides, setOverrides] = useState<Record<string, { price?: string; name?: string }>>({});

  const balance = useQuery({ queryKey: ["mv-balance"], queryFn: () => balanceFn({}) });
  const cats = useQuery({ queryKey: ["mv-cats"], queryFn: () => catFn({}) });
  const prods = useQuery({
    queryKey: ["mv-prods", selectedCat?.id],
    queryFn: () => prodFn({ data: { categoryId: selectedCat!.id } }),
    enabled: !!selectedCat,
  });

  const rateVnd = Number(settings?.brl_per_vnd ?? 0.00024);
  function suggestedBRL(extPrice: number) {
    const base = extPrice * rateVnd;
    return Number((base * (1 + markup / 100)).toFixed(2));
  }

  const importItem = useMutation({
    mutationFn: async (p: any) => {
      const ov = overrides[String(p.id_product)] ?? {};
      const price_brl = ov.price ? Number(ov.price) : suggestedBRL(p.price);
      if (!price_brl || price_brl <= 0) throw new Error("Preço inválido");
      return importFn({
        data: {
          external_id: String(p.id_product),
          name: (ov.name?.trim() || p.name),
          description: p.desc || undefined,
          price_brl,
          external_price: p.price,
          external_currency: "VND",
          external_quantity: p.quantity ?? 0,
          section_id: section || null,
          category_name: !section ? (selectedCat?.name ?? null) : null,
          badge: "API",
        },
      });
    },
    onSuccess: () => { toast.success("Produto importado!"); qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["sections"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Saldo MaxVia:</span>
            <span className="text-muted-foreground">
              {balance.isLoading ? "..." : (balance.data as any)?.balance != null ? `${Number((balance.data as any).balance).toLocaleString()} VND` : "—"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => balance.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
          <div className="ml-auto flex items-center gap-2">
            <Label className="text-xs">Markup %</Label>
            <Input className="h-8 w-20" type="number" value={markup} onChange={(e) => setMarkup(Number(e.target.value) || 0)} />
            <Label className="text-xs">Seção</Label>
            <select className="h-8 rounded-md border border-border bg-background px-2 text-sm" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">Auto (categoria do fornecedor)</option>
              {sections.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Conversão atual: 1 VND ≈ R$ {rateVnd}. Quando "Auto", criamos/usamos uma seção com o nome da categoria do fornecedor.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px,1fr]">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-3 text-sm font-semibold text-foreground">Categorias</div>
          <div className="max-h-[520px] overflow-auto">
            {cats.isLoading && <div className="p-4 text-sm text-muted-foreground">Carregando...</div>}
            {(cats.data as any[] | undefined)?.map((c) => (
              <button key={c.id} onClick={() => setSelectedCat({ id: c.id, name: c.name })}
                className={`flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm ${selectedCat?.id === c.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"}`}>
                {c.icon && <img src={`https://maxvia88.com${c.icon}`} alt="" className="h-4 w-4" />}
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-3 text-sm font-semibold text-foreground">Produtos {selectedCat ? `· ${selectedCat.name}` : ""}</div>
          <div className="max-h-[620px] divide-y divide-border overflow-auto">
            {!selectedCat && <div className="p-6 text-sm text-muted-foreground">Selecione uma categoria.</div>}
            {prods.isLoading && <div className="p-6 text-sm text-muted-foreground">Carregando...</div>}
            {(prods.data as any[] | undefined)?.map((p) => {
              const key = String(p.id_product);
              const ov = overrides[key] ?? {};
              const suggested = suggestedBRL(p.price);
              return (
                <div key={p.id_product} className="space-y-2 p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <Input
                        className="h-8 text-sm font-medium"
                        value={ov.name ?? p.name}
                        onChange={(e) => setOverrides((s) => ({ ...s, [key]: { ...s[key], name: e.target.value } }))}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Number(p.price).toLocaleString()} VND · sugerido R$ {suggested.toFixed(2)} · estoque: {p.quantity}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Label className="text-[10px] text-muted-foreground">Preço R$</Label>
                      <Input
                        className="h-8 w-24 text-sm"
                        type="number"
                        step="0.01"
                        placeholder={suggested.toFixed(2)}
                        value={ov.price ?? ""}
                        onChange={(e) => setOverrides((s) => ({ ...s, [key]: { ...s[key], price: e.target.value } }))}
                      />
                      <Button size="sm" onClick={() => importItem.mutate(p)} disabled={importItem.isPending}>
                        <Download className="mr-2 h-4 w-4" />Importar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {selectedCat && !prods.isLoading && !(prods.data as any[] | undefined)?.length && (
              <div className="p-6 text-sm text-muted-foreground">Nenhum produto.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
