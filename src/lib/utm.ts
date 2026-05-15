// Captura e persiste UTM para atribuição de origem (site/anúncios)
const KEY = "utm_v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

type Stored = { source: string; medium?: string; campaign?: string; ts: number };

const AD_SOURCES = new Set(["facebook", "fb", "instagram", "ig", "google", "tiktok", "kwai", "youtube", "ads"]);
const AD_MEDIUMS = new Set(["cpc", "ppc", "paid", "ads", "social-paid", "paidsocial"]);

export function captureUtmFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const source = url.searchParams.get("utm_source");
    const medium = url.searchParams.get("utm_medium") || undefined;
    const campaign = url.searchParams.get("utm_campaign") || undefined;
    if (!source) return;
    const data: Stored = { source: source.toLowerCase(), medium, campaign, ts: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function getTrafficSource(): string {
  if (typeof window === "undefined") return "site";
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as Stored;
      if (Date.now() - data.ts < TTL_MS) {
        const tag = [data.source, data.medium, data.campaign].filter(Boolean).join("|");
        if (AD_SOURCES.has(data.source) || (data.medium && AD_MEDIUMS.has(data.medium))) {
          return `ads:${tag}`;
        }
        return `utm:${tag}`;
      }
    }
    // Sem UTM → tenta referrer
    const ref = document.referrer || "";
    if (ref && !ref.includes(window.location.host)) {
      const host = new URL(ref).hostname.replace(/^www\./, "");
      if (host.includes("facebook") || host.includes("instagram") || host.includes("fb.")) return "ads:facebook|organic";
      if (host.includes("google")) return "organic:google";
      return `referral:${host}`;
    }
    return "site";
  } catch {
    return "site";
  }
}
