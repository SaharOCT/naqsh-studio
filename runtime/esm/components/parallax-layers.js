// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function hexToRgb(hex) {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [1, 1, 1];
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
var clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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
function viewProgress(el) {
  const r = el.getBoundingClientRect(), vh = window.innerHeight || 1;
  return clamp((vh - r.top) / (vh + r.height), 0, 1);
}

// src/library/items/parallax-layers/runtime.ts
var ridge = (seed, base, amp) => {
  let d = `M0 600 L0 ${base}`;
  for (let x = 0; x <= 1200; x += 40) d += ` L${x} ${base - Math.abs(Math.sin(x * 4e-3 * seed + seed) * amp + Math.sin(x * 0.013 + seed * 3) * amp * 0.35)}`;
  return d + " L1200 600 Z";
};
var mix = (a, b, t) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${[0, 1, 2].map((i) => Math.round(lerp(A[i], B[i], t) * 255)).join(",")})`;
};
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  const scene = document.createElement("div");
  scene.style.cssText = "position:absolute;inset:0";
  el.prepend(scene);
  const ptr = trackPointer(el);
  const LAYERS = 5;
  const build = () => {
    const layers = Array.from({ length: LAYERS }, (_, i) => {
      const t = i / (LAYERS - 1);
      return `<svg data-d="${i}" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" style="position:absolute;inset:-8% -4% -2%;width:108%;height:110%;will-change:transform"><path d="${ridge(1.3 + i * 0.7, 330 + i * 55, 120 - i * 12)}" fill="${mix(str(p, "sky2"), str(p, "land"), 0.35 + t * 0.65)}"/></svg>`;
    });
    layers.splice(2, 0, `<h2 data-d="title" style="position:absolute;inset-inline:0;top:24%;margin:0;text-align:center;color:#fff;font-size:clamp(32px,7vw,88px);font-weight:800;letter-spacing:-.03em;will-change:transform;text-shadow:0 10px 40px rgba(0,0,0,.25)">${escapeHTML(str(p, "title"))}</h2>`);
    scene.style.background = `linear-gradient(${str(p, "sky1")}, ${str(p, "sky2")})`;
    scene.innerHTML = `<div data-d="sun" style="position:absolute;left:50%;top:38%;width:180px;height:180px;margin-left:-90px;border-radius:50%;background:radial-gradient(#fff6d6,#ffb36b 60%,transparent 70%);filter:blur(1px)"></div>` + layers.join("");
  };
  build();
  let mx = 0, my = 0;
  const loop = createLoop(el, ctx, () => {
    const prog = viewProgress(el) - 0.5, k = num(p, "depth", 1);
    if (bool(p, "mouse", true) && ptr.state.inside) {
      mx = lerp(mx, ptr.state.x - 0.5, 0.06);
      my = lerp(my, ptr.state.y - 0.5, 0.06);
    }
    scene.querySelectorAll("[data-d]").forEach((n) => {
      const d = n.getAttribute("data-d");
      const depth = d === "sun" ? 0.1 : d === "title" ? 0.45 : (Number(d) + 1) / LAYERS;
      n.style.transform = `translate3d(${-mx * 40 * depth * k}px, ${prog * -160 * depth * k + -my * 20 * depth * k}px, 0)`;
    });
  }, { allowReduced: false });
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    ptr.destroy();
    scene.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
