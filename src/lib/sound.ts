// Lightweight Web Audio sound effects — no asset downloads.
// Respects a global on/off flag from site_settings (sounds_enabled)
// and a localStorage user override.

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function setSoundsEnabled(v: boolean) {
  enabled = v;
}
export function getSoundsEnabled() {
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("sounds_off");
    if (local === "1") return false;
  }
  return enabled;
}

function tone(freq: number, durMs: number, type: OscillatorType = "sine", gain = 0.08, when = 0) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

export function playAddToCart() {
  if (!getSoundsEnabled()) return;
  tone(880, 90, "triangle", 0.07);
  tone(1320, 110, "triangle", 0.06, 0.07);
}

export function playSuccess() {
  if (!getSoundsEnabled()) return;
  tone(523.25, 120, "sine", 0.08); // C5
  tone(659.25, 130, "sine", 0.08, 0.1); // E5
  tone(783.99, 220, "sine", 0.09, 0.22); // G5
}

export function playMessage() {
  if (!getSoundsEnabled()) return;
  tone(680, 70, "sine", 0.06);
  tone(960, 90, "sine", 0.06, 0.06);
}

export function playClick() {
  if (!getSoundsEnabled()) return;
  tone(420, 40, "square", 0.04);
}

// Looping phone ring — returns a stop function.
// Plays a classic two-tone ring (≈ 440/480 Hz) for ~1.2s, pauses ~0.8s, repeats.
export function startPhoneRing(): () => void {
  if (!getSoundsEnabled()) return () => {};
  let stopped = false;
  let timer: number | null = null;
  const ringOnce = () => {
    if (stopped) return;
    const dur = 1200;
    tone(440, dur, "sine", 0.09);
    tone(480, dur, "sine", 0.09, 0.005);
    timer = window.setTimeout(ringOnce, dur + 800);
  };
  ringOnce();
  return () => {
    stopped = true;
    if (timer) window.clearTimeout(timer);
  };
}

