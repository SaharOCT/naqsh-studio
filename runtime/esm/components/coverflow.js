// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
var list = (p, k) => str(p, k).split(/\n|\|/).map((s) => s.trim()).filter(Boolean);
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function safeURL(u) {
  const s = u.trim();
  if (/^https?:\/\//i.test(s) || /^\/\//.test(s) || /^data:(image|video|model)\//i.test(s) || /^blob:/i.test(s)) return s;
  if (/^[\w./%-][\w./%~-]*$/.test(s) && !s.includes(":")) return s;
  return "";
}
var clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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
var PALETTES = [
  ["#0f0c29", "#ff6a3d", "#ffd36e"],
  ["#06121f", "#2bd9c4", "#5b6cff"],
  ["#1a0b2e", "#c13cff", "#ff8fd8"],
  ["#0b1a12", "#7dff9b", "#e6ff6e"],
  ["#140d06", "#ff9d2e", "#ff4d4d"],
  ["#050816", "#3d7bff", "#9ad1ff"],
  ["#1d0f0f", "#ff5c8a", "#ffc2a8"],
  ["#0a0a0a", "#f2f2f2", "#8a8a8a"],
  ["#071a1f", "#00c2ff", "#00ffa3"],
  ["#1b1206", "#e0b15a", "#7a4b1f"],
  ["#0d0221", "#ff2a6d", "#05d9e8"],
  ["#10141c", "#a6b8ff", "#ffe08a"]
];
function artwork(i, label = "") {
  const [bg, a, b] = PALETTES[(i % PALETTES.length + PALETTES.length) % PALETTES.length];
  const r = (n) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453 % 1 + 1) % 1;
  const circles = Array.from({ length: 4 }, (_, k) => {
    const cx = Math.round(r(k) * 800), cy = Math.round(r(k + 9) * 600), rad = Math.round(120 + r(k + 3) * 260);
    return `<circle cx='${cx}' cy='${cy}' r='${rad}' fill='${k % 2 ? a : b}' opacity='${(0.45 + r(k + 5) * 0.5).toFixed(2)}'/>`;
  }).join("");
  const lines = Array.from({ length: 9 }, (_, k) => `<path d='M0 ${80 + k * 60} Q400 ${40 + k * 60 + r(k) * 90} 800 ${80 + k * 60}' stroke='white' stroke-opacity='.08' fill='none'/>`).join("");
  const text = label ? `<text x='40' y='560' font-family='system-ui,sans-serif' font-size='34' font-weight='600' fill='white' opacity='.9'>${escapeHTML(label)}</text>` : "";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' preserveAspectRatio='xMidYMid slice'><defs><filter id='b'><feGaussianBlur stdDeviation='70'/></filter></defs><rect width='800' height='600' fill='${bg}'/><g filter='url(#b)'>${circles}</g>${lines}${text}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function resolveImage(src, i = 0) {
  const m = /^art:(\d+)$/.exec(src.trim());
  if (m) return artwork(Number(m[1]));
  return safeURL(src) || artwork(i);
}
function springValue(initial = 0, stiffness = 170, damping = 22) {
  const s = { value: initial, target: initial, velocity: 0 };
  return {
    s,
    set(t) {
      s.target = t;
    },
    jump(v) {
      s.value = s.target = v;
      s.velocity = 0;
    },
    step(dt) {
      const h = Math.min(dt, 1 / 30);
      const a = -stiffness * (s.value - s.target) - damping * s.velocity;
      s.velocity += a * h;
      s.value += s.velocity * h;
      return s.value;
    },
    get settled() {
      return Math.abs(s.value - s.target) < 1e-3 && Math.abs(s.velocity) < 1e-3;
    }
  };
}

// src/library/items/coverflow/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  el.tabIndex = 0;
  el.style.touchAction = "pan-y";
  el.style.perspective = "1200px";
  el.style.cursor = "grab";
  const stage = document.createElement("div");
  stage.style.cssText = "position:absolute;inset:0;transform-style:preserve-3d";
  const cap = document.createElement("div");
  cap.style.cssText = "position:absolute;inset-inline:0;bottom:6%;text-align:center;font-weight:600;font-size:18px;letter-spacing:-.01em";
  el.append(stage, cap);
  const pos = springValue(0, 140, 22);
  let items = [], drag = false, lastX = 0, vel = 0;
  const build = () => {
    const im = list(p, "images"), s = num(p, "size", 260), refl = bool(p, "reflection", true);
    stage.innerHTML = im.map((src, i) => `<div data-i="${i}" style="position:absolute;left:50%;top:44%;width:${s}px;height:${s}px;margin:${-s / 2}px 0 0 ${-s / 2}px;border-radius:12px;overflow:hidden;cursor:pointer;will-change:transform;box-shadow:0 30px 60px -25px rgba(0,0,0,.7);${refl ? "-webkit-box-reflect:below 6px linear-gradient(transparent 65%,rgba(255,255,255,.22));" : ""}"><img alt="" draggable="false" src="${resolveImage(src, i)}" style="width:100%;height:100%;object-fit:cover;pointer-events:none"></div>`).join("");
    items = Array.from(stage.children);
    items.forEach((it) => it.onclick = () => {
      if (Math.abs(vel) < 2) pos.set(Number(it.dataset.i));
    });
    cap.style.color = str(p, "text");
  };
  build();
  const down = (e) => {
    drag = true;
    lastX = e.clientX;
    vel = 0;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  };
  const move = (e) => {
    if (!drag) return;
    const dx = (e.clientX - lastX) / (num(p, "size", 260) * num(p, "gap", 0.42));
    lastX = e.clientX;
    vel = dx * 60;
    pos.jump(pos.s.value - dx);
  };
  const up = () => {
    if (!drag) return;
    drag = false;
    el.style.cursor = "grab";
    pos.set(clamp(Math.round(pos.s.value - vel * 0.12), 0, items.length - 1));
  };
  const key = (e) => {
    if (e.key === "ArrowRight") pos.set(clamp(Math.round(pos.s.target) + 1, 0, items.length - 1));
    if (e.key === "ArrowLeft") pos.set(clamp(Math.round(pos.s.target) - 1, 0, items.length - 1));
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("keydown", key);
  pos.jump(Math.floor(list(p, "images").length / 2));
  const loop = createLoop(el, ctx, (dt) => {
    const v = drag ? pos.s.value : pos.step(dt || 1 / 60);
    const s = num(p, "size", 260), gap = num(p, "gap", 0.42), ang = num(p, "angle", 55);
    items.forEach((it, i) => {
      const d = i - v, ad = Math.abs(d), sgn = Math.sign(d);
      const x = d * s * gap + sgn * Math.min(ad, 1) * s * 0.35;
      const rot = -sgn * Math.min(ad, 1) * ang;
      const z = -Math.min(ad, 1) * s * 0.6 - ad * 10;
      it.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${rot}deg)`;
      it.style.zIndex = String(1e3 - Math.round(ad * 10));
      it.style.filter = `brightness(${1 - Math.min(ad, 3) * 0.18})`;
    });
    const c = list(p, "captions")[clamp(Math.round(v), 0, items.length - 1)] ?? "";
    if (cap.textContent !== c) cap.textContent = c;
  }, { allowReduced: true });
  void escapeHTML;
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("keydown", key);
    stage.remove();
    cap.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
