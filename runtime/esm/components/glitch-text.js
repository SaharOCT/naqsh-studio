// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);

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

// src/library/items/glitch-text/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:relative;display:grid";
  const base = document.createElement("p"), A = document.createElement("p"), B = document.createElement("p");
  [base, A, B].forEach((n) => {
    n.style.gridArea = "1/1";
    wrap.appendChild(n);
  });
  A.setAttribute("aria-hidden", "true");
  B.setAttribute("aria-hidden", "true");
  el.appendChild(wrap);
  let timer = 0, hovering = false;
  const rnd = (a) => (Math.random() * 2 - 1) * a;
  const glitch = () => {
    const k = num(p, "intensity", 1);
    const active = !ctx.reducedMotion && (str(p, "trigger") === "loop" || hovering);
    if (active && Math.random() < 0.55) {
      for (const [n, s] of [[A, 1], [B, -1]]) {
        const t = Math.random() * 90, hgt = 4 + Math.random() * 30;
        n.style.clipPath = `inset(${t}% 0 ${Math.max(0, 100 - t - hgt)}% 0)`;
        n.style.transform = `translate(${rnd(6 * k) + s * 2 * k}px, ${rnd(1.5 * k)}px)`;
        n.style.opacity = "1";
      }
      base.style.transform = Math.random() < 0.2 ? `translateX(${rnd(3 * k)}px) skewX(${rnd(8 * k)}deg)` : "none";
    } else {
      A.style.opacity = B.style.opacity = "0";
      base.style.transform = "none";
    }
    timer = window.setTimeout(glitch, (40 + Math.random() * 140) / speed);
  };
  const apply = () => {
    [base, A, B].forEach((n) => {
      textStyle(n, p);
      n.textContent = str(p, "text");
    });
    A.style.color = str(p, "ca");
    B.style.color = str(p, "cb");
    A.style.mixBlendMode = B.style.mixBlendMode = "screen";
  };
  const enter = () => hovering = true, leave = () => hovering = false;
  el.addEventListener("mouseenter", enter);
  el.addEventListener("mouseleave", leave);
  apply();
  glitch();
  return {
    update(n) {
      p = { ...p, ...n };
      apply();
    },
    setSpeed(s) {
      speed = s;
    },
    destroy() {
      clearTimeout(timer);
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
      wrap.remove();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
