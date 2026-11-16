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

// src/library/items/cursor-trail/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const cv = createCanvas(el, () => {
  }, 2);
  const g = cv.canvas.getContext("2d");
  const ptr = trackPointer(el);
  let pts = [];
  const seed = () => {
    pts = Array.from({ length: Math.round(num(p, "points", 26)) }, () => ({ x: cv.width / 2, y: cv.height / 2 }));
  };
  seed();
  const loop = createLoop(el, ctx, (_dt, t) => {
    const W = cv.width, H = cv.height;
    g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (str(p, "bg")) {
      g.fillStyle = str(p, "bg");
      g.fillRect(0, 0, W, H);
    }
    const tx = ptr.state.inside ? ptr.state.px : W / 2 + Math.cos(t * 1.3) * W * 0.3;
    const ty = ptr.state.inside ? ptr.state.py : H / 2 + Math.sin(t * 2.1) * H * 0.25;
    const k = num(p, "stiffness", 0.45);
    pts[0].x = lerp(pts[0].x, tx, k);
    pts[0].y = lerp(pts[0].y, ty, k);
    for (let i = 1; i < pts.length; i++) {
      pts[i].x = lerp(pts[i].x, pts[i - 1].x, k);
      pts[i].y = lerp(pts[i].y, pts[i - 1].y, k);
    }
    const A = hexToRgb(str(p, "c1")), B = hexToRgb(str(p, "c2")), w = num(p, "width", 16);
    g.lineCap = "round";
    for (let i = pts.length - 1; i > 0; i--) {
      const f = 1 - i / pts.length;
      g.strokeStyle = `rgba(${[0, 1, 2].map((j) => Math.round(lerp(B[j], A[j], f) * 255)).join(",")},${f})`;
      g.lineWidth = Math.max(0.5, w * f);
      g.beginPath();
      g.moveTo(pts[i].x, pts[i].y);
      g.lineTo(pts[i - 1].x, pts[i - 1].y);
      g.stroke();
    }
  });
  return {
    update(n) {
      const re = n.points !== void 0 && n.points !== p.points;
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
