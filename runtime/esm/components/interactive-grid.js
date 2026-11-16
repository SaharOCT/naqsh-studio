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

// src/library/items/interactive-grid/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const cv = createCanvas(el, () => {
  }, 2);
  const g = cv.canvas.getContext("2d");
  const ptr = trackPointer(el);
  let mx = -9999, my = -9999;
  const loop = createLoop(el, ctx, (_dt, t) => {
    const W = cv.width, H = cv.height, gap = num(p, "gap", 22), R = num(p, "radius", 160);
    g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    g.fillStyle = str(p, "bg");
    g.fillRect(0, 0, W, H);
    const tx = ptr.state.inside ? ptr.state.px : -9999, ty = ptr.state.inside ? ptr.state.py : -9999;
    mx = mx < -999 ? tx : lerp(mx, tx, 0.15);
    my = my < -999 ? ty : lerp(my, ty, 0.15);
    const [dr, dg, db] = hexToRgb(str(p, "dot")), [gr, gg, gb] = hexToRgb(str(p, "glow"));
    const sp = num(p, "speed", 1), rip = bool(p, "ripple", true);
    for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) {
      const d = Math.hypot(x - mx, y - my);
      let k = Math.max(0, 1 - d / R);
      if (rip) k = Math.max(k, 0.5 * Math.max(0, Math.sin(Math.hypot(x - W / 2, y - H / 2) / 40 - t * sp * 3)) ** 8);
      const r = 1.1 + k * 2.6;
      const c = (a, b) => Math.round(lerp(a, b, k) * 255);
      g.fillStyle = `rgb(${c(dr, gr)},${c(dg, gg)},${c(db, gb)})`;
      g.beginPath();
      g.arc(x + (x - mx) * k * 0.08, y + (y - my) * k * 0.08, r, 0, 6.283);
      g.fill();
    }
  });
  return { update(n) {
    p = { ...p, ...n };
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    ptr.destroy();
    cv.destroy();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
