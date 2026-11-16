// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function prepareHost(el, opts = {}) {
  const cs = getComputedStyle(el);
  if (cs.position === "static") el.style.position = "relative";
  if (opts.clip !== false) el.style.overflow = "hidden";
}

// src/library/items/preloader/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  let speed = ctx.speed, raf = 0, timer = 0, anims = [];
  const build = () => {
    el.style.background = str(p, "bg");
    el.innerHTML = `<h2 class="ttl" dir="auto" style="position:absolute;inset:0;margin:0;display:grid;place-items:center;font-size:clamp(32px,8vw,128px);letter-spacing:-.05em;font-weight:700;color:${escapeHTML(str(p, "text"))};overflow:hidden"><span style="display:inline-block">${escapeHTML(str(p, "title"))}</span></h2>
      <div class="c1" style="position:absolute;inset:0 0 50% 0;background:${escapeHTML(str(p, "curtain"))};z-index:2"></div>
      <div class="c2" style="position:absolute;inset:50% 0 0 0;background:${escapeHTML(str(p, "curtain"))};z-index:2"></div>
      <div class="num" style="position:absolute;inset-inline-end:6%;bottom:6%;z-index:3;font:700 clamp(48px,12vw,180px)/1 ui-monospace,monospace;letter-spacing:-.06em;color:${escapeHTML(str(p, "accent"))};direction:ltr">0</div>
      <div class="bar" style="position:absolute;left:0;bottom:0;height:3px;width:0;z-index:3;background:${escapeHTML(str(p, "accent"))}"></div>`;
  };
  const run = () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    anims.forEach((a) => a.cancel());
    anims = [];
    build();
    const num$ = el.querySelector(".num"), bar = el.querySelector(".bar");
    const c1 = el.querySelector(".c1"), c2 = el.querySelector(".c2"), ttl = el.querySelector(".ttl span");
    if (ctx.reducedMotion) {
      [c1, c2, num$, bar].forEach((x) => x.remove());
      return;
    }
    const d = num(p, "duration", 2200) / speed, t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / d);
      const e = 1 - Math.pow(1 - t, 2.4);
      const v = Math.floor(e * 100 - (t < 1 ? Math.max(0, Math.sin(t * 9)) * 3 : 0));
      num$.textContent = String(Math.max(0, Math.min(100, v)));
      bar.style.width = `${e * 100}%`;
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        const ease = "cubic-bezier(.77,0,.18,1)";
        anims = [
          num$.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-20%)" }], { duration: 400, fill: "forwards" }),
          bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }),
          c1.animate([{ transform: "none" }, { transform: "translateY(-100%)" }], { duration: 1100 / speed, delay: 250, easing: ease, fill: "forwards" }),
          c2.animate([{ transform: "none" }, { transform: "translateY(100%)" }], { duration: 1100 / speed, delay: 250, easing: ease, fill: "forwards" }),
          ttl.animate([{ transform: "translateY(110%) scale(.96)" }, { transform: "none" }], { duration: 1200 / speed, delay: 550, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" })
        ];
        if (ctx.preview && bool(p, "loop", true)) timer = window.setTimeout(run, 3500);
      }
    };
    raf = requestAnimationFrame(tick);
  };
  run();
  return { update(n) {
    p = { ...p, ...n };
    run();
  }, replay: run, setSpeed(s) {
    speed = s;
  }, destroy() {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    anims.forEach((a) => a.cancel());
    el.innerHTML = "";
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
