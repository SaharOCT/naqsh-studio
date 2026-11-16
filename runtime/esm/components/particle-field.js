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

// src/library/items/particle-field/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let pts = [];
  const cv = createCanvas(el, () => seed(), 2);
  const g = cv.canvas.getContext("2d");
  const ptr = trackPointer(el);
  function seed() {
    const n = Math.round(num(p, "count", 90));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20 }));
  }
  seed();
  const loop = createLoop(el, ctx, (dt) => {
    const W = cv.width, H = cv.height, sp = num(p, "speed", 1), L = num(p, "link", 120), mode = str(p, "mode", "repel");
    g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    g.fillStyle = str(p, "bg");
    g.fillRect(0, 0, W, H);
    const col = str(p, "color");
    for (const a of pts) {
      if (ptr.state.inside && mode !== "none") {
        const dx = a.x - ptr.state.px, dy = a.y - ptr.state.py, d2 = dx * dx + dy * dy;
        if (d2 < 22e3) {
          const f = (mode === "repel" ? 1 : -1) * (1 - d2 / 22e3) * 600 * dt;
          const d = Math.sqrt(d2) || 1;
          a.vx += dx / d * f;
          a.vy += dy / d * f;
        }
      }
      a.vx *= 0.985;
      a.vy *= 0.985;
      a.vx += (Math.random() - 0.5) * 2 * dt * 10;
      a.vy += (Math.random() - 0.5) * 2 * dt * 10;
      a.x += a.vx * dt * sp;
      a.y += a.vy * dt * sp;
      if (a.x < 0) a.x += W;
      if (a.x > W) a.x -= W;
      if (a.y < 0) a.y += H;
      if (a.y > H) a.y -= H;
    }
    g.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
      if (d < L) {
        g.strokeStyle = rgba(col, (1 - d / L) * 0.45);
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
    }
    g.fillStyle = col;
    for (const a of pts) {
      g.beginPath();
      g.arc(a.x, a.y, 1.6, 0, Math.PI * 2);
      g.fill();
    }
  });
  return {
    update(n) {
      const reseed = n.count !== void 0 && n.count !== p.count;
      p = { ...p, ...n };
      if (reseed) seed();
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
