import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  type AsaasEnv,
  createPixPayment,
  findOrCreateCustomer,
  getPixQr,
  getPayment,
  isPaid,
} from "@/lib/asaas.server";
import { notifyAdmin } from "@/lib/telegram.server";

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  cycles: number;
  days: number;
  priceBrl: number;
  highlight?: boolean;
};

// Fonte única de verdade dos pacotes (server-side enforced).
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "p100",  name: "Starter",  credits: 100,  cycles: 5,   days: 1,  priceBrl: 14.9 },
  { id: "p200",  name: "Básico",   credits: 200,  cycles: 10,  days: 1,  priceBrl: 24.9 },
  { id: "p300",  name: "Light",    credits: 300,  cycles: 15,  days: 2,  priceBrl: 34.9 },
  { id: "p400",  name: "Avançado", credits: 400,  cycles: 20,  days: 2,  priceBrl: 44.9, highlight: true },
  { id: "p500",  name: "Plus",     credits: 500,  cycles: 25,  days: 3,  priceBrl: 49.9 },
  { id: "p600",  name: "Pro",      credits: 600,  cycles: 30,  days: 3,  priceBrl: 69.9 },
  { id: "p700",  name: "Pro+",     credits: 700,  cycles: 35,  days: 4,  priceBrl: 79.9 },
  { id: "p800",  name: "Ultra",    credits: 800,  cycles: 40,  days: 4,  priceBrl: 89.9 },
  { id: "p900",  name: "Ultra+",   credits: 900,  cycles: 45,  days: 5,  priceBrl: 99.9 },
  { id: "p1000", name: "Premium",  credits: 1000, cycles: 50,  days: 5,  priceBrl: 129.9 },
  { id: "p1500", name: "Mega",     credits: 1500, cycles: 75,  days: 7,  priceBrl: 169.9 },
  { id: "p2000", name: "Máximo",   credits: 2000, cycles: 100, days: 10, priceBrl: 199.9 },
];

const createSchema = z.object({
  packageId: z.string().min(1).max(20),
  buyerEmail: z.string().email().max(160),
  lovableEmail: z.string().email().max(160),
  cpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/, "CPF/CNPJ inválido"),
  environment: z.enum(["sandbox", "live"]),
});

export const createCreditCheckout = createServerFn({ method: "POST" })
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === data.packageId);
    if (!pkg) throw new Error("Pacote inválido.");
    const env: AsaasEnv = data.environment;

    const buyer = data.buyerEmail.trim().toLowerCase();
    const lovable = data.lovableEmail.trim().toLowerCase();

    const customer = await findOrCreateCustomer(env, {
      email: buyer,
      name: buyer.split("@")[0],
      cpfCnpj: data.cpfCnpj,
    });

    const { data: row, error: insErr } = await (supabaseAdmin as any)
      .from("credit_purchases")
      .insert({
        buyer_email: buyer,
        lovable_email: lovable,
        credits: pkg.credits,
        cycles: pkg.cycles,
        package_id: pkg.id,
        price_brl: pkg.priceBrl,
        status: "pending",
        asaas_customer_id: customer.id,
      })
      .select("id")
      .single();
    if (insErr || !row) throw new Error(insErr?.message || "Falha ao registrar compra");

    const description = `${pkg.credits} créditos Lovable (${pkg.cycles} ciclos) para ${lovable}`;
    const payment = await createPixPayment(env, {
      customerId: customer.id,
      valueBrl: pkg.priceBrl,
      description,
      externalReference: `credits:${row.id}`,
    });

    const qr = await getPixQr(env, payment.id);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await (supabaseAdmin as any)
      .from("credit_purchases")
      .update({
        asaas_payment_id: payment.id,
        pix_payload: qr.payload,
        pix_qr_base64: qr.encodedImage,
        pix_expires_at: expiresAt,
      })
      .eq("id", row.id);

    // 🔔 Telegram: PIX gerado (créditos Lovable)
    notifyAdmin(
      [
        `🟡 <b>Novo PIX gerado — Créditos Lovable</b>`,
        `<b>Pacote:</b> ${pkg.credits} créditos (${pkg.cycles} ciclos) — R$ ${pkg.priceBrl.toFixed(2)}`,
        `<b>Cliente:</b> ${buyer}`,
        `<b>Conta Lovable:</b> ${lovable}`,
        `<b>Compra:</b> <code>${row.id}</code>`,
        `<b>Cobrança:</b> <code>${payment.id}</code>`,
        `<b>Ambiente:</b> ${env}`,
        `<b>Status:</b> aguardando pagamento`,
      ].join("\n"),
    ).catch(() => {});

    return {
      purchaseId: row.id,
      paymentId: payment.id,
      pixPayload: qr.payload,
      pixQrBase64: qr.encodedImage,
      expiresAt,
      totalBrl: pkg.priceBrl,
    };
  });

const checkSchema = z.object({
  paymentId: z.string().min(3).max(80),
  environment: z.enum(["sandbox", "live"]),
});

export const checkCreditPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => checkSchema.parse(d))
  .handler(async ({ data }) => {
    let raw: string | null = null;
    let paid = false;
    try {
      const p = await getPayment(data.environment, data.paymentId);
      raw = p.status;
      paid = isPaid(p.status);
    } catch { /* ignore */ }

    if (paid) {
      await (supabaseAdmin as any)
        .from("credit_purchases")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("asaas_payment_id", data.paymentId)
        .eq("status", "pending");
    }

    const { data: row } = await (supabaseAdmin as any)
      .from("credit_purchases")
      .select("status")
      .eq("asaas_payment_id", data.paymentId)
      .maybeSingle();

    return { paid: paid || row?.status === "paid", status: row?.status ?? "pending", rawStatus: raw };
  });
