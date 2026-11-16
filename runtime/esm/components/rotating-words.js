// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var list = (p, k) => str(p, k).split(/\n|\|/).map((s) => s.trim()).filter(Boolean);

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

// src/library/items/rotating-words/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const h = document.createElement("p");
  const b = document.createElement("span"), box = document.createElement("span"), a = document.createElement("span");
  box.style.cssText = "display:inline-flex;position:relative;overflow:hidden;vertical-align:bottom;border-radius:.18em;padding:0 .22em;margin:0 .18em;transition:width .5s cubic-bezier(.2,.8,.2,1)";
  h.append(b, box, a);
  el.appendChild(h);
  let i = 0, timer = 0;
  const measure = (w) => {
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;padding:0 .22em";
    probe.textContent = w;
    box.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  };
  const show = (word, animate) => {
    const old = box.querySelector("span.w");
    const next = document.createElement("span");
    next.className = "w";
    next.textContent = word;
    next.style.cssText = "display:inline-block;white-space:pre";
    box.style.width = `${measure(word)}px`;
    if (old && animate && !ctx.reducedMotion) {
      old.style.position = "absolute";
      old.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }], { duration: 500 / speed, easing: "cubic-bezier(.6,0,.2,1)", fill: "forwards" }).onfinish = () => old.remove();
      next.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 500 / speed, easing: "cubic-bezier(.2,.8,.2,1)" });
    } else old?.remove();
    box.appendChild(next);
  };
  const cycle = () => {
    const ws = list(p, "words");
    if (ws.length) {
      i = (i + 1) % ws.length;
      show(ws[i], true);
    }
    timer = window.setTimeout(cycle, num(p, "interval", 2e3) / speed);
  };
  const apply = () => {
    textStyle(h, p);
    b.textContent = str(p, "before");
    a.textContent = str(p, "after");
    box.style.background = str(p, "accent");
    box.style.color = str(p, "accentText");
    const ws = list(p, "words");
    h.setAttribute("aria-label", `${str(p, "before")} ${ws.join(" / ")} ${str(p, "after")}`);
    show(ws[i % Math.max(1, ws.length)] ?? "", false);
  };
  apply();
  timer = window.setTimeout(cycle, num(p, "interval", 2e3) / speed);
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
      h.remove();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
