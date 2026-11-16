// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
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

// src/library/items/before-after/runtime.ts
var mount = (el, props) => {
  let p = { ...props };
  const box = document.createElement("div");
  el.appendChild(box);
  let pos = num(p, "start", 50), dragging = false;
  const set = (v) => {
    pos = clamp(v, 0, 100);
    const top = box.querySelector(".top"), h = box.querySelector(".h");
    if (top) top.style.clipPath = `inset(0 ${100 - pos}% 0 0)`;
    if (h) {
      h.style.left = `${pos}%`;
      h.setAttribute("aria-valuenow", String(Math.round(pos)));
    }
  };
  const build = () => {
    const r = num(p, "radius", 18), hc = escapeHTML(str(p, "handle"));
    box.style.cssText = `position:relative;width:100%;height:100%;min-height:240px;border-radius:${r}px;overflow:hidden;user-select:none;touch-action:pan-y;direction:ltr`;
    const lab = (t, side) => `<span style="position:absolute;top:14px;${side}:14px;padding:5px 12px;border-radius:99px;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);color:#fff;font-size:12px;letter-spacing:.06em">${escapeHTML(t)}</span>`;
    box.innerHTML = `
      <img alt="" src="${resolveImage(str(p, "after"), 1)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">${lab(str(p, "afterLabel"), "right")}
      <div class="top" style="position:absolute;inset:0"><img alt="" src="${resolveImage(str(p, "before"), 8)}" style="width:100%;height:100%;object-fit:cover;filter:grayscale(1)">${lab(str(p, "beforeLabel"), "left")}</div>
      <div class="h" role="slider" tabindex="0" aria-label="Comparison" aria-valuemin="0" aria-valuemax="100" style="position:absolute;top:0;bottom:0;width:2px;background:${hc};transform:translateX(-50%);cursor:ew-resize">
        <span style="position:absolute;top:50%;left:50%;width:44px;height:44px;border-radius:50%;background:${hc};transform:translate(-50%,-50%);display:grid;place-items:center;box-shadow:0 6px 20px rgba(0,0,0,.35);color:#111;font-size:16px">⇆</span></div>`;
    set(pos);
  };
  const fromEvent = (e) => {
    const r = box.getBoundingClientRect();
    set((e.clientX - r.left) / r.width * 100);
  };
  const down = (e) => {
    dragging = true;
    box.setPointerCapture(e.pointerId);
    fromEvent(e);
  };
  const move = (e) => {
    if (dragging) fromEvent(e);
  };
  const up = () => dragging = false;
  const key = (e) => {
    if (e.key === "ArrowLeft") set(pos - 5);
    if (e.key === "ArrowRight") set(pos + 5);
  };
  box.addEventListener("pointerdown", down);
  box.addEventListener("pointermove", move);
  box.addEventListener("pointerup", up);
  box.addEventListener("keydown", key);
  build();
  return { update(n) {
    p = { ...p, ...n };
    if (n.start !== void 0) pos = num(p, "start", 50);
    build();
  }, destroy() {
    box.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
