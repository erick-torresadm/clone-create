// Supabase Edge Function: nova-compra
// Recebe dados de compra e insere em credit_purchases
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { buyer_email, lovable_email, credits, price_brl, package_id } = await req.json();

    if (!buyer_email || !lovable_email || !credits || credits < 20) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos. Informe buyer_email, lovable_email e credits (>=20)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(buyer_email) || !emailRe.test(lovable_email)) {
      return new Response(
        JSON.stringify({ error: "Email inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cycles = Math.max(1, Math.floor(credits / 20));

    const { data, error } = await supabase
      .from("credit_purchases")
      .insert({
        buyer_email: String(buyer_email).toLowerCase().trim(),
        lovable_email: String(lovable_email).toLowerCase().trim(),
        credits: Number(credits),
        cycles,
        package_id: package_id || "site:checkout",
        price_brl: Number(price_brl) || 0,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, purchase: data }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
