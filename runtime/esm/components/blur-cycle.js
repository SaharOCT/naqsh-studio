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

// src/library/_shared/text.ts
function textStyle(el, p) {
  Object.assign(el.style, {
    color: str(p, "color", "inherit"),
    fontSize: `${num(p, "size", 56)}px`,
    fontWeight: String(num(p, "weight", 700)),
    lineHeight: "1.1",
    letterSpacing: `${num(p, "tracking", -0.02)}em`,
    textAlign: str(p, "align", "start"),
    margin: "0"
  });
}

// src/library/items/blur-cycle/runtime.ts
var SPRING = "linear(0, 0.06, 0.22 8%, 0.62 18%, 0.88 28%, 1.01 38%, 1.04 44%, 1.03 52%, 1 66%, 0.998 80%, 1)";
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const h = document.createElement("p");
  h.dir = "auto";
  el.appendChild(h);
  let i = 0, timer = 0;
  const slot = () => h.querySelector(".slot");
  const build = () => {
    textStyle(h, p);
    const ws = list(p, "words");
    h.innerHTML = `${escapeHTML(str(p, "before"))} <span class="slot" style="display:inline-grid;vertical-align:bottom;color:${escapeHTML(str(p, "accent"))}"><span style="grid-area:1/1">${escapeHTML(ws[i % Math.max(1, ws.length)] ?? "")}</span></span>`;
    h.setAttribute("aria-label", `${str(p, "before")} ${ws.join(", ")}`);
  };
  const cycle = () => {
    const ws = list(p, "words");
    if (ws.length > 1) {
      i = (i + 1) % ws.length;
      const s = slot(), old = s.firstElementChild, nu = document.createElement("span");
      nu.style.gridArea = "1/1";
      nu.textContent = ws[i];
      s.appendChild(nu);
      if (!ctx.reducedMotion) {
        old.animate([{ opacity: 1, filter: "blur(0)", transform: "none" }, { opacity: 0, filter: "blur(12px)", transform: "translateY(-30%)" }], { duration: 500 / speed, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }).onfinish = () => old.remove();
        nu.animate([{ opacity: 0, filter: "blur(14px)", transform: "translateY(45%) scale(.96)" }, { opacity: 1, filter: "blur(0)", transform: "none" }], { duration: 900 / speed, easing: SPRING, fill: "both" });
      } else old.remove();
    }
    timer = window.setTimeout(cycle, num(p, "interval", 2400) / speed);
  };
  build();
  timer = window.setTimeout(cycle, num(p, "interval", 2400) / speed);
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, setSpeed(s) {
    speed = s;
  }, destroy() {
    clearTimeout(timer);
    h.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
