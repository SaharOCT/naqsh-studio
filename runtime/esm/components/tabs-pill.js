// src/library/_shared/kit.ts
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

// src/library/items/tabs-pill/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const id = nextId("tp");
  const box = document.createElement("div");
  box.style.cssText = "width:min(860px,100%);display:flex;flex-direction:column;gap:22px;align-items:center;padding:16px;box-sizing:border-box";
  el.appendChild(box);
  let active = 0;
  const build = () => {
    const tabs = list(p, "tabs"), t = list(p, "titles"), b = list(p, "bodies"), im = list(p, "images");
    box.style.color = str(p, "text");
    box.innerHTML = `<div role="tablist" style="position:relative;display:inline-flex;padding:5px;border-radius:999px;background:${escapeHTML(str(p, "surface"))};border:1px solid rgba(255,255,255,.08)">
      <span class="pill" style="position:absolute;top:5px;bottom:5px;border-radius:999px;background:${escapeHTML(str(p, "pill"))};will-change:left,width"></span>
      ${tabs.map((x, i) => `<button role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === active}" tabindex="${i === active ? 0 : -1}" data-i="${i}" style="all:unset;position:relative;z-index:1;cursor:pointer;padding:9px 20px;border-radius:999px;font-weight:600;font-size:14px;transition:color .3s">${escapeHTML(x)}</button>`).join("")}
    </div>
    <div style="position:relative;width:100%;display:grid">${tabs.map((_, i) => `<section role="tabpanel" id="${id}-p${i}" aria-labelledby="${id}-t${i}" ${i === active ? "" : "hidden"} style="grid-area:1/1;display:grid;grid-template-columns:1.1fr 1fr;gap:22px;align-items:center;padding:22px;border-radius:22px;background:${escapeHTML(str(p, "surface"))}"><div dir="auto"><h3 style="margin:0 0 10px;font-size:clamp(20px,2.6vw,32px);letter-spacing:-.02em">${escapeHTML(t[i] ?? "")}</h3><p style="margin:0;opacity:.65;line-height:1.55">${escapeHTML(b[i] ?? "")}</p></div><img alt="" src="${resolveImage(im[i % Math.max(1, im.length)] ?? "", i)}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px"></section>`).join("")}</div>`;
    box.querySelectorAll("[role=tab]").forEach((btn) => {
      btn.onclick = () => select(Number(btn.dataset.i));
      btn.onkeydown = (e) => {
        const n = tabs.length;
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const rtl = getComputedStyle(el).direction === "rtl";
          const d = (e.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
          select((active + d + n) % n, true);
        }
      };
    });
    placePill(false);
  };
  const placePill = (animate) => {
    const pill = box.querySelector(".pill"), btn = box.querySelectorAll("[role=tab]")[active];
    if (!btn) return;
    const list2 = btn.parentElement.getBoundingClientRect(), r = btn.getBoundingClientRect();
    const to = { left: `${r.left - list2.left}px`, width: `${r.width}px` };
    if (animate && !ctx.reducedMotion) {
      const from = { left: pill.style.left, width: pill.style.width };
      pill.animate([from, to], { duration: 520, easing: "linear(0, 0.12, 0.42 14%, 0.8 28%, 1.02 42%, 1.05 50%, 1.01 64%, 1)" });
    }
    Object.assign(pill.style, to);
    box.querySelectorAll("[role=tab]").forEach((b, i) => b.style.color = i === active ? str(p, "surface") : str(p, "text"));
  };
  const select = (i, focus = false) => {
    if (i === active) return;
    const panels = box.querySelectorAll("[role=tabpanel]"), tabs = box.querySelectorAll("[role=tab]");
    const old = panels[active], nu = panels[i];
    tabs[active].setAttribute("aria-selected", "false");
    tabs[active].tabIndex = -1;
    tabs[i].setAttribute("aria-selected", "true");
    tabs[i].tabIndex = 0;
    if (focus) tabs[i].focus();
    active = i;
    placePill(true);
    nu.hidden = false;
    if (!ctx.reducedMotion) {
      old.animate([{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: "translateY(-10px)", filter: "blur(6px)" }], { duration: 260, easing: "ease-in" }).onfinish = () => old.hidden = true;
      nu.animate([{ opacity: 0, transform: "translateY(14px)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 520, delay: 120, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" });
    } else old.hidden = true;
  };
  build();
  const ro = new ResizeObserver(() => placePill(false));
  ro.observe(box);
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, destroy() {
    ro.disconnect();
    box.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
