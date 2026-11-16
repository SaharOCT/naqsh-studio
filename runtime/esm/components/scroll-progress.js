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

// src/library/items/scroll-progress/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  el.style.display = el.style.display || "grid";
  el.style.placeItems = "center";
  const box = document.createElement("button");
  box.type = "button";
  box.setAttribute("aria-label", "Back to top");
  box.style.cssText = "all:unset;cursor:pointer;display:grid;place-items:center";
  el.appendChild(box);
  const toTop = () => window.scrollTo({ top: 0, behavior: ctx.reducedMotion ? "auto" : "smooth" });
  box.addEventListener("click", toTop);
  const build = () => {
    const s = num(p, "size", 64);
    if (bool(p, "fixed")) Object.assign(box.style, { position: "fixed", insetInlineEnd: "24px", bottom: "24px", zIndex: "50" });
    else Object.assign(box.style, { position: "static" });
    if (str(p, "shape") === "bar") {
      box.style.width = "min(100%, 520px)";
      box.innerHTML = `<div style="width:100%;height:${Math.max(2, s / 10)}px;border-radius:99px;background:${escapeHTML(str(p, "track"))};overflow:hidden"><div class="fill" style="height:100%;width:0;background:${escapeHTML(str(p, "color"))};border-radius:inherit"></div></div><span class="pct" style="font-size:13px;margin-top:8px;opacity:.7;color:#ccc">0%</span>`;
    } else {
      box.style.width = "auto";
      const r = 45, c = 2 * Math.PI * r;
      box.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="transform:rotate(-90deg)"><circle cx="50" cy="50" r="${r}" fill="none" stroke="${escapeHTML(str(p, "track"))}" stroke-width="7"/><circle class="ring" cx="50" cy="50" r="${r}" fill="none" stroke="${escapeHTML(str(p, "color"))}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}"/></svg><span class="pct" style="position:absolute;font-size:${Math.max(10, s * 0.22)}px;font-weight:600;color:#eee">0%</span>`;
      box.style.position = bool(p, "fixed") ? "fixed" : "relative";
    }
  };
  build();
  const loop = createLoop(el, ctx, () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const t = max > 0 ? window.scrollY / max : 0;
    const fill = box.querySelector(".fill"), ring = box.querySelector(".ring"), pct = box.querySelector(".pct");
    if (fill) fill.style.width = `${t * 100}%`;
    if (ring) {
      const c = 2 * Math.PI * 45;
      ring.style.strokeDashoffset = String(c * (1 - t));
    }
    if (pct) pct.textContent = `${Math.round(t * 100)}%`;
  }, { allowReduced: true });
  return { update(n) {
    p = { ...p, ...n };
    build();
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    box.removeEventListener("click", toTop);
    box.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
