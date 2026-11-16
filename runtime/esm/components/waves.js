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
var lerp = (a, b, t) => a + (b - a) * t;
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

// src/library/items/waves/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const cv = createCanvas(el, () => {
  }, 2);
  const g = cv.canvas.getContext("2d");
  const loop = createLoop(el, ctx, (_dt, t) => {
    const W = cv.width, H = cv.height, n = Math.round(num(p, "layers", 5)), A = num(p, "amplitude", 28), sp = num(p, "speed", 1);
    g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    g.fillStyle = str(p, "bg");
    g.fillRect(0, 0, W, H);
    const a = hexToRgb(str(p, "c2")), b = hexToRgb(str(p, "c1"));
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 1 : i / (n - 1);
      const base = H * num(p, "level", 0.55) + k * H * 0.3;
      const c = [0, 1, 2].map((j) => Math.round(lerp(a[j], b[j], k) * 255));
      g.fillStyle = `rgba(${c.join(",")},${0.35 + k * 0.5})`;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const y = base + Math.sin(x * (6e-3 + i * 15e-4) + t * sp * (0.6 + k * 0.8) + i * 1.3) * A * (0.6 + k * 0.6) + Math.sin(x * 0.017 - t * sp * 1.1 + i) * A * 0.25;
        g.lineTo(x, y);
      }
      g.lineTo(W, H);
      g.closePath();
      g.fill();
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
