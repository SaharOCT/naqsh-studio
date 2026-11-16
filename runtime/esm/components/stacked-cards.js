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

// src/library/items/stacked-cards/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  el.style.display = "grid";
  el.style.placeItems = "center";
  el.style.touchAction = "pan-y";
  const stack = document.createElement("div");
  stack.style.cssText = "position:relative;user-select:none";
  el.appendChild(stack);
  let order = [], timer = 0;
  const layout = (animate = true) => {
    const cards = Array.from(stack.children);
    const s = num(p, "spread", 10);
    order.forEach((ci, depth) => {
      const c = cards[ci];
      c.style.zIndex = String(100 - depth);
      c.style.transition = animate && !ctx.reducedMotion ? "transform .6s cubic-bezier(.2,.9,.2,1.1)" : "none";
      c.style.transform = `translate(${depth * s * 0.4}px, ${depth * s}px) scale(${1 - depth * 0.05}) rotate(${depth % 2 ? 2 : -2}deg)`;
      c.style.opacity = depth > 3 ? "0" : "1";
    });
  };
  const fling = (dir = 1) => {
    const ci = order[0];
    const c = stack.children[ci];
    c.style.transition = "transform .45s cubic-bezier(.4,0,.2,1)";
    c.style.transform = `translate(${dir * 140}%, -10%) rotate(${dir * 24}deg)`;
    setTimeout(() => {
      order.push(order.shift());
      layout();
    }, ctx.reducedMotion ? 0 : 320);
  };
  const build = () => {
    const imgs = list(p, "images"), caps = list(p, "captions"), w = num(p, "cardWidth", 260);
    stack.style.width = `${w}px`;
    stack.style.height = `${w * 1.3}px`;
    stack.innerHTML = imgs.map((s, i) => `<div style="position:absolute;inset:0;border-radius:22px;overflow:hidden;box-shadow:0 24px 50px -16px rgba(0,0,0,.55);cursor:grab;touch-action:none;will-change:transform"><img draggable="false" alt="" src="${resolveImage(s, i)}" style="width:100%;height:100%;object-fit:cover;pointer-events:none"><span style="position:absolute;inset-inline:18px;bottom:16px;color:#fff;font-weight:650;font-size:20px">${escapeHTML(caps[i] ?? "")}</span></div>`).join("");
    order = imgs.map((_, i) => i);
    Array.from(stack.children).forEach((c, ci) => {
      let sx = 0, dx = 0, drag = false;
      c.addEventListener("pointerdown", (e) => {
        if (order[0] !== ci) return;
        drag = true;
        sx = e.clientX;
        c.setPointerCapture(e.pointerId);
        c.style.transition = "none";
      });
      c.addEventListener("pointermove", (e) => {
        if (!drag) return;
        dx = e.clientX - sx;
        c.style.transform = `translateX(${dx}px) rotate(${dx * 0.06}deg)`;
      });
      c.addEventListener("pointerup", () => {
        if (!drag) return;
        drag = false;
        if (Math.abs(dx) > 90) fling(Math.sign(dx));
        else layout();
        dx = 0;
      });
    });
    layout(false);
  };
  const auto = () => {
    clearInterval(timer);
    if (bool(p, "autoplay", true) && !ctx.reducedMotion) timer = window.setInterval(() => fling(1), 3200 / ctx.speed);
  };
  build();
  auto();
  return { update(n) {
    p = { ...p, ...n };
    build();
    auto();
  }, replay: () => fling(1), destroy() {
    clearInterval(timer);
    stack.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
