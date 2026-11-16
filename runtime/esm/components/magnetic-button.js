// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
function safeURL(u) {
  const s = u.trim();
  if (/^https?:\/\//i.test(s) || /^\/\//.test(s) || /^data:(image|video|model)\//i.test(s) || /^blob:/i.test(s)) return s;
  if (/^[\w./%-][\w./%~-]*$/.test(s) && !s.includes(":")) return s;
  return "";
}
var lerp = (a, b, t) => a + (b - a) * t;
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
function scopedStyle(el, css) {
  const style = document.createElement("style");
  style.textContent = css;
  el.appendChild(style);
  return () => style.remove();
}
var uid = 0;
var nextId = (p = "nq") => `${p}-${(++uid).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// src/library/items/magnetic-button/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const id = nextId("mb");
  el.style.display = el.style.display || "grid";
  el.style.placeItems = "center";
  const a = document.createElement("a");
  a.className = id;
  const label = document.createElement("span");
  a.appendChild(label);
  el.appendChild(a);
  let unstyle = () => {
  };
  let x = 0, y = 0, tx = 0, ty = 0;
  const build = () => {
    unstyle();
    unstyle = scopedStyle(el, `
.${id}{position:relative;display:inline-flex;align-items:center;justify-content:center;padding:1.05em 2.1em;border-radius:999px;background:${str(p, "bg")};color:${str(p, "fg")};font-weight:600;font-size:17px;text-decoration:none;overflow:hidden;isolation:isolate;will-change:transform}
.${id}::before{content:"";position:absolute;inset:0;border-radius:inherit;background:${str(p, "fill")};transform:translateY(101%);border-radius:50% 50% 0 0;transition:transform .55s cubic-bezier(.7,0,.2,1),border-radius .55s;z-index:-1}
.${id}:hover::before,.${id}:focus-visible::before{transform:none;border-radius:0}
.${id} span{display:inline-block;will-change:transform}`);
    label.textContent = str(p, "label");
    const href = safeURL(str(p, "href", "#")) || "#";
    a.href = href;
  };
  const move = (e) => {
    const r = a.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const R = num(p, "radius", 120);
    if (Math.hypot(dx, dy) < R + Math.max(r.width, r.height) / 2) {
      tx = dx * num(p, "strength", 0.4);
      ty = dy * num(p, "strength", 0.4);
    } else {
      tx = ty = 0;
    }
  };
  window.addEventListener("pointermove", move, { passive: true });
  build();
  const loop = createLoop(el, ctx, () => {
    x = lerp(x, tx, 0.15);
    y = lerp(y, ty, 0.15);
    a.style.transform = `translate(${x}px, ${y}px)`;
    label.style.transform = `translate(${x * 0.35}px, ${y * 0.35}px)`;
  });
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    window.removeEventListener("pointermove", move);
    unstyle();
    a.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
