import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { useAuth } from "@/lib/use-auth";
import { useProducts } from "@/lib/site-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, Plus, Trash2, FileArchive, FileText, Search, Boxes, RefreshCw } from "lucide-react";
import JSZip from "jszip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/estoque")({
  component: AdminEstoque,
});

function AdminEstoque() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !roleLoading && (!user || !isAdmin)) navigate({ to: "/entrar" }); }, [loading, roleLoading, user, isAdmin, navigate]);
  if (!user || !isAdmin) return null;

  const { data: products = [], refetch: refetchProducts } = useProducts();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // only manual / internal products (not maxvia api)
  const internal = useMemo(
    () => (products as any[]).filter((p) => p.external_provider !== "maxvia"),
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return internal;
    return internal.filter((p) => p.name?.toLowerCase().includes(q));
  }, [internal, query]);

  const selected = useMemo(() => internal.find((p) => p.id === selectedId) ?? null, [internal, selectedId]);

  // counts per product
  const { data: counts = {} as Record<string, { available: number; sold: number }> } = useQuery({
    queryKey: ["stock-counts", internal.map((p) => p.id).join(",")],
    enabled: internal.length > 0,
    queryFn: async () => {
      const ids = internal.map((p) => p.id);
      const { data, error } = await supabase
        .from("product_stock")
        .select("product_id, delivered")
        .in("product_id", ids);
      if (error) throw error;
      const acc: Record<string, { available: number; sold: number }> = {};
      for (const id of ids) acc[id] = { available: 0, sold: 0 };
      for (const r of data as any[]) {
        if (!acc[r.product_id]) acc[r.product_id] = { available: 0, sold: 0 };
        if (r.delivered) acc[r.product_id].sold++;
        else acc[r.product_id].available++;
      }
      return acc;
    },
  });

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Estoque & Upload de perfis</h1>
            <p className="text-sm text-muted-foreground">Gerencie a entrega manual: envie .txt ou .zip com os perfis por produto.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetchProducts()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Recarregar
          </Button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px,1fr]">
          {/* Product list */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar produto..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-[640px] divide-y divide-border overflow-auto">
              {filtered.map((p: any) => {
                const c = counts[p.id] ?? { available: 0, sold: 0 };
                const active = selectedId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`flex w-full items-center gap-3 p-3 text-left transition hover:bg-muted/50 ${active ? "bg-primary/10" : ""}`}
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Disponíveis: <b className="text-emerald-600">{c.available}</b> · Entregues: {c.sold}
                      </p>
                    </div>
                  </button>
                );
              })}
              {!filtered.length && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {internal.length ? "Nenhum produto corresponde à busca." : "Nenhum produto manual cadastrado."}
                </div>
              )}
            </div>
          </div>

          {/* Stock panel */}
          <div>
            {selected ? (
              <StockPanel product={selected} />
            ) : (
              <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <div>
                  <Boxes className="mx-auto h-10 w-10 text-muted-foreground/60" />
                  <p className="mt-4 text-sm text-muted-foreground">Selecione um produto à esquerda para gerenciar o estoque.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StockPanel({ product }: { product: any }) {
  const qc = useQueryClient();
  const [bulk, setBulk] = useState("");
  const [uploading, setUploading] = useState(false);
  const [splitMode, setSplitMode] = useState<"lines" | "blank-line" | "file-per-account">("file-per-account");
  const [dedupe, setDedupe] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

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

  async function insertStock(contents: string[]) {
    let clean = contents.map((c) => c.trim()).filter(Boolean);
    if (!clean.length) { toast.error("Nenhum conteúdo válido encontrado."); return { inserted: 0, dupes: 0 }; }

    let dupes = 0;
    if (dedupe) {
      const seen = new Set<string>();
      const unique: string[] = [];
      for (const c of clean) {
        if (seen.has(c)) { dupes++; continue; }
        seen.add(c);
        unique.push(c);
      }
      // dedupe contra estoque existente
      const { data: existing } = await supabase
        .from("product_stock")
        .select("content")
        .eq("product_id", product.id);
      const existingSet = new Set((existing ?? []).map((r: any) => String(r.content).trim()));
      const filtered = unique.filter((c) => {
        if (existingSet.has(c)) { dupes++; return false; }
        return true;
      });
      clean = filtered;
    }

    if (!clean.length) {
      toast.warning(`Nada novo (${dupes} duplicada(s) ignorada(s)).`);
      return { inserted: 0, dupes };
    }

    const payload = clean.map((content) => ({ product_id: product.id, content }));
    const CHUNK = 500;
    setProgress({ done: 0, total: payload.length });
    for (let i = 0; i < payload.length; i += CHUNK) {
      const slice = payload.slice(i, i + CHUNK);
      const { error } = await supabase.from("product_stock").insert(slice);
      if (error) throw error;
      setProgress({ done: Math.min(i + CHUNK, payload.length), total: payload.length });
    }
    setProgress(null);
    refetch();
    qc.invalidateQueries({ queryKey: ["stock-counts"] });
    return { inserted: clean.length, dupes };
  }

  function splitContent(text: string): string[] {
    if (splitMode === "blank-line") {
      return text.split(/\r?\n\s*\r?\n/);
    }
    return text.split(/\r?\n/);
  }

  function isTextName(name: string) {
    return /\.(txt|csv|log|json|md)$/i.test(name) || !/\.[a-z0-9]{1,5}$/i.test(name);
  }

  async function addBulk() {
    try {
      const lines = splitContent(bulk);
      const r = await insertStock(lines);
      if (r.inserted) {
        toast.success(`${r.inserted} conta(s) adicionada(s)${r.dupes ? ` · ${r.dupes} duplicada(s) ignorada(s)` : ""}`);
        setBulk("");
      }
    } catch (e: any) { toast.error(e.message); }
  }

  async function readZipRecursive(buffer: ArrayBuffer, accounts: string[]) {
    const zip = await JSZip.loadAsync(buffer);
    const entries = Object.values(zip.files).filter((e) => !e.dir);
    for (const entry of entries) {
      const lower = entry.name.toLowerCase();
      if (lower.endsWith(".zip")) {
        const buf = await entry.async("arraybuffer");
        await readZipRecursive(buf, accounts);
        continue;
      }
      if (splitMode === "file-per-account") {
        const txt = await entry.async("string");
        accounts.push(txt);
      } else {
        if (!isTextName(entry.name)) continue;
        const txt = await entry.async("string");
        accounts.push(...splitContent(txt));
      }
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const accounts: string[] = [];
      for (const file of Array.from(files)) {
        const lower = file.name.toLowerCase();
        if (lower.endsWith(".zip")) {
          await readZipRecursive(await file.arrayBuffer(), accounts);
        } else {
          const txt = await file.text();
          if (splitMode === "file-per-account") accounts.push(txt);
          else accounts.push(...splitContent(txt));
        }
      }
      const r = await insertStock(accounts);
      if (r.inserted) {
        toast.success(
          `${r.inserted} conta(s) importada(s) de ${files.length} arquivo(s)${r.dupes ? ` · ${r.dupes} duplicada(s) ignorada(s)` : ""}`,
        );
      }
    } catch (e: any) {
      toast.error(e.message || "Falha ao processar arquivo");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  async function removeOne(id: string) {
    const { error } = await supabase.from("product_stock").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetch();
    qc.invalidateQueries({ queryKey: ["stock-counts"] });
  }

  async function clearAvailable() {
    if (!confirm(`Remover todos os ${available.length} itens disponíveis?`)) return;
    const ids = available.map((r) => r.id);
    const { error } = await supabase.from("product_stock").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success("Estoque disponível limpo.");
    refetch();
    qc.invalidateQueries({ queryKey: ["stock-counts"] });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-muted" />
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">{product.name}</h2>
              <p className="text-xs text-muted-foreground">
                Disponíveis: <b className="text-emerald-600">{available.length}</b> · Entregues: <b>{sold.length}</b>
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Preço</p>
            <p className="text-base font-bold text-foreground">R$ {Number(product.price).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Upload de perfis (.txt / .zip)</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Os perfis enviados são entregues automaticamente ao cliente após o pagamento, em ordem de chegada.
        </p>

        <div className="mt-3 grid gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">Como dividir as contas:</span>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="splitmode" checked={splitMode === "lines"} onChange={() => setSplitMode("lines")} />
              <FileText className="h-3.5 w-3.5" /> 1 linha = 1 conta
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="splitmode" checked={splitMode === "blank-line"} onChange={() => setSplitMode("blank-line")} />
              <FileText className="h-3.5 w-3.5" /> bloco separado por linha em branco
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="splitmode" checked={splitMode === "file-per-account"} onChange={() => setSplitMode("file-per-account")} />
              <FileArchive className="h-3.5 w-3.5" /> 1 arquivo = 1 conta (.txt ou item do .zip)
            </label>
          </div>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} />
            <span>Ignorar duplicadas (no lote e contra estoque atual)</span>
          </label>
        </div>

        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-8 text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary/10">
          <Upload className="h-4 w-4" />
          {uploading
            ? progress
              ? `Inserindo ${progress.done}/${progress.total}...`
              : "Processando arquivos..."
            : "Selecionar arquivos (.txt / .zip — múltiplos, aceita .zip aninhado)"}
          <input
            type="file"
            accept=".txt,.csv,.log,.zip,text/plain,application/zip"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = ""; }}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <Label>Ou cole as contas (uma por linha — ex: <code>email|senha</code>)</Label>
        <textarea
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
          rows={5}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={"login1@dominio.com|senha123\nlogin2@dominio.com|senha456"}
        />
        <Button onClick={addBulk} className="mt-2 w-full"><Plus className="mr-2 h-4 w-4" />Adicionar ao estoque</Button>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h4 className="text-sm font-semibold text-foreground">Disponíveis ({available.length})</h4>
          {available.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAvailable}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Limpar disponíveis
            </Button>
          )}
        </div>
        <div className="max-h-[400px] divide-y divide-border overflow-auto">
          {isLoading && <p className="p-3 text-xs text-muted-foreground">Carregando...</p>}
          {!isLoading && !available.length && <p className="p-6 text-center text-xs text-muted-foreground">Nenhum item disponível.</p>}
          {available.map((r) => (
            <div key={r.id} className="flex items-center gap-2 p-2 font-mono text-xs">
              <span className="flex-1 break-all whitespace-pre-wrap text-foreground">{r.content}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOne(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {sold.length > 0 && (
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h4 className="text-sm font-semibold text-foreground">Entregues ({sold.length})</h4>
          </div>
          <div className="max-h-[300px] divide-y divide-border overflow-auto">
            {sold.map((r) => (
              <div key={r.id} className="p-2 font-mono text-xs text-muted-foreground">
                <span className="break-all whitespace-pre-wrap">{r.content}</span>
                {r.delivered_at && (
                  <span className="ml-2 text-[10px]">· {new Date(r.delivered_at).toLocaleString("pt-BR")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
