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

// src/library/items/ripple-water/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let cols = 0, rows = 0, a = new Float32Array(0), b = new Float32Array(0), img = null;
  const off = document.createElement("canvas");
  const octx = off.getContext("2d");
  const setup = () => {
    const cell = Math.max(2, Math.round(num(p, "resolution", 4)));
    cols = Math.max(8, Math.ceil(cv.width / cell));
    rows = Math.max(8, Math.ceil(cv.height / cell));
    a = new Float32Array(cols * rows);
    b = new Float32Array(cols * rows);
    off.width = cols;
    off.height = rows;
    img = octx.createImageData(cols, rows);
  };
  const cv = createCanvas(el, () => setup(), 1);
  const g = cv.canvas.getContext("2d");
  setup();
  const drop = (cx, cy, s = 220, r = 2) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const ix = cx + x, iy = cy + y;
      if (ix > 0 && iy > 0 && ix < cols - 1 && iy < rows - 1) a[iy * cols + ix] = s;
    }
  };
  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    drop(Math.floor((e.clientX - r.left) / r.width * cols), Math.floor((e.clientY - r.top) / r.height * rows), e.type === "pointerdown" ? 600 : 160, e.type === "pointerdown" ? 3 : 1);
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerdown", onMove);
  const loop = createLoop(el, ctx, (dt) => {
    if (!img) return;
    if (Math.random() < num(p, "rain", 0.6) * dt * 6) drop(1 + Math.floor(Math.random() * (cols - 2)), 1 + Math.floor(Math.random() * (rows - 2)), 300, 1);
    const damp = num(p, "damping", 0.975);
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x;
      b[i] = ((a[i - 1] + a[i + 1] + a[i - cols] + a[i + cols]) / 2 - b[i]) * damp;
    }
    [a, b] = [b, a];
    const [dr, dg, db] = hexToRgb(str(p, "deep")), [lr, lg, lb] = hexToRgb(str(p, "light"));
    const d = img.data;
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x;
      const shade = Math.max(-1, Math.min(1, (a[i - 1] - a[i + 1] + a[i - cols] - a[i + cols]) / 160));
      const k = Math.max(0, shade);
      const o = i * 4;
      d[o] = (dr + (lr - dr) * k + shade * 0.08) * 255;
      d[o + 1] = (dg + (lg - dg) * k + shade * 0.08) * 255;
      d[o + 2] = (db + (lb - db) * k + shade * 0.1) * 255;
      d[o + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(off, 0, 0, cv.canvas.width, cv.canvas.height);
  });
  return {
    update(n) {
      const re = n.resolution !== void 0 && n.resolution !== p.resolution;
      p = { ...p, ...n };
      if (re) setup();
    },
    setSpeed: loop.setSpeed,
    destroy() {
      loop.destroy();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onMove);
      cv.destroy();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
