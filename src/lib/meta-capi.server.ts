// Meta Conversions API (CAPI) - disparos server-side do pixel dedicado ao funil de créditos.
import { createHash } from "crypto";
import { CREDITS_PIXEL_ID } from "./meta-pixel-credits";

const GRAPH_URL = `https://graph.facebook.com/v19.0/${CREDITS_PIXEL_ID}/events`;

function sha256(v: string): string {
  return createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
}

type CapiUserData = {
  email?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

type CapiEvent = {
  eventName: string;
  eventId: string;
  eventTimeSec?: number;
  eventSourceUrl?: string;
  valueBrl?: number;
  contentIds?: string[];
  contentName?: string;
  user: CapiUserData;
};

export async function sendCreditsCapiEvent(evt: CapiEvent): Promise<void> {
  const token = process.env.META_CAPI_CREDITS_TOKEN;
  if (!token) {
    console.warn("[meta-capi] META_CAPI_CREDITS_TOKEN não configurado");
    return;
  }

  const user_data: Record<string, any> = {};
  if (evt.user.email) user_data.em = [sha256(evt.user.email)];
  if (evt.user.clientIp) user_data.client_ip_address = evt.user.clientIp;
  if (evt.user.userAgent) user_data.client_user_agent = evt.user.userAgent;
  if (evt.user.fbp) user_data.fbp = evt.user.fbp;
  if (evt.user.fbc) user_data.fbc = evt.user.fbc;

  const custom_data: Record<string, any> = { currency: "BRL" };
  if (typeof evt.valueBrl === "number") custom_data.value = Number(evt.valueBrl.toFixed(2));
  if (evt.contentIds?.length) {
    custom_data.content_ids = evt.contentIds;
    custom_data.content_type = "product";
  }
  if (evt.contentName) custom_data.content_name = evt.contentName;

  const body = {
    data: [
      {
        event_name: evt.eventName,
        event_time: evt.eventTimeSec ?? Math.floor(Date.now() / 1000),
        event_id: evt.eventId,
        action_source: "website",
        event_source_url: evt.eventSourceUrl,
        user_data,
        custom_data,
      },
    ],
  };

  try {
    const res = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[meta-capi] ${res.status}: ${txt.slice(0, 300)}`);
    } else {
      console.log(`[meta-capi] ok event=${evt.eventName} id=${evt.eventId}`);
    }
  } catch (e: any) {
    console.error(`[meta-capi] erro: ${e?.message}`);
  }
}

export function creditsPurchaseEventId(purchaseId: string) {
  return `credits_purchase_${purchaseId}`;
}
