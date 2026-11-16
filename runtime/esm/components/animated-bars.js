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
function onEnter(el, cb, threshold = 0.25) {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        cb();
      }
    },
    { threshold }
  );
  io.observe(el);
  return () => io.disconnect();
}

// src/library/items/animated-bars/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const box = document.createElement("div");
  box.style.cssText = "width:100%;height:100%;padding:20px;box-sizing:border-box";
  el.appendChild(box);
  let stop = () => {
  }, anims = [];
  const build = () => {
    const labels = list(p, "labels"), values = list(p, "values").map(Number).map((v) => Number.isFinite(v) ? v : 0);
    const max = Math.max(1, ...values), n = Math.max(1, labels.length), W = 600, H = 300, bw = W / n * 0.56;
    const bars = labels.map((l, i) => {
      const v = values[i] ?? 0, h = v / max * (H - 50), x = W / n * i + (W / n - bw) / 2;
      const col = v === max ? str(p, "accent") : str(p, "bar");
      return `<g><rect class="bar" x="${x}" y="${H - 30 - h}" width="${bw}" height="${h}" rx="6" fill="${escapeHTML(col)}" style="transform-origin:${x + bw / 2}px ${H - 30}px;transform-box:view-box"/>
        <text x="${x + bw / 2}" y="${H - 30 - h - 8}" text-anchor="middle" font-size="14" fill="${escapeHTML(str(p, "text"))}" class="val" opacity="0">${v}</text>
        <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="13" fill="${escapeHTML(str(p, "text"))}">${escapeHTML(l)}</text></g>`;
    }).join("");
    box.innerHTML = `<svg viewBox="0 0 600 300" width="100%" height="100%" role="img" aria-label="${escapeHTML(labels.map((l, i) => `${l}: ${values[i] ?? 0}`).join(", "))}" style="overflow:visible;font-family:inherit"><line x1="0" x2="600" y1="270" y2="270" stroke="currentColor" stroke-opacity=".15"/>${bars}</svg>`;
    box.querySelectorAll(".bar").forEach((b) => b.style.transform = "scaleY(0)");
  };
  const play = () => {
    anims.forEach((a) => a.cancel());
    const d = num(p, "duration", 1100) / speed;
    anims = [
      ...Array.from(box.querySelectorAll(".bar")).map((b, i) => b.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: ctx.reducedMotion ? 1 : d, delay: ctx.reducedMotion ? 0 : i * 80, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "forwards" })),
      ...Array.from(box.querySelectorAll(".val")).map((t, i) => t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: ctx.reducedMotion ? 0 : d * 0.7 + i * 80, fill: "forwards" }))
    ];
  };
  const init = () => {
    stop();
    build();
    stop = onEnter(el, play);
  };
  init();
  return { update(n) {
    p = { ...p, ...n };
    init();
  }, replay: play, setSpeed(s) {
    speed = s;
  }, destroy() {
    stop();
    anims.forEach((a) => a.cancel());
    box.remove();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
