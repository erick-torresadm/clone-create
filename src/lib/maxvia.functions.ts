import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE = "https://maxvia88.com/api/v1";

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso negado: apenas admins.");
}

function key() {
  const k = process.env.MAXVIA_API_KEY;
  if (!k) throw new Error("MAXVIA_API_KEY não configurada.");
  return k;
}

async function translateToPT(texts: string[]): Promise<string[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !texts.length) return texts;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Traduza cada linha do usuário para português brasileiro de forma natural, curta e comercial. Mantenha números, siglas e símbolos. NÃO mencione fornecedores, marcas vietnamitas/inglesas específicas. Substitua menções a 'via', 'BM' por 'conta'/'gerenciador'. Responda APENAS as traduções, uma por linha, na mesma ordem, sem numeração." },
          { role: "user", content: texts.join("\n") },
        ],
      }),
    });
    if (!r.ok) return texts;
    const j = await r.json();
    const out = (j.choices?.[0]?.message?.content ?? "").split("\n").map((s: string) => s.trim()).filter(Boolean);
    return out.length === texts.length ? out : texts;
  } catch {
    return texts;
  }
}

export const maxviaBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const r = await fetch(`${BASE}/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key() }),
    });
    return await r.json();
  });

export const maxviaCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const r = await fetch(`${BASE}/categories`);
    if (!r.ok) throw new Error(`MaxVia categories ${r.status}`);
    const j = await r.json();
    const cats = (j?.data ?? []) as Array<{ id: number; name: string; icon: string | null }>;
    const translated = await translateToPT(cats.map((c) => c.name));
    return cats.map((c, i) => ({ ...c, name: translated[i] ?? c.name, original_name: c.name }));
  });

export const maxviaProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { categoryId: number }) => z.object({ categoryId: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const r = await fetch(`${BASE}/category/${data.categoryId}`);
    if (!r.ok) throw new Error(`MaxVia products ${r.status}`);
    const j = await r.json();
    const items = (j?.data ?? []) as Array<{ id_product: number; name: string; desc: string; price: number; quantity: number }>;
    const lines = items.flatMap((p) => [p.name, p.desc || ""]);
    const tr = await translateToPT(lines);
    return items.map((p, i) => ({
      ...p,
      original_name: p.name,
      original_desc: p.desc,
      name: tr[i * 2] ?? p.name,
      desc: tr[i * 2 + 1] ?? p.desc,
    }));
  });

const importSchema = z.object({
  external_id: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  price_brl: z.number().positive(),
  old_price_brl: z.number().positive().nullable().optional(),
  external_price: z.number().nonnegative(),
  external_currency: z.string().min(1).max(8),
  external_quantity: z.number().int().nonnegative().optional(),
  section_id: z.string().uuid().nullable().optional(),
  category_name: z.string().min(1).max(120).nullable().optional(),
  badge: z.string().max(40).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
});

async function findOrCreateSectionByName(name: string): Promise<string> {
  const trimmed = name.trim();
  const { data: existing } = await supabaseAdmin
    .from("sections")
    .select("id,title")
    .ilike("title", trimmed)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data: created, error } = await supabaseAdmin
    .from("sections")
    .insert({ title: trimmed, emoji: "📦", active: true })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created!.id as string;
}

export const maxviaImportProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => importSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const row = {
      name: data.name,
      description: data.description ?? null,
      price: data.price_brl,
      old_price: data.old_price_brl ?? null,
      section_id: data.section_id ?? null,
      badge: data.badge ?? null,
      image_url: data.image_url ?? null,
      active: (data.external_quantity ?? 0) > 0,
      source: "api",
      external_provider: "maxvia",
      external_id: data.external_id,
      external_price: data.external_price,
      external_currency: data.external_currency,
      external_quantity: data.external_quantity ?? null,
    };
    const { data: out, error } = await supabaseAdmin
      .from("products")
      .upsert(row, { onConflict: "external_provider,external_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return out;
  });
