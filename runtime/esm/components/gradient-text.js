// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
function scopedStyle(el, css) {
  const style = document.createElement("style");
  style.textContent = css;
  el.appendChild(style);
  return () => style.remove();
}
var uid = 0;
var nextId = (p = "nq") => `${p}-${(++uid).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

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

// src/library/items/gradient-text/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const id = nextId("gt");
  const h = document.createElement("p");
  h.className = id;
  el.appendChild(h);
  let unstyle = () => {
  };
  const apply = () => {
    unstyle();
    textStyle(h, p);
    h.textContent = str(p, "text");
    const cols = ["c1", "c2", "c3", "c4"].map((k) => str(p, k));
    const dur = num(p, "duration", 6) / Math.max(0.05, speed);
    const anim = ctx.reducedMotion ? "none" : `${id}-flow ${dur}s linear infinite`;
    const shimmer = bool(p, "shimmer", true) && !ctx.reducedMotion;
    unstyle = scopedStyle(el, `
.${id}{background:linear-gradient(${num(p, "angle", 90)}deg,${[...cols, cols[0]].join(",")});background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent!important;animation:${anim};position:relative}
${shimmer ? `.${id}::after{content:attr(data-t);position:absolute;inset:0;background:linear-gradient(110deg,transparent 40%,rgba(255,255,255,.55) 50%,transparent 60%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:${id}-sh ${dur * 0.7}s ease-in-out infinite}` : ""}
@keyframes ${id}-flow{to{background-position:300% 0}}@keyframes ${id}-sh{0%{background-position:150% 0}60%,100%{background-position:-100% 0}}`);
    h.dataset.t = str(p, "text");
  };
  apply();
  return { update(n) {
    p = { ...p, ...n };
    apply();
  }, setSpeed(s) {
    speed = s;
    apply();
  }, destroy() {
    unstyle();
    h.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
