import { useEffect, useRef } from "react";

const BLOBS_DARK = [
  { color: "#4c1d95", radius: 460, duration: 78000 }, // deep purple
  { color: "#7c3aed", radius: 420, duration: 86000 }, // violet
  { color: "#9333ea", radius: 380, duration: 64000 }, // magenta-purple
  { color: "#2e1065", radius: 340, duration: 72000 }, // dark plum
  { color: "#0a0010", radius: 500, duration: 90000 }, // near-black
  { color: "#ffffff", radius: 520, duration: 120000 }, // slow white contrast
];

// Light-mode pastel palette — soft lavender, pale blue, light mint
const BLOBS_LIGHT = [
  { color: "#d8b4fe", radius: 460, duration: 78000 }, // soft lilac
  { color: "#e9d5ff", radius: 420, duration: 86000 }, // pale violet
  { color: "#c4b5fd", radius: 380, duration: 64000 }, // lavender
  { color: "#f3e8ff", radius: 340, duration: 72000 }, // airy purple haze
  { color: "#ede9fe", radius: 500, duration: 90000 }, // whisper violet
];

// Cubic bezier through 4 control points, looped
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

type Path = {
  xs: [number, number, number, number];
  ys: [number, number, number, number];
  opacityBase: number;
  opacityAmp: number;
  pulsePhase: number;
  pulseDuration: number;
};

function makePath(seed: number, w: number, h: number): Path {
  const rand = (n: number) => {
    const x = Math.sin(seed * 9301 + n * 49297) * 233280;
    return x - Math.floor(x);
  };
  const pad = -150;
  const pt = (i: number): [number, number] => [
    pad + rand(i) * (w - pad * 2),
    pad + rand(i + 100) * (h - pad * 2),
  ];
  const [x0, y0] = pt(1);
  const [x1, y1] = pt(2);
  const [x2, y2] = pt(3);
  const [x3, y3] = pt(4);
  return {
    xs: [x0, x1, x2, x3],
    ys: [y0, y1, y2, y3],
    opacityBase: 0.15 + rand(5) * 0.07,
    opacityAmp: 0.03 + rand(6) * 0.03,
    pulsePhase: rand(7) * Math.PI * 2,
    pulseDuration: 14000 + rand(8) * 10000,
  };
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isLight = document.documentElement.classList.contains("light");
    const themeObserver = new MutationObserver(() => {
      isLight = document.documentElement.classList.contains("light");
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let paths: Path[] = BLOBS_DARK.map((_, i) =>
      makePath(i + 1, window.innerWidth, window.innerHeight),
    );

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paths = BLOBS_DARK.map((_, i) => makePath(i + 1, width, height));
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let raf = 0;

    // Mouse-follow state — lerp blob cluster center toward cursor with ~3s lag
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let offsetX = 0;
    let offsetY = 0;
    let lastFrame = performance.now();
    const TAU_MS = 3000; // 3-second time constant

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      document.body.style.setProperty("--mouse-x", `${mouseX}px`);
      document.body.style.setProperty("--mouse-y", `${mouseY}px`);
    };
    window.addEventListener("mousemove", onMouseMove);

    const draw = (now: number) => {
      const elapsed = now - start;
      const dt = Math.min(now - lastFrame, 64);
      lastFrame = now;
      // Exponential smoothing — alpha approaches 1 over ~TAU_MS
      const alpha = 1 - Math.exp(-dt / TAU_MS);
      const targetX = mouseX - width / 2;
      const targetY = mouseY - height / 2;
      offsetX += (targetX - offsetX) * alpha;
      offsetY += (targetY - offsetY) * alpha;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const palette = isLight ? BLOBS_LIGHT : BLOBS_DARK;
      for (let i = 0; i < palette.length; i++) {
        const blob = palette[i];
        const path = paths[i];
        // ping-pong t for smooth loop
        const raw = (elapsed % blob.duration) / blob.duration;
        const t = raw < 0.5 ? raw * 2 : (1 - raw) * 2;
        const x = cubicBezier(t, path.xs[0], path.xs[1], path.xs[2], path.xs[3]) + offsetX * 0.35;
        const y = cubicBezier(t, path.ys[0], path.ys[1], path.ys[2], path.ys[3]) + offsetY * 0.35;

        const pulse = Math.sin((elapsed / path.pulseDuration) * Math.PI * 2 + path.pulsePhase);
        const isWhite = blob.color === "#ffffff";
        const opacity = isLight
          ? Math.max(0.07, Math.min(0.1, 0.085 + pulse * 0.015))
          : isWhite
            ? 0.06
            : Math.max(0.25, Math.min(0.35, 0.3 + pulse * 0.05));
        const radius = blob.radius * (1 + pulse * 0.08);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, hexToRgba(blob.color, opacity));
        grad.addColorStop(0.6, hexToRgba(blob.color, opacity * 0.35));
        grad.addColorStop(1, hexToRgba(blob.color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="animated-bg-grain absolute inset-0" />
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}