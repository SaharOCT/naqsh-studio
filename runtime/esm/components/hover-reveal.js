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
function safeURL(u) {
  const s = u.trim();
  if (/^https?:\/\//i.test(s) || /^\/\//.test(s) || /^data:(image|video|model)\//i.test(s) || /^blob:/i.test(s)) return s;
  if (/^[\w./%-][\w./%~-]*$/.test(s) && !s.includes(":")) return s;
  return "";
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
var PALETTES = [
  ["#0f0c29", "#ff6a3d", "#ffd36e"],
  ["#06121f", "#2bd9c4", "#5b6cff"],
  ["#1a0b2e", "#c13cff", "#ff8fd8"],
  ["#0b1a12", "#7dff9b", "#e6ff6e"],
  ["#140d06", "#ff9d2e", "#ff4d4d"],
  ["#050816", "#3d7bff", "#9ad1ff"],
  ["#1d0f0f", "#ff5c8a", "#ffc2a8"],
  ["#0a0a0a", "#f2f2f2", "#8a8a8a"],
  ["#071a1f", "#00c2ff", "#00ffa3"],
  ["#1b1206", "#e0b15a", "#7a4b1f"],
  ["#0d0221", "#ff2a6d", "#05d9e8"],
  ["#10141c", "#a6b8ff", "#ffe08a"]
];
function artwork(i, label = "") {
  const [bg, a, b] = PALETTES[(i % PALETTES.length + PALETTES.length) % PALETTES.length];
  const r = (n) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453 % 1 + 1) % 1;
  const circles = Array.from({ length: 4 }, (_, k) => {
    const cx = Math.round(r(k) * 800), cy = Math.round(r(k + 9) * 600), rad = Math.round(120 + r(k + 3) * 260);
    return `<circle cx='${cx}' cy='${cy}' r='${rad}' fill='${k % 2 ? a : b}' opacity='${(0.45 + r(k + 5) * 0.5).toFixed(2)}'/>`;
  }).join("");
  const lines = Array.from({ length: 9 }, (_, k) => `<path d='M0 ${80 + k * 60} Q400 ${40 + k * 60 + r(k) * 90} 800 ${80 + k * 60}' stroke='white' stroke-opacity='.08' fill='none'/>`).join("");
  const text = label ? `<text x='40' y='560' font-family='system-ui,sans-serif' font-size='34' font-weight='600' fill='white' opacity='.9'>${escapeHTML(label)}</text>` : "";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' preserveAspectRatio='xMidYMid slice'><defs><filter id='b'><feGaussianBlur stdDeviation='70'/></filter></defs><rect width='800' height='600' fill='${bg}'/><g filter='url(#b)'>${circles}</g>${lines}${text}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function resolveImage(src, i = 0) {
  const m = /^art:(\d+)$/.exec(src.trim());
  if (m) return artwork(Number(m[1]));
  return safeURL(src) || artwork(i);
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

// src/library/items/hover-reveal/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el, { clip: false });
  const ul = document.createElement("ul");
  const fig = document.createElement("div");
  el.append(ul, fig);
  const sx = springValue(0, 140, 18), sy = springValue(0, 140, 18), vis = springValue(0, 200, 24);
  let active = -1, lastX = 0;
  const build = () => {
    const t = list(p, "titles"), m = list(p, "meta"), im = list(p, "images");
    ul.style.cssText = `list-style:none;margin:0;padding:0 4%;width:100%;box-sizing:border-box;color:${str(p, "text")}`;
    ul.innerHTML = t.map((x, i) => `<li data-i="${i}" style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:18px 0;border-bottom:1px solid ${escapeHTML(str(p, "line"))};cursor:pointer;transition:opacity .3s,padding .4s cubic-bezier(.16,1,.3,1)"><span dir="auto" style="font-size:clamp(26px,4.4vw,64px);font-weight:600;letter-spacing:-.035em;line-height:1">${escapeHTML(x)}</span><span style="font:500 13px ui-monospace,monospace;opacity:.5;white-space:nowrap">${escapeHTML(m[i] ?? "")}</span></li>`).join("");
    const w = num(p, "imageWidth", 280);
    fig.style.cssText = `position:absolute;left:0;top:0;width:${w}px;aspect-ratio:4/5;pointer-events:none;z-index:10;border-radius:12px;overflow:hidden;will-change:transform,opacity;box-shadow:0 30px 60px -20px rgba(0,0,0,.6)`;
    fig.innerHTML = im.map((s, i) => `<img alt="" src="${resolveImage(s, i)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .35s">`).join("");
    ul.querySelectorAll("li").forEach((li) => {
      li.onmouseenter = () => setActive(Number(li.dataset.i));
    });
    ul.onmouseleave = () => setActive(-1);
  };
  const setActive = (i) => {
    active = i;
    vis.set(i >= 0 ? 1 : 0);
    fig.querySelectorAll("img").forEach((im, k) => im.style.opacity = k === i ? "1" : "0");
    ul.querySelectorAll("li").forEach((li, k) => {
      li.style.opacity = i < 0 || k === i ? "1" : "0.35";
      li.style.paddingInlineStart = k === i ? "18px" : "0";
    });
  };
  const move = (e) => {
    const r = el.getBoundingClientRect();
    sx.set(e.clientX - r.left);
    sy.set(e.clientY - r.top);
  };
  el.addEventListener("pointermove", move);
  build();
  const loop = createLoop(el, ctx, (dt) => {
    const h = dt || 1 / 60;
    const x = sx.step(h), y = sy.step(h), v = vis.step(h);
    const vel = (x - lastX) / h;
    lastX = x;
    const w = num(p, "imageWidth", 280);
    fig.style.transform = `translate3d(${x - w / 2}px, ${y - w * 0.62}px, 0) rotate(${Math.max(-14, Math.min(14, vel * 0.012))}deg) scale(${0.6 + 0.4 * v})`;
    fig.style.opacity = String(Math.max(0, Math.min(1, v)));
    void active;
  }, { allowReduced: true });
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    el.removeEventListener("pointermove", move);
    ul.remove();
    fig.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
