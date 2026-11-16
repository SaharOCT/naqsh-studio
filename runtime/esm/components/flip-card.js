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
function scopedStyle(el, css) {
  const style = document.createElement("style");
  style.textContent = css;
  el.appendChild(style);
  return () => style.remove();
}
var uid = 0;
var nextId = (p = "nq") => `${p}-${(++uid).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
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

// src/library/items/flip-card/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const id = nextId("fc");
  el.style.display = "grid";
  el.style.placeItems = "center";
  const card = document.createElement("div");
  card.className = id;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  el.appendChild(card);
  let unstyle = () => {
  };
  const toggle = () => {
    card.classList.toggle("on");
    card.setAttribute("aria-pressed", String(card.classList.contains("on")));
  };
  const key = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };
  const build = () => {
    unstyle();
    const ax = str(p, "axis") === "x" ? "X" : "Y", hover = str(p, "trigger") === "hover";
    const dur = ctx.reducedMotion ? 0 : 0.8;
    unstyle = scopedStyle(el, `
.${id}{width:${num(p, "width", 280)}px;aspect-ratio:4/5;perspective:1000px;cursor:pointer;outline:none}
.${id} .f{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform ${dur}s cubic-bezier(.3,1.4,.4,1)}
${hover ? `.${id}:hover .f,` : ""}.${id}:focus-visible .f,.${id}.on .f{transform:rotate${ax}(180deg)}
.${id} .s{position:absolute;inset:0;border-radius:20px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:22px;box-sizing:border-box;color:#fff}
.${id} .b{transform:rotate${ax}(180deg);background:${str(p, "backColor")};justify-content:center}
.${id} img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1}
.${id} h3{margin:0 0 8px;font-size:24px;letter-spacing:-.02em}.${id} p{margin:0;line-height:1.5;opacity:.9}`);
    card.innerHTML = `<div class="f"><div class="s"><img alt="" src="${resolveImage(str(p, "image"), 4)}"><h3>${escapeHTML(str(p, "front"))}</h3></div><div class="s b"><h3>${escapeHTML(str(p, "backTitle"))}</h3><p>${escapeHTML(str(p, "back"))}</p></div></div>`;
    card.onclick = hover ? null : toggle;
  };
  card.addEventListener("keydown", key);
  build();
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, replay: toggle, destroy() {
    card.removeEventListener("keydown", key);
    unstyle();
    card.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
