// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function scopedStyle(el, css) {
  const style = document.createElement("style");
  style.textContent = css;
  el.appendChild(style);
  return () => style.remove();
}
var uid = 0;
var nextId = (p = "nq") => `${p}-${(++uid).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// src/library/items/border-beam-card/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const id = nextId("bb");
  el.style.display = "grid";
  el.style.placeItems = "center";
  const card = document.createElement("div");
  card.className = id;
  el.appendChild(card);
  let unstyle = () => {
  };
  const build = () => {
    unstyle();
    const d = num(p, "duration", 4) / Math.max(0.05, speed);
    unstyle = scopedStyle(el, `
@property --${id}-a{syntax:"<angle>";initial-value:0deg;inherits:false}
.${id}{--a:var(--${id}-a);position:relative;width:min(100%,${num(p, "width", 320)}px);border-radius:20px;padding:1.5px;background:conic-gradient(from var(--${id}-a),transparent 0 70%,${str(p, "c2")} 82%,${str(p, "c1")} 92%,transparent 100%),rgba(255,255,255,.08);animation:${ctx.reducedMotion ? "none" : `${id}-spin ${d}s linear infinite`}}
.${id}::before{content:"";position:absolute;inset:-1px;border-radius:inherit;background:inherit;filter:blur(18px);opacity:.45;z-index:-1}
.${id} .in{border-radius:19px;padding:28px;background:${str(p, "surface")};color:#f5f3ee}
.${id} .eb{display:inline-block;font-size:11px;letter-spacing:.14em;padding:4px 10px;border-radius:99px;background:rgba(255,255,255,.07);color:${str(p, "c1")}}
.${id} h3{margin:16px 0 8px;font-size:30px;letter-spacing:-.02em}.${id} p{margin:0;opacity:.65;line-height:1.55;font-size:14px}
@keyframes ${id}-spin{to{--${id}-a:360deg}}`);
    card.innerHTML = `<div class="in"><span class="eb">${escapeHTML(str(p, "eyebrow"))}</span><h3>${escapeHTML(str(p, "title"))}</h3><p>${escapeHTML(str(p, "body"))}</p></div>`;
  };
  build();
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, setSpeed(s) {
    speed = s;
    build();
  }, destroy() {
    unstyle();
    card.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
