// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
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
function trackPointer(el) {
  const state = { x: 0.5, y: 0.5, px: 0, py: 0, inside: false, down: false };
  const move = (e) => {
    const r = el.getBoundingClientRect();
    state.px = e.clientX - r.left;
    state.py = e.clientY - r.top;
    state.x = state.px / Math.max(1, r.width);
    state.y = state.py / Math.max(1, r.height);
    state.inside = state.x >= 0 && state.x <= 1 && state.y >= 0 && state.y <= 1;
  };
  const leave = () => state.inside = false;
  const down = () => state.down = true;
  const up = () => state.down = false;
  window.addEventListener("pointermove", move, { passive: true });
  el.addEventListener("pointerleave", leave);
  el.addEventListener("pointerdown", down);
  window.addEventListener("pointerup", up);
  return {
    state,
    destroy() {
      window.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    }
  };
}

// src/library/items/starfield/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let stars = [];
  const cv = createCanvas(el, () => {
  }, 2);
  const g = cv.canvas.getContext("2d");
  const ptr = trackPointer(el);
  let warp = 0;
  const seed = () => {
    stars = Array.from({ length: Math.round(num(p, "count", 600)) }, () => {
      const z = Math.random();
      return { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z, pz: z };
    });
  };
  seed();
  const loop = createLoop(el, ctx, (dt) => {
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, f = Math.max(W, H) * 0.5 * num(p, "depth", 1);
    warp = lerp(warp, bool(p, "warp", true) && ptr.state.down && ptr.state.inside ? 1 : 0, 0.06);
    g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    g.fillStyle = rgba(str(p, "bg"), 0.35 + (1 - warp) * 0.65);
    g.fillRect(0, 0, W, H);
    const v = (0.08 + warp * 1.4) * num(p, "speed", 1) * dt, col = str(p, "color");
    g.strokeStyle = col;
    g.fillStyle = col;
    for (const s of stars) {
      s.pz = s.z;
      s.z -= v;
      if (s.z <= 0.01) {
        s.x = Math.random() * 2 - 1;
        s.y = Math.random() * 2 - 1;
        s.z = s.pz = 1;
      }
      const sx = cx + s.x / s.z * f, sy = cy + s.y / s.z * f;
      const px = cx + s.x / s.pz * f, py = cy + s.y / s.pz * f;
      const r = Math.max(0.3, (1 - s.z) * 2);
      g.globalAlpha = Math.min(1, (1 - s.z) * 1.5);
      if (warp > 0.05) {
        g.lineWidth = r;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(sx, sy);
        g.stroke();
      } else {
        g.beginPath();
        g.arc(sx, sy, r, 0, 6.283);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  });
  return {
    update(n) {
      const re = n.count !== void 0 && n.count !== p.count;
      p = { ...p, ...n };
      if (re) seed();
    },
    setSpeed: loop.setSpeed,
    destroy() {
      loop.destroy();
      ptr.destroy();
      cv.destroy();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
