// Default avatars (DiceBear) — no extra dependency, just URLs.
export function userAvatar(seed: string | null | undefined): string {
  const s = encodeURIComponent((seed ?? "user").trim() || "user");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf`;
}

export function adminAvatar(): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=ativosfy-suporte&backgroundType=gradientLinear&backgroundColor=638cff,4f46e5`;
}
