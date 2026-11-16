// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
function hexToRgb(hex) {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [1, 1, 1];
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
var rgba = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
};
function prepareHost(el, opts = {}) {
  const cs = getComputedStyle(el);
  if (cs.position === "static") el.style.position = "relative";
  if (opts.clip !== false) el.style.overflow = "hidden";
}
function createCanvas(el, onResize, maxDpr = 2) {
  prepareHost(el);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
  el.prepend(canvas);
  const handle = {
    canvas,
    width: 1,
    height: 1,
    dpr: 1,
    destroy() {
      ro.disconnect();
      canvas.remove();
    }
  };
  const measure = (notify = true) => {
    const r = el.getBoundingClientRect();
    handle.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    handle.width = Math.max(1, Math.round(r.width));
    handle.height = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(handle.width * handle.dpr);
    canvas.height = Math.round(handle.height * handle.dpr);
    if (notify) onResize(handle);
  };
  const ro = new ResizeObserver(() => measure());
  ro.observe(el);
  measure(false);
  return handle;
}
function createLoop(el, ctx, tick, opts = {}) {
  let speed = ctx.speed ?? 1;
  let visible = true;
  let raf = 0;
  let last = 0;
  let time = 0;
  let dead = false;
  const frame = (now) => {
    raf = 0;
    if (dead) return;
    const dt = last ? Math.min(0.05, (now - last) / 1e3) * speed : 0;
    last = now;
    time += dt;
    tick(dt, time);
    schedule();
  };
  const running = () => visible && !document.hidden && !(ctx.reducedMotion && !opts.allowReduced);
  const schedule = () => {
    if (!raf && running()) raf = requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      last = 0;
      schedule();
    },
    { rootMargin: "100px" }
  );
  io.observe(el);
  const onVis = () => {
    last = 0;
    schedule();
  };
  document.addEventListener("visibilitychange", onVis);
  tick(0, 0);
  schedule();
  return {
    setSpeed(s) {
      speed = s;
    },
    get time() {
      return time;
    },
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    }
  };
}

// src/library/items/beams/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const cv = createCanvas(el, () => {
  }, 2);
  const g = cv.canvas.getContext("2d");
  const seeds = Array.from({ length: 64 }, () => ({ o: Math.random(), v: 0.5 + Math.random(), c: Math.random() > 0.5 }));
  const loop = createLoop(el, ctx, (_dt, t) => {
    const W = cv.width, H = cv.height, n = Math.round(num(p, "columns", 14)), len = num(p, "length", 0.35) * H, sp = num(p, "speed", 1);
    g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    g.fillStyle = str(p, "bg");
    g.fillRect(0, 0, W, H);
    const step = W / n;
    g.lineWidth = 1;
    for (let i = 0; i <= n; i++) {
      g.strokeStyle = rgba("#ffffff", 0.05);
      g.beginPath();
      g.moveTo(i * step + 0.5, 0);
      g.lineTo(i * step + 0.5, H);
      g.stroke();
    }
    for (let i = 0; i < n; i++) {
      const s = seeds[i % seeds.length];
      const y = (s.o + t * sp * 0.25 * s.v) % 1 * (H + len * 2) - len;
      const col = str(p, s.c ? "c1" : "c2");
      const grd = g.createLinearGradient(0, y - len, 0, y);
      grd.addColorStop(0, rgba(col, 0));
      grd.addColorStop(1, rgba(col, 0.95));
      g.fillStyle = grd;
      g.fillRect(i * step + step / 2 - 1, y - len, 2, len);
      g.fillStyle = rgba(col, 0.9);
      g.shadowColor = col;
      g.shadowBlur = 14;
      g.beginPath();
      g.arc(i * step + step / 2, y, 2.2, 0, 6.283);
      g.fill();
      g.shadowBlur = 0;
    }
  });
  return { update(n) {
    p = { ...p, ...n };
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    cv.destroy();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
