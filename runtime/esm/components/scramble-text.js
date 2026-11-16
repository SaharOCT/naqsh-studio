// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
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

// src/library/items/scramble-text/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const h = document.createElement("p");
  el.appendChild(h);
  let raf = 0, timer = 0, stopEnter = () => {
  };
  const run = () => {
    cancelAnimationFrame(raf);
    const target = str(p, "text"), glyphs = str(p, "glyphs", "#$%&*"), dur = num(p, "duration", 1400) / Math.max(0.05, speed);
    if (ctx.reducedMotion) {
      h.textContent = target;
      return;
    }
    const start = performance.now();
    const chars = Array.from(target);
    const frame = (now) => {
      const t = Math.min(1, (now - start) / dur);
      h.textContent = chars.map((c, i) => c === " " || i / chars.length < t * 1.15 - 0.15 ? c : glyphs[Math.floor(Math.random() * glyphs.length)]).join("");
      if (t < 1) raf = requestAnimationFrame(frame);
      else {
        h.textContent = target;
        if (str(p, "trigger") === "loop") timer = window.setTimeout(run, 1800);
      }
    };
    raf = requestAnimationFrame(frame);
  };
  const bind = () => {
    stopEnter();
    el.onmouseenter = null;
    textStyle(h, p);
    h.textContent = str(p, "text");
    const tr = str(p, "trigger", "view");
    if (tr === "hover") el.onmouseenter = run;
    else stopEnter = onEnter(el, run);
  };
  bind();
  return {
    update(n) {
      p = { ...p, ...n };
      clearTimeout(timer);
      bind();
    },
    replay: run,
    setSpeed(s) {
      speed = s;
    },
    destroy() {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      stopEnter();
      el.onmouseenter = null;
      h.remove();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
