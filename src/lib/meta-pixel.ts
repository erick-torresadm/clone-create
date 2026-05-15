// Meta (Facebook) Pixel client helper.
// Loads fbevents.js once when a pixel id is provided, exposes track helpers.

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    __fbq_id?: string;
  }
}

export function initMetaPixel(pixelId?: string | null) {
  if (typeof window === "undefined") return;
  if (!pixelId) return;
  if (window.__fbq_id === pixelId && typeof window.fbq === "function") return;

  // Standard FB Pixel bootstrap
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

  window.__fbq_id = pixelId;
  try {
    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
  } catch {}
}

export function fbTrack(event: string, params?: Record<string, any>) {
  if (typeof window === "undefined") return;
  try { window.fbq?.("track", event, params ?? {}); } catch {}
}

export function fbPageView() { fbTrack("PageView"); }
