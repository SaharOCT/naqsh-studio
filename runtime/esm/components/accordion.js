// src/library/_shared/kit.ts
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
var list = (p, k) => str(p, k).split(/\n|\|/).map((s) => s.trim()).filter(Boolean);
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
var uid = 0;
var nextId = (p = "nq") => `${p}-${(++uid).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// src/library/items/accordion/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const id = nextId("ac");
  const box = document.createElement("div");
  box.style.cssText = "width:min(820px,100%);padding:12px;box-sizing:border-box";
  el.appendChild(box);
  const build = () => {
    const q = list(p, "questions"), a = list(p, "answers");
    box.style.color = str(p, "text");
    box.innerHTML = q.map((x, i) => `<div style="border-bottom:1px solid ${escapeHTML(str(p, "line"))}">
      <h3 style="margin:0"><button id="${id}-b${i}" aria-expanded="false" aria-controls="${id}-c${i}" style="all:unset;box-sizing:border-box;cursor:pointer;width:100%;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 2px;font-size:clamp(16px,1.6vw,21px);font-weight:600;letter-spacing:-.01em"><span dir="auto" style="flex:1">${escapeHTML(x)}</span><span class="pl" aria-hidden="true" style="position:relative;width:16px;height:16px;flex:0 0 16px;transition:transform .45s cubic-bezier(.34,1.56,.64,1)"><i style="position:absolute;left:0;right:0;top:7px;height:2px;border-radius:2px;background:${escapeHTML(str(p, "accent"))}"></i><i style="position:absolute;top:0;bottom:0;left:7px;width:2px;border-radius:2px;background:${escapeHTML(str(p, "accent"))}"></i></span></button></h3>
      <div id="${id}-c${i}" role="region" aria-labelledby="${id}-b${i}" style="height:0;overflow:hidden"><p dir="auto" style="margin:0;padding:0 2px 22px;opacity:.7;line-height:1.6;max-width:640px">${escapeHTML(a[i] ?? "")}</p></div></div>`).join("");
    box.querySelectorAll("button[aria-controls]").forEach((b) => b.onclick = () => toggle(b));
  };
  const toggle = (b, force) => {
    const open = force ?? b.getAttribute("aria-expanded") !== "true";
    if (open && !bool(p, "multiple")) box.querySelectorAll("button[aria-expanded=true]").forEach((o) => o !== b && toggle(o, false));
    const panel = box.querySelector(`#${CSS.escape(b.getAttribute("aria-controls"))}`);
    b.setAttribute("aria-expanded", String(open));
    b.querySelector(".pl").style.transform = open ? "rotate(135deg)" : "none";
    const h = panel.scrollHeight;
    if (ctx.reducedMotion) {
      panel.style.height = open ? "auto" : "0";
      return;
    }
    const from = panel.getBoundingClientRect().height;
    panel.style.height = open ? `${h}px` : "0px";
    panel.animate([{ height: `${from}px` }, { height: open ? `${h}px` : "0px" }], { duration: open ? 520 : 380, easing: open ? "cubic-bezier(.16,1,.3,1)" : "cubic-bezier(.4,0,.2,1)" }).onfinish = () => {
      if (open) panel.style.height = "auto";
    };
    if (open) panel.firstElementChild.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: 90, easing: "ease-out", fill: "both" });
  };
  build();
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, destroy() {
    box.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
