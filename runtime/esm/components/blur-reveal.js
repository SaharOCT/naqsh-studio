// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function onEnter(el, cb, threshold = 0.25) {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        cb();
      }
    },
    { threshold }
  );
  io.observe(el);
  return () => io.disconnect();
}

// src/library/_shared/text.ts
var ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
function splitUnits(text, mode) {
  if (mode === "chars" && !ARABIC.test(text)) {
    const seg = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(void 0, { granularity: "grapheme" }) : null;
    return { units: seg ? Array.from(seg.segment(text), (s) => s.segment) : Array.from(text), mode: "chars" };
  }
  return { units: text.split(/(\s+)/).filter((s) => s.length), mode: "words" };
}
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
function wrapUnits(units, cls) {
  return units.map((u) => /^\s+$/.test(u) ? u : `<span class="${cls}" style="display:inline-block;white-space:pre">${escapeHTML(u)}</span>`).join("");
}

// src/library/items/blur-reveal/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const h = document.createElement("p");
  h.dir = "auto";
  el.appendChild(h);
  let anims = [], stop = () => {
  };
  const play = () => {
    anims.forEach((a) => a.cancel());
    const b = num(p, "blur", 12);
    anims = Array.from(h.querySelectorAll(".u")).map(
      (u, i) => u.animate(
        ctx.reducedMotion ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, filter: `blur(${b}px)`, transform: "translateY(.25em)" }, { opacity: 1, filter: "blur(0)", transform: "none" }],
        { duration: num(p, "duration", 900) / speed, delay: i * num(p, "stagger", 70) / speed, easing: "cubic-bezier(.2,.7,.1,1)", fill: "both" }
      )
    );
  };
  const init = () => {
    stop();
    textStyle(h, p);
    h.style.lineHeight = "1.35";
    const text = str(p, "text");
    h.setAttribute("aria-label", text);
    h.innerHTML = `<span aria-hidden="true">${wrapUnits(splitUnits(text, "words").units, "u")}</span>`;
    h.querySelectorAll(".u").forEach((u) => u.style.opacity = "0");
    stop = onEnter(el, play);
  };
  init();
  return { update(n) {
    p = { ...p, ...n };
    init();
  }, replay: play, setSpeed(s) {
    speed = s;
  }, destroy() {
    stop();
    anims.forEach((a) => a.cancel());
    h.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
