import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { useProducts, useSections, useSettings } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { maxviaBalance, maxviaCategories, maxviaProducts, maxviaImportProduct, maxviaAiSuggest } from "@/lib/maxvia.functions";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, RefreshCw, Download, Wallet, Pencil, Boxes } from "lucide-react";
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
            <TabsTrigger value="sections">Seções</TabsTrigger>
            <TabsTrigger value="api">Importar da API (MaxVia)</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="mt-6"><ManualTab /></TabsContent>
          <TabsContent value="sections" className="mt-6"><SectionsTab /></TabsContent>
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
  const [form, setForm] = useState({ name: "", price: "", old_price: "", section_id: "", badge: "", image_url: "", description: "", tags: "" });
  const [editing, setEditing] = useState<any | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.price) throw new Error("Nome e preço são obrigatórios.");
      const tagsArr = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const { error } = await supabase.from("products").insert({
        name: form.name, price: Number(form.price),
        old_price: form.old_price ? Number(form.old_price) : null,
        section_id: form.section_id || null,
        badge: form.badge || null, image_url: form.image_url || null,
        description: form.description || null, source: "manual",
        tags: tagsArr,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto criado");
      setForm({ name: "", price: "", old_price: "", section_id: "", badge: "", image_url: "", description: "", tags: "" });
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
            <ProductRow
              key={p.id}
              product={p}
              onToggle={(v) => toggleActive.mutate({ id: p.id, active: v })}
              onEdit={() => setEditing(p)}
              onRemove={() => { if (confirm("Remover?")) remove.mutate(p.id); }}
              onSavedQuick={() => qc.invalidateQueries({ queryKey: ["products"] })}
            />
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
          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Entrega manual, Entrega 30min" />
            <p className="mt-1 text-[11px] text-muted-foreground">Aparecem como etiquetas no card do produto.</p>
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full"><Plus className="mr-2 h-4 w-4" />Criar produto</Button>
        </div>
      </div>
      {editing && <EditProductDialog product={editing} sections={sections} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["products"] }); }} />}
    </div>
  );
}

function ProductRow({ product: p, onToggle, onEdit, onRemove, onSavedQuick }: { product: any; onToggle: (v: boolean) => void; onEdit: () => void; onRemove: () => void; onSavedQuick: () => void }) {
  const [price, setPrice] = useState<string>(String(p.price ?? ""));
  const [saving, setSaving] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  useEffect(() => { setPrice(String(p.price ?? "")); }, [p.price]);
  const dirty = Number(price) !== Number(p.price) && price !== "";
  const isInternal = p.external_provider !== "maxvia";
  async function saveQuick() {
    const n = Number(price);
    if (!n || n <= 0) { toast.error("Preço inválido"); return; }
    setSaving(true);
    const { error } = await supabase.from("products").update({ price: n }).eq("id", p.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Preço atualizado");
    onSavedQuick();
  }
  return (
    <div className="flex items-center gap-3 p-3">
      {p.image_url ? <img src={p.image_url} alt="" className="h-12 w-12 rounded-md object-cover" /> : <div className="h-12 w-12 rounded-md bg-muted" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
          {p.source === "api" && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">API</span>}
        </div>
        <p className="text-xs text-muted-foreground">{p.badge ?? "—"}</p>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">R$</span>
        <Input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && dirty) saveQuick(); }}
          className="h-8 w-24"
        />
        {dirty && <Button size="sm" onClick={saveQuick} disabled={saving} className="h-8">Salvar</Button>}
      </div>
      <Switch checked={p.active} onCheckedChange={onToggle} />
      {isInternal && (
        <Button variant="outline" size="sm" onClick={() => setStockOpen(true)} className="h-8">
          <Boxes className="mr-1 h-3.5 w-3.5" />Estoque
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onEdit} className="h-8"><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>
      <Button variant="ghost" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      {stockOpen && <StockDialog product={p} onClose={() => setStockOpen(false)} />}
    </div>
  );
}

function StockDialog({ product, onClose }: { product: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [bulk, setBulk] = useState("");
  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["product-stock", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_stock")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const available = rows.filter((r) => !r.delivered);
  const sold = rows.filter((r) => r.delivered);

  async function addBulk() {
    const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { toast.error("Cole ao menos uma linha"); return; }
    const payload = lines.map((content) => ({ product_id: product.id, content }));
    const { error } = await supabase.from("product_stock").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(`${lines.length} item(ns) adicionados`);
    setBulk("");
    refetch();
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function removeOne(id: string) {
    const { error } = await supabase.from("product_stock").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetch();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Estoque — {product.name}</h3>
            <p className="text-xs text-muted-foreground">
              Disponíveis: <b className="text-emerald-600">{available.length}</b> · Entregues: <b>{sold.length}</b>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>

        <div className="mt-4">
          <Label>Adicionar contas (uma por linha — ex: <code>email|senha</code>)</Label>
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
            rows={6}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"login1@dominio.com|senha123\nlogin2@dominio.com|senha456"}
          />
          <Button onClick={addBulk} className="mt-2 w-full"><Plus className="mr-2 h-4 w-4" />Adicionar ao estoque</Button>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-foreground">Disponíveis ({available.length})</h4>
          <div className="mt-2 max-h-60 divide-y divide-border overflow-auto rounded-lg border border-border">
            {isLoading && <p className="p-3 text-xs text-muted-foreground">Carregando...</p>}
            {!isLoading && !available.length && <p className="p-3 text-xs text-muted-foreground">Nenhum item disponível.</p>}
            {available.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2 font-mono text-xs">
                <span className="flex-1 break-all text-foreground">{r.content}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOne(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {sold.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-foreground">Entregues ({sold.length})</h4>
            <div className="mt-2 max-h-40 divide-y divide-border overflow-auto rounded-lg border border-border opacity-70">
              {sold.map((r) => (
                <div key={r.id} className="p-2 font-mono text-xs text-muted-foreground line-through">{r.content}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditProductDialog({ product, sections, onClose, onSaved }: { product: any; sections: any[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: product.name ?? "",
    price: String(product.price ?? ""),
    old_price: product.old_price != null ? String(product.old_price) : "",
    section_id: product.section_id ?? "",
    badge: product.badge ?? "",
    image_url: product.image_url ?? "",
    description: product.description ?? "",
    tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
  });
  const suggestFn = useServerFn(maxviaAiSuggest);
  const [aiLoading, setAiLoading] = useState(false);
  async function runAi() {
    setAiLoading(true);
    try {
      const sectionTitle = sections.find((s: any) => s.id === f.section_id)?.title || "";
      const res: any = await suggestFn({ data: { name: f.name || product.name, desc: f.description || "", category: sectionTitle } });
      if (res?.name) setF((s) => ({ ...s, name: res.name }));
      if (res?.description) setF((s) => ({ ...s, description: res.description }));
      toast.success("Texto melhorado pela IA");
    } catch (e: any) {
      toast.error(e.message || "IA indisponível");
    } finally {
      setAiLoading(false);
    }
  }
  const save = useMutation({
    mutationFn: async () => {
      const tagsArr = f.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const { error } = await supabase.from("products").update({
        name: f.name,
        price: Number(f.price),
        old_price: f.old_price ? Number(f.old_price) : null,
        section_id: f.section_id || null,
        badge: f.badge || null,
        image_url: f.image_url || null,
        description: f.description || null,
        tags: tagsArr,
      }).eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produto atualizado"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Editar produto</h3>
          <Button variant="outline" size="sm" onClick={runAi} disabled={aiLoading}>
            ✨ {aiLoading ? "Gerando..." : "Melhorar com IA"}
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          <div><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
            <div><Label>De (R$)</Label><Input type="number" step="0.01" value={f.old_price} onChange={(e) => setF({ ...f, old_price: e.target.value })} /></div>
          </div>
          <div>
            <Label>Seção</Label>
            <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={f.section_id} onChange={(e) => setF({ ...f, section_id: e.target.value })}>
              <option value="">— sem seção —</option>
              {sections.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Badge</Label><Input value={f.badge} onChange={(e) => setF({ ...f, badge: e.target.value })} /></div>
            <div><Label>Imagem URL</Label><Input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></div>
          </div>
          <div><Label>Descrição</Label>
            <textarea className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="Entrega manual, Entrega 30min" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </div>
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

  const [reviewing, setReviewing] = useState<{ p: any; price: number; sectionId: string | null; categoryName: string | null } | null>(null);

  function openReview(p: any) {
    const ov = overrides[String(p.id_product)] ?? {};
    const price_brl = ov.price ? Number(ov.price) : suggestedBRL(p.price);
    if (!price_brl || price_brl <= 0) { toast.error("Preço inválido"); return; }
    setReviewing({
      p: { ...p, name: ov.name?.trim() || p.name },
      price: price_brl,
      sectionId: section || null,
      categoryName: !section ? (selectedCat?.name ?? null) : null,
    });
  }

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
                      <Button size="sm" onClick={() => openReview(p)}>
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
      {reviewing && (
        <ImportReviewDialog
          item={reviewing}
          onClose={() => setReviewing(null)}
          onImported={() => {
            setReviewing(null);
            qc.invalidateQueries({ queryKey: ["products"] });
            qc.invalidateQueries({ queryKey: ["sections"] });
          }}
        />
      )}
    </div>
  );
}

function ImportReviewDialog({ item, onClose, onImported }: { item: { p: any; price: number; sectionId: string | null; categoryName: string | null }; onClose: () => void; onImported: () => void }) {
  const suggestFn = useServerFn(maxviaAiSuggest);
  const importFn = useServerFn(maxviaImportProduct);
  const [name, setName] = useState(item.p.name);
  const [description, setDescription] = useState(item.p.desc || "");
  const [price, setPrice] = useState(String(item.price));
  const [aiLoading, setAiLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await suggestFn({ data: { name: item.p.original_name || item.p.name, desc: item.p.original_desc || item.p.desc || "", category: item.categoryName || "" } });
        if (cancelled) return;
        if (res?.name) setName(res.name);
        if (res?.description) setDescription(res.description);
      } catch (e: any) {
        toast.error(e.message || "IA indisponível");
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function confirm() {
    const n = Number(price);
    if (!n || n <= 0) { toast.error("Preço inválido"); return; }
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      await importFn({
        data: {
          external_id: String(item.p.id_product),
          name: name.trim(),
          description: description.trim() || undefined,
          price_brl: n,
          external_price: item.p.price,
          external_currency: "VND",
          external_quantity: item.p.quantity ?? 0,
          section_id: item.sectionId,
          category_name: !item.sectionId ? item.categoryName : null,
          badge: "API",
        },
      });
      toast.success("Produto importado!");
      onImported();
    } catch (e: any) {
      toast.error(e.message || "Erro ao importar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Revisar antes de importar</h3>
          {aiLoading && <span className="text-xs text-primary">✨ IA gerando...</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">A IA traduziu e melhorou os textos. Edite o que quiser e confirme.</p>
        <div className="mt-4 space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={aiLoading} />
          </div>
          <div>
            <Label>Descrição</Label>
            <textarea
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={aiLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço R$</Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">Estoque API: {item.p.quantity ?? 0}<br />Custo: {Number(item.p.price).toLocaleString()} VND</p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={confirm} disabled={saving || aiLoading}>
              <Download className="mr-2 h-4 w-4" />{saving ? "Importando..." : "Confirmar import"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionsTab() {
  const qc = useQueryClient();
  const { data: sections = [], refetch } = useSections();
  const [form, setForm] = useState({ title: "", emoji: "", sort_order: "0" });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Título obrigatório");
      const { error } = await supabase.from("sections").insert({
        title: form.title.trim(),
        emoji: form.emoji.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Seção criada");
      setForm({ title: "", emoji: "", sort_order: "0" });
      qc.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function update(id: string, patch: any) {
    const { error } = await supabase.from("sections").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["sections"] });
  }

  async function remove(id: string) {
    if (!confirm("Remover seção? Os produtos ficarão sem seção.")) return;
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Seção removida");
    qc.invalidateQueries({ queryKey: ["sections"] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold text-foreground">Seções ({sections.length})</h2>
          <Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Recarregar</Button>
        </div>
        <div className="divide-y divide-border">
          {sections.map((s: any) => {
            const isPromo = /promo|oferta/i.test(s.title);
            return (
              <SectionRow key={s.id} section={s} isPromo={isPromo} onUpdate={(patch) => update(s.id, patch)} onRemove={() => remove(s.id)} />
            );
          })}
          {!sections.length && <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma seção.</div>}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Nova seção</h2>
        <p className="mt-1 text-xs text-muted-foreground">Dica: nomeie como "Promoções" ou "Ofertas" para ganhar destaque amarelo no index.</p>
        <div className="mt-4 space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Promoções" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Emoji</Label><Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🔥" /></div>
            <div><Label>Ordem</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="w-full"><Plus className="mr-2 h-4 w-4" />Criar seção</Button>
        </div>
      </div>
    </div>
  );
}

function SectionRow({ section: s, isPromo, onUpdate, onRemove }: { section: any; isPromo: boolean; onUpdate: (p: any) => void; onRemove: () => void }) {
  const [title, setTitle] = useState(s.title);
  const [emoji, setEmoji] = useState(s.emoji ?? "");
  const [order, setOrder] = useState(String(s.sort_order ?? 0));
  useEffect(() => { setTitle(s.title); setEmoji(s.emoji ?? ""); setOrder(String(s.sort_order ?? 0)); }, [s.title, s.emoji, s.sort_order]);
  const dirty = title !== s.title || emoji !== (s.emoji ?? "") || Number(order) !== Number(s.sort_order ?? 0);

  return (
    <div className="flex flex-wrap items-center gap-3 p-3">
      <Input className="h-8 w-12" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🔥" />
      <Input className="h-8 flex-1 min-w-[160px]" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input type="number" className="h-8 w-20" value={order} onChange={(e) => setOrder(e.target.value)} />
      {isPromo && <span className="rounded-full border border-yellow-500/40 bg-yellow-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-500">Promo</span>}
      {dirty && <Button size="sm" className="h-8" onClick={() => onUpdate({ title, emoji: emoji || null, sort_order: Number(order) || 0 })}>Salvar</Button>}
      <Switch checked={s.active} onCheckedChange={(v) => onUpdate({ active: v })} />
      <Button variant="ghost" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}
