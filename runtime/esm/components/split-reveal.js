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

// src/library/items/split-reveal/runtime.ts
var SPRING = "linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1)";
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const h = document.createElement("p");
  h.dir = "auto";
  el.appendChild(h);
  let anims = [];
  let stop = () => {
  };
  const build = () => {
    textStyle(h, p);
    const text = str(p, "text");
    const { units } = splitUnits(text, str(p, "split", "chars"));
    h.setAttribute("aria-label", text);
    h.innerHTML = `<span aria-hidden="true">${wrapUnits(units, "u")}</span>`;
    h.querySelectorAll(".u").forEach((s) => {
      const wrap = document.createElement("span");
      wrap.style.cssText = "display:inline-block;overflow:hidden;vertical-align:top;padding-block:.08em;margin-block:-.08em";
      s.replaceWith(wrap);
      wrap.appendChild(s);
      s.style.opacity = "0";
    });
  };
  const play = () => {
    anims.forEach((a) => a.cancel());
    const from = str(p, "from", "bottom");
    const kf = {
      bottom: [{ transform: "translateY(110%)", opacity: 0 }, { transform: "none", opacity: 1 }],
      top: [{ transform: "translateY(-110%)", opacity: 0 }, { transform: "none", opacity: 1 }],
      rotate: [{ transform: "translateY(80%) rotate(12deg)", opacity: 0 }, { transform: "none", opacity: 1 }],
      scale: [{ transform: "scale(0.3)", opacity: 0, filter: "blur(6px)" }, { transform: "none", opacity: 1, filter: "blur(0)" }]
    };
    const units = Array.from(h.querySelectorAll(".u"));
    anims = units.map((u, i) => {
      if (ctx.reducedMotion) {
        u.style.opacity = "1";
        return u.animate([{ opacity: 1 }], { duration: 1, fill: "forwards" });
      }
      return u.animate(kf[from] ?? kf.bottom, {
        duration: num(p, "duration", 900) / speed,
        delay: i * num(p, "stagger", 35) / speed,
        easing: SPRING,
        fill: "both"
      });
    });
  };
  const init = () => {
    stop();
    build();
    stop = onEnter(el, play);
  };
  init();
  return {
    update(n) {
      p = { ...p, ...n };
      init();
    },
    replay: play,
    setSpeed(s) {
      speed = s;
    },
    destroy() {
      stop();
      anims.forEach((a) => a.cancel());
      h.remove();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
