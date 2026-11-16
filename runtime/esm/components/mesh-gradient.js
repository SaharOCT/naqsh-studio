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

// src/library/items/mesh-gradient/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const cv = createCanvas(el, () => {
  }, 1);
  const g = cv.canvas.getContext("2d");
  const grain = document.createElement("div");
  const noise = document.createElement("canvas");
  noise.width = noise.height = 128;
  const nctx = noise.getContext("2d");
  const img = nctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  Object.assign(grain.style, { position: "absolute", inset: "0", pointerEvents: "none", backgroundImage: `url(${noise.toDataURL()})`, mixBlendMode: "overlay" });
  el.appendChild(grain);
  const loop = createLoop(el, ctx, (_dt, t) => {
    const s = t * num(p, "speed", 1) * 0.4;
    const W = cv.canvas.width, H = cv.canvas.height;
    grain.style.opacity = String(num(p, "grain", 0.08) * 4);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = str(p, "bg");
    g.fillRect(0, 0, W, H);
    g.filter = `blur(${Math.round(Math.min(W, H) * 0.12)}px)`;
    ["c1", "c2", "c3", "c4"].forEach((k, i) => {
      const a = s * (0.6 + i * 0.17) + i * 1.7;
      const x = W * (0.5 + 0.32 * Math.cos(a) * (i % 2 ? 1 : -1));
      const y = H * (0.5 + 0.3 * Math.sin(a * 1.3 + i));
      const r = Math.max(W, H) * (0.32 + 0.06 * Math.sin(a * 2));
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, rgba(str(p, k), 0.95));
      grd.addColorStop(1, rgba(str(p, k), 0));
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
    });
    g.filter = "none";
  });
  return { update(n) {
    p = { ...p, ...n };
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    grain.remove();
    cv.destroy();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
