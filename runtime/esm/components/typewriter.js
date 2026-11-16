// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var list = (p, k) => str(p, k).split(/\n|\|/).map((s) => s.trim()).filter(Boolean);
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

// src/library/items/typewriter/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const id = nextId("tw");
  const h = document.createElement("p");
  h.className = id;
  const pre = document.createElement("span"), out = document.createElement("span"), caret = document.createElement("span");
  caret.className = "caret";
  caret.textContent = "▍";
  caret.setAttribute("aria-hidden", "true");
  h.append(pre, out, caret);
  el.appendChild(h);
  const unstyle = scopedStyle(el, `.${id} .caret{margin-inline-start:.04em;animation:${id}-b 1s steps(1) infinite}@keyframes ${id}-b{50%{opacity:0}}`);
  let timer = 0, wi = 0, ci = 0, del = false;
  const tick = () => {
    const words = list(p, "phrases");
    if (!words.length) return;
    const w = words[wi % words.length];
    if (ctx.reducedMotion) {
      out.textContent = w;
      wi++;
      timer = window.setTimeout(tick, num(p, "hold", 1400) * 2);
      return;
    }
    ci += del ? -1 : 1;
    out.textContent = Array.from(w).slice(0, ci).join("");
    let wait = num(p, "typeSpeed", 60) / speed * (del ? 0.5 : 1);
    if (!del && ci >= Array.from(w).length) {
      del = true;
      wait = num(p, "hold", 1400);
    } else if (del && ci <= 0) {
      del = false;
      wi++;
      wait = 300;
    }
    timer = window.setTimeout(tick, wait);
  };
  const apply = () => {
    textStyle(h, p);
    pre.textContent = str(p, "prefix");
    caret.style.color = str(p, "caret");
    h.setAttribute("aria-label", str(p, "prefix") + list(p, "phrases").join(", "));
  };
  apply();
  tick();
  return {
    update(n) {
      p = { ...p, ...n };
      apply();
    },
    replay() {
      clearTimeout(timer);
      wi = ci = 0;
      del = false;
      tick();
    },
    setSpeed(s) {
      speed = s;
    },
    destroy() {
      clearTimeout(timer);
      unstyle();
      h.remove();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
