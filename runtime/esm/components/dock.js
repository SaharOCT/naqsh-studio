// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var list = (p, k) => str(p, k).split(/\n|\|/).map((s) => s.trim()).filter(Boolean);
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function hexToRgb(hex) {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [1, 1, 1];
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
var rgba = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
};
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
function springValue(initial = 0, stiffness = 170, damping = 22) {
  const s = { value: initial, target: initial, velocity: 0 };
  return {
    s,
    set(t) {
      s.target = t;
    },
    jump(v) {
      s.value = s.target = v;
      s.velocity = 0;
    },
    step(dt) {
      const h = Math.min(dt, 1 / 30);
      const a = -stiffness * (s.value - s.target) - damping * s.velocity;
      s.velocity += a * h;
      s.value += s.velocity * h;
      return s.value;
    },
    get settled() {
      return Math.abs(s.value - s.target) < 1e-3 && Math.abs(s.velocity) < 1e-3;
    }
  };
}

// src/library/items/dock/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  el.style.display = "flex";
  el.style.alignItems = "flex-end";
  el.style.justifyContent = "center";
  el.style.paddingBottom = "28px";
  const bar = document.createElement("nav");
  el.appendChild(bar);
  let items = [], springs = [], mx = -1e4;
  const build = () => {
    const names = list(p, "items"), icons = list(p, "icons"), b = num(p, "base", 52);
    bar.style.cssText = `display:flex;align-items:flex-end;gap:10px;padding:10px 12px;border-radius:${b * 0.45}px;background:${rgba(str(p, "surface"), 0.72)};backdrop-filter:blur(18px) saturate(1.4);border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 50px -20px rgba(0,0,0,.6)`;
    bar.innerHTML = names.map((n, i) => `<button aria-label="${escapeHTML(n)}" style="all:unset;position:relative;cursor:pointer;width:${b}px;height:${b}px;border-radius:${b * 0.28}px;display:grid;place-items:center;font-size:${b * 0.45}px;color:#fff;background:linear-gradient(135deg,hsl(${i * 47 % 360} 70% 55%),hsl(${(i * 47 + 40) % 360} 70% 40%));box-shadow:inset 0 1px 0 rgba(255,255,255,.3)"><span>${escapeHTML(icons[i] ?? "•")}</span><i style="position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);font:500 12px system-ui;font-style:normal;padding:4px 8px;border-radius:6px;background:rgba(0,0,0,.75);white-space:nowrap;opacity:0;transition:opacity .15s;pointer-events:none">${escapeHTML(n)}</i></button>`).join("");
    items = Array.from(bar.children);
    springs = items.map(() => springValue(b, 300, 26));
    items.forEach((it) => {
      it.onmouseenter = () => it.lastElementChild.style.opacity = "1";
      it.onmouseleave = () => it.lastElementChild.style.opacity = "0";
    });
  };
  build();
  const move = (e) => mx = e.clientX;
  const leave = () => mx = -1e4;
  bar.addEventListener("pointermove", move);
  bar.addEventListener("pointerleave", leave);
  const loop = createLoop(el, ctx, (dt) => {
    const b = num(p, "base", 52), mag = num(p, "magnify", 1.9), D = num(p, "distance", 150);
    items.forEach((it, i) => {
      const r = it.getBoundingClientRect();
      const d = Math.abs(mx - (r.left + r.width / 2));
      const k = d < D ? Math.cos(d / D * (Math.PI / 2)) : 0;
      springs[i].set(b * (1 + (mag - 1) * k * k));
      const v = springs[i].step(dt || 1 / 60);
      it.style.width = it.style.height = `${v}px`;
      it.firstElementChild.style.fontSize = `${v * 0.45}px`;
    });
  }, { allowReduced: true });
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    bar.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
