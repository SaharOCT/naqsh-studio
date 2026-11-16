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
function scopedStyle(el, css) {
  const style = document.createElement("style");
  style.textContent = css;
  el.appendChild(style);
  return () => style.remove();
}
var uid = 0;
var nextId = (p = "nq") => `${p}-${(++uid).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// src/library/_shared/text.ts
var ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

// src/library/items/roll-links/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const id = nextId("rl");
  const nav = document.createElement("nav");
  nav.className = id;
  el.appendChild(nav);
  let unstyle = () => {
  };
  const build = () => {
    unstyle();
    const st = num(p, "stagger", 22), dur = ctx.reducedMotion ? 0 : 0.55;
    unstyle = scopedStyle(el, `
.${id}{display:flex;flex-direction:${str(p, "layout") === "row" ? "row" : "column"};gap:${str(p, "layout") === "row" ? "1.2em" : ".05em"};align-items:center;font-size:${num(p, "size", 64)}px;font-weight:700;letter-spacing:-.035em;line-height:1}
.${id} a{position:relative;display:inline-flex;overflow:hidden;color:${str(p, "color")};text-decoration:none;padding-block:.06em}
.${id} a span{display:inline-block;white-space:pre;transition:transform ${dur}s cubic-bezier(.7,0,.2,1);transition-delay:calc(var(--i) * ${st}ms)}
.${id} a .b{position:absolute;inset:0;display:inline-flex;color:${str(p, "hover")}}
.${id} a .b span{transform:translateY(110%)}
.${id} a:hover .a span,.${id} a:focus-visible .a span{transform:translateY(-110%)}
.${id} a:hover .b span,.${id} a:focus-visible .b span{transform:none}`);
    const unit = (t) => ARABIC.test(t) ? t.split(/(\s+)/) : Array.from(t);
    nav.innerHTML = list(p, "links").map((t) => {
      const u = unit(t);
      const row = (c) => `<span class="${c}" aria-hidden="${c === "b"}">${u.map((ch, i) => `<span style="--i:${i}">${escapeHTML(ch)}</span>`).join("")}</span>`;
      return `<a href="#" dir="auto" aria-label="${escapeHTML(t)}">${row("a")}${row("b")}</a>`;
    }).join("");
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));
  };
  build();
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, destroy() {
    unstyle();
    nav.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
