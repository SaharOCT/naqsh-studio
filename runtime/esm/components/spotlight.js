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
var lerp = (a, b, t) => a + (b - a) * t;
function prepareHost(el, opts = {}) {
  const cs = getComputedStyle(el);
  if (cs.position === "static") el.style.position = "relative";
  if (opts.clip !== false) el.style.overflow = "hidden";
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

// src/library/items/spotlight/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  const layer = document.createElement("div");
  const light = document.createElement("div");
  [layer, light].forEach((d) => Object.assign(d.style, { position: "absolute", inset: "0", pointerEvents: "none" }));
  el.prepend(light);
  el.prepend(layer);
  const ptr = trackPointer(el);
  let x = 0.5, y = 0.35;
  const paint = () => {
    const gs = num(p, "gridSize", 48), gc = rgba(str(p, "grid"), 0.07);
    layer.style.background = str(p, "bg");
    layer.style.backgroundImage = gs > 0 ? `linear-gradient(${gc} 1px, transparent 1px), linear-gradient(90deg, ${gc} 1px, transparent 1px)` : "none";
    layer.style.backgroundSize = `${gs}px ${gs}px`;
  };
  paint();
  const loop = createLoop(el, ctx, (dt) => {
    const e = num(p, "ease", 0.12);
    const tx = ptr.state.inside ? ptr.state.x : 0.5 + Math.sin(performance.now() / 2400) * 0.25;
    const ty = ptr.state.inside ? ptr.state.y : 0.35;
    x = lerp(x, tx, dt ? e : 1);
    y = lerp(y, ty, dt ? e : 1);
    const s = num(p, "size", 420);
    light.style.background = `radial-gradient(${s}px circle at ${x * 100}% ${y * 100}%, ${rgba(str(p, "light"), 0.22)}, ${rgba(str(p, "light"), 0.06)} 40%, transparent 70%)`;
  });
  return { update(n) {
    p = { ...p, ...n };
    paint();
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    ptr.destroy();
    layer.remove();
    light.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
