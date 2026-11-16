// src/library/_shared/kit.ts
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
var clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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
function scrollScene(el, ctx, screens) {
  const track = document.createElement("div");
  const stage = document.createElement("div");
  track.style.cssText = "position:relative;width:100%";
  stage.style.cssText = "position:sticky;top:0;width:100%;overflow:hidden";
  track.appendChild(stage);
  el.appendChild(track);
  let len = screens;
  let smooth = 0;
  let auto = ctx.preview && !ctx.reducedMotion;
  let autoDir = 1;
  const stopAuto = () => {
    auto = false;
  };
  const layout = () => {
    if (ctx.preview) {
      el.style.overflowY = "auto";
      el.style.overscrollBehavior = "contain";
      const h = el.clientHeight || 300;
      track.style.height = `${h * len}px`;
      stage.style.height = `${h}px`;
    } else {
      track.style.height = `${len * 100}vh`;
      stage.style.height = "100vh";
    }
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(el);
  if (ctx.preview) {
    el.addEventListener("wheel", stopAuto, { passive: true });
    el.addEventListener("touchstart", stopAuto, { passive: true });
    el.addEventListener("pointerdown", stopAuto);
  }
  const raw = () => {
    if (ctx.preview) {
      const max = el.scrollHeight - el.clientHeight;
      return max > 0 ? el.scrollTop / max : 0;
    }
    const r = track.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  };
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (auto) {
      const max = el.scrollHeight - el.clientHeight;
      el.scrollTop += autoDir * Math.max(0.6, max / 900);
      if (el.scrollTop >= max - 1) autoDir = -1;
      if (el.scrollTop <= 0) autoDir = 1;
    }
    const t = raw();
    smooth += (t - smooth) * (ctx.reducedMotion ? 1 : 0.18);
  };
  tick();
  return {
    stage,
    progress: () => smooth,
    setLength(n) {
      len = n;
      layout();
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("wheel", stopAuto);
      el.removeEventListener("touchstart", stopAuto);
      el.removeEventListener("pointerdown", stopAuto);
      track.remove();
      el.style.overflowY = "";
    }
  };
}

// src/library/items/feature-story/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const scene = scrollScene(el, ctx, 4);
  let steps = [], pics = [], fills = [];
  const build = () => {
    const t = list(p, "titles"), b = list(p, "bodies"), im = list(p, "images");
    scene.setLength(Math.max(2, t.length + 0.5));
    scene.stage.style.background = str(p, "bg");
    scene.stage.style.color = str(p, "text");
    const acc = escapeHTML(str(p, "accent"));
    scene.stage.innerHTML = `<div style="position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:5%;align-items:center;padding:0 6%">
      <ol style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:clamp(14px,3vh,34px)">
        ${t.map((x, i) => `<li class="st" style="transition:opacity .4s,transform .4s;display:grid;grid-template-columns:3px 1fr;gap:18px"><span style="background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden;position:relative"><i class="fill" style="position:absolute;inset:0 0 auto;height:0;background:${acc}"></i></span><div dir="auto"><h3 style="margin:0 0 6px;font-size:clamp(20px,2.6vw,38px);letter-spacing:-.02em">${escapeHTML(x)}</h3><p style="margin:0;opacity:.65;font-size:clamp(13px,1.15vw,17px);line-height:1.5;max-width:420px">${escapeHTML(b[i] ?? "")}</p></div></li>`).join("")}
      </ol>
      <div style="position:relative;aspect-ratio:4/3.2;border-radius:24px;overflow:hidden;background:#111;box-shadow:0 40px 80px -40px rgba(0,0,0,.8)">
        ${t.map((_, i) => `<img class="pic" alt="" src="${resolveImage(im[i % Math.max(1, im.length)] ?? "", i)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;will-change:clip-path,transform">`).join("")}
      </div></div>`;
    steps = Array.from(scene.stage.querySelectorAll(".st"));
    pics = Array.from(scene.stage.querySelectorAll(".pic"));
    fills = Array.from(scene.stage.querySelectorAll(".fill"));
  };
  build();
  const loop = createLoop(el, ctx, () => {
    const n = steps.length, f = clamp(scene.progress() * n, 0, n - 1e-4), active = Math.floor(f);
    steps.forEach((s, i) => {
      s.style.opacity = i === active ? "1" : "0.35";
      s.style.transform = i === active ? "none" : "translateX(0)";
    });
    fills.forEach((fl, i) => fl.style.height = `${clamp(f - i, 0, 1) * 100}%`);
    pics.forEach((pc, i) => {
      const k = clamp((f - i) * 3 + 1, 0, 1);
      pc.style.clipPath = i === 0 ? "none" : `inset(${(1 - k) * 100}% 0 0 0)`;
      pc.style.transform = `scale(${1.12 - 0.12 * k})`;
      pc.style.zIndex = String(i);
    });
  }, { allowReduced: true });
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    scene.destroy();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
