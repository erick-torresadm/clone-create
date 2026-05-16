// Cliente Asaas (sandbox/produção). Toda chamada vai por aqui.
const SANDBOX_BASE = "https://api-sandbox.asaas.com/v3";
const LIVE_BASE = "https://api.asaas.com/v3";

export type AsaasEnv = "sandbox" | "live";

function getApiKey(env: AsaasEnv): string {
  const k = env === "sandbox"
    ? (process.env.ASAAS_SANDBOX_API_KEY || process.env.ASAAS_API_KEY)
    : process.env.ASAAS_API_KEY;
  if (!k) throw new Error("ASAAS_API_KEY não configurada");
  return k;
}

function baseUrl(env: AsaasEnv) {
  // Respeita o env passado pelo caller. Não força sandbox baseado em prefixo
  // de chave (evita falso-positivo quando a chave de produção contém "hmlg").
  return env === "live" ? LIVE_BASE : SANDBOX_BASE;
}

async function asaasFetch<T = any>(env: AsaasEnv, path: string, init?: RequestInit): Promise<T> {
  const url = `${baseUrl(env)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Ativosfy/1.0",
      access_token: getApiKey(env),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.description ||
      json?.error ||
      json?.message ||
      `Asaas ${res.status}: ${text.slice(0, 200)}`;
    throw new Error(msg);
  }
  return json as T;
}

export type AsaasCustomer = { id: string; email?: string; name?: string };

export async function findOrCreateCustomer(
  env: AsaasEnv,
  input: { email: string; name: string; cpfCnpj?: string; externalReference?: string },
): Promise<AsaasCustomer> {
  const list = await asaasFetch<{ data: AsaasCustomer[] }>(
    env,
    `/customers?email=${encodeURIComponent(input.email)}&limit=1`,
    { method: "GET" },
  );
  if (list.data?.length) return list.data[0];
  return asaasFetch<AsaasCustomer>(env, `/customers`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      ...(input.cpfCnpj ? { cpfCnpj: input.cpfCnpj } : {}),
      ...(input.externalReference ? { externalReference: input.externalReference } : {}),
      notificationDisabled: true,
    }),
  });
}

export type AsaasPayment = {
  id: string;
  status: string; // PENDING | RECEIVED | CONFIRMED | OVERDUE | REFUNDED | ...
  value: number;
  dueDate: string;
  invoiceUrl?: string;
  customer: string;
};

export async function createPixPayment(
  env: AsaasEnv,
  input: {
    customerId: string;
    valueBrl: number; // em reais
    description: string;
    externalReference: string;
    dueDateISO?: string; // YYYY-MM-DD
  },
): Promise<AsaasPayment> {
  const due = input.dueDateISO ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return asaasFetch<AsaasPayment>(env, `/payments`, {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: "PIX",
      value: Number(input.valueBrl.toFixed(2)),
      dueDate: due,
      description: input.description.slice(0, 500),
      externalReference: input.externalReference,
    }),
  });
}

export type PixQr = {
  encodedImage: string; // base64 PNG (sem prefixo data:)
  payload: string; // copia-e-cola
  expirationDate: string; // ISO
};

export async function getPixQr(env: AsaasEnv, paymentId: string): Promise<PixQr> {
  return asaasFetch<PixQr>(env, `/payments/${paymentId}/pixQrCode`, { method: "GET" });
}

export async function getPayment(env: AsaasEnv, paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(env, `/payments/${paymentId}`, { method: "GET" });
}

export function isPaid(status: string): boolean {
  return ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status);
}

export type AsaasBalance = { balance: number };
export async function getAccountBalance(env: AsaasEnv): Promise<number> {
  try {
    const r = await asaasFetch<AsaasBalance>(env, `/finance/balance`, { method: "GET" });
    return Number(r?.balance ?? 0);
  } catch {
    return 0;
  }
}

export type AsaasFinanceTransfer = { value: number; status: string };
export async function getPendingTransfers(env: AsaasEnv): Promise<{ count: number; total: number }> {
  try {
    const r = await asaasFetch<{ data: AsaasFinanceTransfer[]; totalCount?: number }>(
      env,
      `/transfers?status=PENDING&limit=100`,
      { method: "GET" },
    );
    const list = r?.data ?? [];
    return {
      count: list.length,
      total: list.reduce((s, t) => s + Number(t.value || 0), 0),
    };
  } catch {
    return { count: 0, total: 0 };
  }
}

export async function getNextPayoutEstimate(env: AsaasEnv): Promise<number> {
  // Soma valores RECEIVED ainda não liberados (anticipations não tratadas aqui).
  try {
    const today = new Date();
    const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const r = await asaasFetch<{ data: Array<{ value: number; netValue?: number; status: string; creditDate?: string }> }>(
      env,
      `/payments?status=CONFIRMED&dateCreated[ge]=${start}&limit=100`,
      { method: "GET" },
    );
    const list = r?.data ?? [];
    return list.reduce((s, p) => s + Number(p.netValue ?? p.value ?? 0), 0);
  } catch {
    return 0;
  }
}
