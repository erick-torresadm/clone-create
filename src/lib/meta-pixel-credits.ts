// Pixel dedicado ao funil /creditos-lovable.
// Usa trackSingle pra não conflitar com o pixel global do site.

export const CREDITS_PIXEL_ID = "1757284072352003";

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    __fbq_credits_inited?: boolean;
  }
}

export function initCreditsPixel() {
  if (typeof window === "undefined") return;
  if (window.__fbq_credits_inited) return;

  if (typeof window.fbq !== "function") {
    const f: any = window;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    const first = document.getElementsByTagName("script")[0];
    first?.parentNode?.insertBefore(s, first);
  }

  try {
    window.fbq("init", CREDITS_PIXEL_ID);
    window.__fbq_credits_inited = true;
    window.fbq("trackSingle", CREDITS_PIXEL_ID, "PageView");
  } catch {}
}

export function fbCreditsTrack(
  event: string,
  params?: Record<string, any>,
  eventId?: string,
) {
  if (typeof window === "undefined") return;
  try {
    const opts = eventId ? { eventID: eventId } : undefined;
    window.fbq?.("trackSingle", CREDITS_PIXEL_ID, event, params ?? {}, opts);
  } catch {}
}

export function fbCreditsPageView() {
  fbCreditsTrack("PageView");
}

// event_id determinístico para deduplicar com o disparo server-side (CAPI).
export function creditsPurchaseEventId(purchaseId: string) {
  return `credits_purchase_${purchaseId}`;
}
