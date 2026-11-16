// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
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

// src/library/items/counter/runtime.ts
var AR = "٠١٢٣٤٥٦٧٨٩";
var mount = (el, props, ctx) => {
  let p = { ...props };
  let speed = ctx.speed;
  const box = document.createElement("div");
  box.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:.4em;text-align:center";
  el.appendChild(box);
  let stop = () => {
  }, anims = [];
  const digitsOf = (n) => Math.round(n).toLocaleString("en-US");
  const glyph = (d) => str(p, "numerals") === "arab" && /\d/.test(d) ? AR[Number(d)] : d === "," && str(p, "numerals") === "arab" ? "٬" : d;
  const build = () => {
    const s = digitsOf(num(p, "value", 2480));
    const size = num(p, "size", 88);
    const cols = Array.from(s).map(
      (d) => /\d/.test(d) ? `<span class="col" data-d="${d}" style="display:inline-block;height:1em;overflow:hidden;line-height:1"><span class="reel" style="display:flex;flex-direction:column">${Array.from({ length: 10 }, (_, i) => `<span>${glyph(String(i))}</span>`).join("")}</span></span>` : `<span>${glyph(d)}</span>`
    ).join("");
    box.innerHTML = `<div aria-label="${escapeHTML(str(p, "prefix") + s + str(p, "suffix"))}" style="display:flex;direction:ltr;font-size:${size}px;font-weight:700;letter-spacing:-.03em;color:${escapeHTML(str(p, "color"))};font-variant-numeric:tabular-nums;line-height:1"><span>${escapeHTML(str(p, "prefix"))}</span><span aria-hidden="true" style="display:flex">${cols}</span><span>${escapeHTML(str(p, "suffix"))}</span></div>
      <div style="font-size:${Math.max(12, size * 0.18)}px;color:${escapeHTML(str(p, "labelColor"))};letter-spacing:.02em">${escapeHTML(str(p, "label"))}</div>`;
  };
  const play = () => {
    anims.forEach((a) => a.cancel());
    const cols = Array.from(box.querySelectorAll(".col"));
    anims = cols.map((c, i) => {
      const d = Number(c.dataset.d);
      const reel = c.firstElementChild;
      const turns = cols.length - i;
      return reel.animate([{ transform: "translateY(0)" }, { transform: `translateY(-${d * 10}%)` }], {
        duration: ctx.reducedMotion ? 1 : (num(p, "duration", 1800) + turns * 60) / speed,
        easing: "cubic-bezier(.16,1,.3,1)",
        fill: "forwards"
      });
    });
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
