// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
var clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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
var range = (p, a, b) => clamp((p - a) / Math.max(1e-6, b - a), 0, 1);
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

// src/library/items/scroll-text-reveal/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  const scene = scrollScene(el, ctx, num(p, "screens", 2.6));
  const box = document.createElement("div");
  box.style.cssText = "height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:6vh 8%;box-sizing:border-box;gap:28px";
  scene.stage.appendChild(box);
  let words = [];
  const build = () => {
    scene.stage.style.background = str(p, "bg");
    scene.setLength(num(p, "screens", 2.6));
    const text = str(p, "text");
    box.innerHTML = `<span style="font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:${escapeHTML(str(p, "accent"))};font-weight:600">${escapeHTML(str(p, "eyebrow"))}</span>
      <p dir="auto" aria-label="${escapeHTML(text)}" style="margin:0;max-width:1100px;font-size:clamp(22px,${num(p, "size", 54) / 14}vw,${num(p, "size", 54)}px);line-height:1.18;font-weight:600;letter-spacing:-.02em;text-align:center;color:${escapeHTML(str(p, "color"))}">${text.split(/(\s+)/).map((w) => /^\s+$/.test(w) ? w : `<span aria-hidden="true" style="transition:opacity .15s linear">${escapeHTML(w)}</span>`).join("")}</p>`;
    words = Array.from(box.querySelectorAll("p span"));
  };
  build();
  const loop = createLoop(el, ctx, () => {
    const pr = range(scene.progress(), 0.05, 0.85);
    const n = words.length, dim = num(p, "dim", 0.14);
    words.forEach((w, i) => {
      const k = range(pr, i / n - 0.02, (i + 1) / n + 0.04);
      w.style.opacity = String(lerp(dim, 1, k));
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
