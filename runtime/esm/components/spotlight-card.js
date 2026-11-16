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
function scopedStyle(el, css) {
  const style = document.createElement("style");
  style.textContent = css;
  el.appendChild(style);
  return () => style.remove();
}
var uid = 0;
var nextId = (p = "nq") => `${p}-${(++uid).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// src/library/items/spotlight-card/runtime.ts
var mount = (el, props) => {
  let p = { ...props };
  const id = nextId("sc");
  const grid = document.createElement("div");
  grid.className = id;
  el.appendChild(grid);
  let unstyle = () => {
  };
  const build = () => {
    unstyle();
    const L = rgba(str(p, "light"), 0.9), Ls = rgba(str(p, "light"), 0.12), s = num(p, "size", 340);
    unstyle = scopedStyle(el, `
.${id}{display:grid;grid-template-columns:repeat(${Math.round(num(p, "columns", 2))},minmax(0,1fr));gap:12px;padding:12px;width:100%;box-sizing:border-box}
@media (max-width:640px){.${id}{grid-template-columns:1fr}}
.${id} .c{position:relative;border-radius:18px;padding:1px;background:radial-gradient(${s}px circle at var(--x,-999px) var(--y,-999px),${L},transparent 40%),rgba(255,255,255,.08)}
.${id} .i{position:relative;height:100%;border-radius:17px;padding:22px;background:radial-gradient(${s * 1.2}px circle at var(--x,-999px) var(--y,-999px),${Ls},transparent 40%),${str(p, "surface")};color:${str(p, "text")};box-sizing:border-box}
.${id} h3{margin:0 0 8px;font-size:18px;font-weight:650;letter-spacing:-.01em}.${id} p{margin:0;opacity:.65;font-size:14px;line-height:1.5}`);
    const t = list(p, "titles"), b = list(p, "bodies");
    grid.innerHTML = t.map((title, i) => `<div class="c"><div class="i"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(b[i] ?? "")}</p></div></div>`).join("");
  };
  const move = (e) => {
    grid.querySelectorAll(".c").forEach((c) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--x", `${e.clientX - r.left}px`);
      c.style.setProperty("--y", `${e.clientY - r.top}px`);
    });
  };
  build();
  grid.addEventListener("pointermove", move);
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, destroy() {
    grid.removeEventListener("pointermove", move);
    unstyle();
    grid.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
