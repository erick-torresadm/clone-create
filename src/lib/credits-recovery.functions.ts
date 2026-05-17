import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendCreditPurchaseRecoveryEmail } from "@/lib/resend.server";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
});

export const requestCreditPurchaseRecovery = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    // Sempre retornamos { ok: true } — não revelamos se o email existe (anti-enumeração).
    const { data: rows } = await (supabaseAdmin as any)
      .from("credit_purchases")
      .select("id, credits, status, created_at, lovable_email")
      .eq("buyer_email", data.email)
      .order("created_at", { ascending: false })
      .limit(20);

    if (rows && rows.length > 0) {
      sendCreditPurchaseRecoveryEmail({ to: data.email, purchases: rows }).catch((e) =>
        console.error(`[credits-recovery] email failed: ${e?.message}`),
      );
    }
    return { ok: true };
  });
