// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
var list = (p, k) => str(p, k).split(/\n|\|/).map((s) => s.trim()).filter(Boolean);
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function prepareHost(el, opts = {}) {
  const cs = getComputedStyle(el);
  if (cs.position === "static") el.style.position = "relative";
  if (opts.clip !== false) el.style.overflow = "hidden";
}
function createLoop(el, ctx, tick, opts = {}) {
  let speed = ctx.speed ?? 1;
  let visible = true;
  let raf = 0;
  let last = 0;
  let time = 0;
  let dead = false;
  const frame = (now) => {
    raf = 0;
    if (dead) return;
    const dt = last ? Math.min(0.05, (now - last) / 1e3) * speed : 0;
    last = now;
    time += dt;
    tick(dt, time);
    schedule();
  };
  const running = () => visible && !document.hidden && !(ctx.reducedMotion && !opts.allowReduced);
  const schedule = () => {
    if (!raf && running()) raf = requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      last = 0;
      schedule();
    },
    { rootMargin: "100px" }
  );
  io.observe(el);
  const onVis = () => {
    last = 0;
    schedule();
  };
  document.addEventListener("visibilitychange", onVis);
  tick(0, 0);
  schedule();
  return {
    setSpeed(s) {
      speed = s;
    },
    get time() {
      return time;
    },
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    }
  };
}

// src/library/items/text-marquee/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  const track = document.createElement("div");
  track.style.cssText = "display:flex;width:max-content;will-change:transform;align-items:center;height:100%";
  el.appendChild(track);
  el.style.display = el.style.display || "flex";
  el.style.alignItems = "center";
  let x = 0, unitW = 1, boost = 0, lastY = window.scrollY;
  const build = () => {
    const sep = `<span style="color:${escapeHTML(str(p, "sepColor"))};padding:0 .45em">${escapeHTML(str(p, "separator"))}</span>`;
    const outline = bool(p, "outline");
    const style = `font-size:${num(p, "size", 72)}px;font-weight:${num(p, "weight", 800)};white-space:nowrap;line-height:1;${outline ? `color:transparent;-webkit-text-stroke:1.5px ${str(p, "color")}` : `color:${str(p, "color")}`}`;
    const unit = `<div class="unit" style="display:flex;${style}">${list(p, "items").map((t) => `<span>${escapeHTML(t)}</span>${sep}`).join("")}</div>`;
    track.innerHTML = unit;
    unitW = track.firstElementChild.getBoundingClientRect().width || 1;
    const copies = Math.max(2, Math.ceil(el.getBoundingClientRect().width / unitW) + 1);
    track.innerHTML = Array.from({ length: copies }, (_, i) => i ? unit.replace('class="unit"', 'class="unit" aria-hidden="true"') : unit).join("");
  };
  build();
  const ro = new ResizeObserver(build);
  ro.observe(el);
  const onScroll = () => {
    boost = Math.min(12, boost + Math.abs(window.scrollY - lastY) * 0.05);
    lastY = window.scrollY;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  const loop = createLoop(el, ctx, (dt) => {
    const rtl = getComputedStyle(el).direction === "rtl";
    const dirSign = (str(p, "direction") === "reverse" ? -1 : 1) * (rtl ? 1 : -1);
    if (bool(p, "scrollBoost", true)) boost *= 0.92;
    else boost = 0;
    x += dirSign * num(p, "velocity", 60) * (1 + boost) * dt;
    x = (x % unitW + unitW) % unitW;
    track.style.transform = `translateX(${rtl ? x : -x}px)`;
  });
  return {
    update(n) {
      p = { ...p, ...n };
      build();
    },
    setSpeed: loop.setSpeed,
    destroy() {
      loop.destroy();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      track.remove();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
