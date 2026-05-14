import { useEffect, useRef } from "react";

/**
 * Animated starfield + constellation canvas (Brenin-style).
 * Pure visual, fixed full-screen, behind all content.
 */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let stars: { x: number; y: number; r: number; vx: number; vy: number; a: number }[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(160, Math.floor((w * h) / 12000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        a: Math.random() * 0.6 + 0.3,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // links between near stars (constellations)
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const t = stars[j];
          const dx = s.x - t.x;
          const dy = s.y - t.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            const alpha = (1 - Math.sqrt(d2) / 120) * 0.18;
            ctx.strokeStyle = `rgba(99,140,255,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(t.x, t.y);
            ctx.stroke();
          }
        }
      }

      // stars
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = w;
        if (s.x > w) s.x = 0;
        if (s.y < 0) s.y = h;
        if (s.y > h) s.y = 0;
        ctx.fillStyle = `rgba(180,210,255,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 h-full w-full" aria-hidden />;
}
