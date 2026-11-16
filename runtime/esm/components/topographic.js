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
function makeNoise(seed = 1) {
  const perm = new Uint8Array(512);
  let s = seed * 9301 + 49297;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y) => (h & 1 ? -x : x) + (h & 2 ? -y : y);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    return lerp(lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u), lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v);
  };
}

// src/library/items/topographic/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const noise = makeNoise(7);
  const cv = createCanvas(el, () => {
  }, 1.5);
  const g = cv.canvas.getContext("2d");
  const CELL = 10;
  const loop = createLoop(el, ctx, (_dt, t) => {
    const W = cv.width, H = cv.height, sc = num(p, "scale", 6e-3), lv = Math.round(num(p, "levels", 12)), z = t * num(p, "speed", 0.5) * 0.3;
    g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
    g.fillStyle = str(p, "bg");
    g.fillRect(0, 0, W, H);
    const cols = Math.ceil(W / CELL) + 1, rows = Math.ceil(H / CELL) + 1;
    const f = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const X = x * CELL * sc, Y = y * CELL * sc;
      f[y * cols + x] = noise(X + z, Y - z * 0.6) * 0.7 + noise(X * 2.1 - z, Y * 2.1) * 0.3;
    }
    for (let l = 0; l < lv; l++) {
      const iso = -0.6 + 1.2 * (l + 0.5) / lv;
      g.strokeStyle = rgba(str(p, "line"), l % 4 === 0 ? 0.55 : 0.22);
      g.lineWidth = l % 4 === 0 ? 1.2 : 0.8;
      g.beginPath();
      for (let y = 0; y < rows - 1; y++) for (let x = 0; x < cols - 1; x++) {
        const a = f[y * cols + x], b = f[y * cols + x + 1], c = f[(y + 1) * cols + x + 1], d = f[(y + 1) * cols + x];
        const code = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const px = x * CELL, py = y * CELL;
        const it = (v1, v2) => (iso - v1) / (v2 - v1 || 1e-6);
        const T = [px + it(a, b) * CELL, py], R = [px + CELL, py + it(b, c) * CELL], B = [px + it(d, c) * CELL, py + CELL], Lp = [px, py + it(a, d) * CELL];
        const seg = (p1, p2) => {
          g.moveTo(p1[0], p1[1]);
          g.lineTo(p2[0], p2[1]);
        };
        switch (code) {
          case 1:
          case 14:
            seg(Lp, B);
            break;
          case 2:
          case 13:
            seg(B, R);
            break;
          case 3:
          case 12:
            seg(Lp, R);
            break;
          case 4:
          case 11:
            seg(T, R);
            break;
          case 5:
            seg(Lp, T);
            seg(B, R);
            break;
          case 6:
          case 9:
            seg(T, B);
            break;
          case 7:
          case 8:
            seg(Lp, T);
            break;
          case 10:
            seg(T, R);
            seg(Lp, B);
            break;
        }
      }
      g.stroke();
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
