// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
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

// src/library/items/elastic-slider/runtime.ts
var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  el.style.touchAction = "pan-y";
  el.style.cursor = "grab";
  el.tabIndex = 0;
  const track = document.createElement("div");
  track.style.cssText = "position:absolute;inset:0 0 56px;display:flex;align-items:center;will-change:transform;direction:ltr";
  const counter = document.createElement("div");
  counter.style.cssText = "position:absolute;inset-inline:0;bottom:12px;display:flex;justify-content:center;gap:18px;font:600 14px ui-monospace,monospace;height:22px;overflow:hidden";
  el.append(track, counter);
  const x = springValue(0, 180, 26);
  let slides = [], drag = false, lastX = 0, vel = 0, idx = 0, sw = 0;
  const build = () => {
    const im = list(p, "images");
    track.style.gap = `${num(p, "gap", 24)}px`;
    track.innerHTML = im.map((s, i) => `<div style="flex:0 0 ${num(p, "slideWidth", 62)}%;height:88%;border-radius:20px;overflow:hidden;will-change:transform"><img alt="" draggable="false" src="${resolveImage(s, i)}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;will-change:transform"></div>`).join("");
    slides = Array.from(track.children);
    counter.style.color = str(p, "text");
    measure();
    renderCounter();
  };
  const measure = () => {
    sw = (slides[0]?.getBoundingClientRect().width ?? 300) + num(p, "gap", 24);
  };
  const label = (i) => {
    const mode = str(p, "counter", "numbers"), n = slides.length;
    if (mode === "roman") return ROMAN[i] ?? String(i + 1);
    if (mode === "titles") return escapeHTML(list(p, "titles")[i] ?? "");
    return `${String(i + 1).padStart(2, "0")} <span style="opacity:.4">/ ${String(n).padStart(2, "0")}</span>`;
  };
  const renderCounter = () => {
    const prev = counter.firstElementChild;
    const next = document.createElement("span");
    next.innerHTML = label(idx);
    next.style.cssText = "display:inline-block";
    if (prev && !ctx.reducedMotion) {
      prev.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }], { duration: 380, easing: "cubic-bezier(.6,0,.2,1)" }).onfinish = () => prev.remove();
      next.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 480, easing: "cubic-bezier(.16,1,.3,1)" });
      next.style.position = "absolute";
      setTimeout(() => next.style.position = "", 400);
    } else prev?.remove();
    counter.appendChild(next);
  };
  const snapTo = (i) => {
    const n = slides.length;
    const ni = clamp(i, 0, n - 1);
    if (ni !== idx) {
      idx = ni;
      renderCounter();
    }
    x.set(-idx * sw);
  };
  const offsetCenter = () => (el.clientWidth - (sw - num(p, "gap", 24))) / 2;
  const down = (e) => {
    drag = true;
    lastX = e.clientX;
    vel = 0;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  };
  const move = (e) => {
    if (!drag) return;
    let dx = e.clientX - lastX;
    lastX = e.clientX;
    const min = -(slides.length - 1) * sw;
    if (x.s.value > 0 || x.s.value < min) dx *= 0.35;
    vel = dx * 60;
    x.jump(x.s.value + dx);
  };
  const up = () => {
    if (!drag) return;
    drag = false;
    el.style.cursor = "grab";
    snapTo(Math.round(-(x.s.value + vel * 0.18) / sw));
  };
  const key = (e) => {
    if (e.key === "ArrowRight") snapTo(idx + 1);
    if (e.key === "ArrowLeft") snapTo(idx - 1);
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("keydown", key);
  const ro = new ResizeObserver(() => {
    measure();
    x.jump(-idx * sw);
  });
  ro.observe(el);
  build();
  const loop = createLoop(el, ctx, (dt) => {
    const v = drag ? x.s.value : x.step(dt || 1 / 60);
    track.style.transform = `translate3d(${v + offsetCenter()}px,0,0)`;
    slides.forEach((s, i) => {
      const d = Math.abs(i + v / sw);
      s.style.transform = `scale(${1 - Math.min(d, 1) * 0.12})`;
      s.style.opacity = String(1 - Math.min(d, 1.5) * 0.35);
      const img = s.firstElementChild;
      img.style.transform = `translateX(${(i + v / sw) * -8}%) scale(1.2)`;
    });
  }, { allowReduced: true });
  return { update(n) {
    p = { ...p, ...n };
    build();
    snapTo(idx);
  }, replay: () => snapTo((idx + 1) % slides.length), setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    ro.disconnect();
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("keydown", key);
    track.remove();
    counter.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
