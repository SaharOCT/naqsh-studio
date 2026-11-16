var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/core/motion/engine.ts
function simulateSpring(sp, samples = 64) {
  const { stiffness: k, damping: c, mass: m } = sp;
  let x = 0, v = 0, t = 0;
  const dt = 1 / 240, raw = [];
  let settledAt = 0;
  for (let i = 0; i < 240 * 10; i++) {
    const a = (-k * (x - 1) - c * v) / m;
    v += a * dt;
    x += v * dt;
    t += dt;
    raw.push(x);
    if (Math.abs(x - 1) < 1e-3 && Math.abs(v) < 1e-3) {
      settledAt = t;
      break;
    }
  }
  const duration = settledAt || t;
  const points = [];
  for (let i = 0; i <= samples; i++) points.push(raw[Math.min(raw.length - 1, Math.round(i / samples * (raw.length - 1)))]);
  points[points.length - 1] = 1;
  return { points, duration };
}
function springToCss(sp) {
  const { points, duration } = simulateSpring(sp);
  return { easing: `linear(${points.map((p) => +p.toFixed(4)).join(", ")})`, duration: Math.round(duration * 1e3) };
}
var EASING_PRESETS = {
  linear: "linear",
  ease: "ease",
  "ease-in": "cubic-bezier(.4,0,1,1)",
  "ease-out": "cubic-bezier(0,0,.2,1)",
  "ease-in-out": "cubic-bezier(.4,0,.2,1)",
  "expo-out": "cubic-bezier(.16,1,.3,1)",
  "expo-in-out": "cubic-bezier(.87,0,.13,1)",
  "back-out": "cubic-bezier(.34,1.56,.64,1)",
  "circ-out": "cubic-bezier(0,.55,.45,1)",
  smooth: "cubic-bezier(.2,.8,.2,1)"
};
function resolveEasing(e, fallbackDuration) {
  if (!e) return { easing: EASING_PRESETS.smooth, duration: fallbackDuration };
  if (typeof e === "object" && e.type === "spring") return springToCss(e);
  const s = String(e);
  return { easing: EASING_PRESETS[s] ?? s, duration: fallbackDuration };
}
var TRANSFORM_KEYS = ["x", "y", "z", "rotate", "rotateX", "rotateY", "skewX", "skewY", "scale", "scaleX", "scaleY"];
var NEUTRAL = { x: 0, y: 0, z: 0, rotate: 0, rotateX: 0, rotateY: 0, skewX: 0, skewY: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: 1, blur: 0, brightness: 1 };
function propsToCss(p, used) {
  const out = {};
  if (TRANSFORM_KEYS.some((k) => used.has(k))) {
    const v = (k) => p[k] ?? NEUTRAL[k];
    const parts = [];
    if (used.has("x") || used.has("y") || used.has("z")) parts.push(`translate3d(${v("x")}px, ${v("y")}px, ${v("z")}px)`);
    if (used.has("rotate")) parts.push(`rotate(${v("rotate")}deg)`);
    if (used.has("rotateX")) parts.push(`rotateX(${v("rotateX")}deg)`);
    if (used.has("rotateY")) parts.push(`rotateY(${v("rotateY")}deg)`);
    if (used.has("skewX") || used.has("skewY")) parts.push(`skew(${v("skewX")}deg, ${v("skewY")}deg)`);
    if (used.has("scale")) parts.push(`scale(${v("scale")})`);
    if (used.has("scaleX") || used.has("scaleY")) parts.push(`scale(${v("scaleX")}, ${v("scaleY")})`);
    out.transform = parts.join(" ");
  }
  if (used.has("opacity")) out.opacity = p.opacity ?? NEUTRAL.opacity;
  if (used.has("blur") || used.has("brightness")) out.filter = `blur(${p.blur ?? 0}px) brightness(${p.brightness ?? 1})`;
  for (const k of ["color", "backgroundColor", "borderRadius", "boxShadow", "clipPath"]) if (p[k] !== void 0) out[k] = p[k];
  if (p.vars) for (const [k, v] of Object.entries(p.vars)) out[k] = v;
  return out;
}
function toWaapiKeyframes(kfs, reduced) {
  const sorted = [...kfs].sort((a, b) => a.offset - b.offset);
  if (reduced === "fade") {
    const first = sorted[0]?.props.opacity ?? 0, last = sorted[sorted.length - 1]?.props.opacity ?? 1;
    return [{ opacity: first, offset: 0 }, { opacity: last, offset: 1 }];
  }
  const used = /* @__PURE__ */ new Set();
  for (const k of sorted) for (const key of Object.keys(k.props)) used.add(key);
  let carry = {};
  return sorted.map((k) => {
    carry = { ...carry, ...k.props };
    const css = propsToCss(carry, used);
    const frame = { ...css, offset: Math.min(1, Math.max(0, k.offset)) };
    if (k.easing) frame.easing = EASING_PRESETS[k.easing] ?? k.easing;
    return frame;
  });
}
var ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
function splitForStagger(el, mode) {
  if (el.dataset.nqSplit === mode) return Array.from(el.querySelectorAll(".nq-u"));
  const text = el.textContent ?? "";
  const m = mode === "chars" && !ARABIC.test(text) ? "chars" : "words";
  el.setAttribute("aria-label", text);
  if (!el.getAttribute("dir")) el.setAttribute("dir", "auto");
  const original = Array.from(el.childNodes);
  el.textContent = "";
  const out = [];
  const unit = (u) => {
    const s = document.createElement("span");
    s.className = "nq-u";
    s.setAttribute("aria-hidden", "true");
    s.style.display = "inline-block";
    s.style.whiteSpace = "pre";
    s.textContent = u;
    el.appendChild(s);
    out.push(s);
  };
  for (const n of original) {
    if (n.nodeType !== Node.TEXT_NODE) {
      el.appendChild(n);
      continue;
    }
    const t = n.textContent ?? "";
    const parts = m === "chars" ? t.split(/(\s+)/).flatMap((w) => /^\s+$/.test(w) ? [w] : Array.from(w)) : t.split(/(\s+)/);
    for (const u of parts) {
      if (!u) continue;
      if (/^\s+$/.test(u)) el.appendChild(document.createTextNode(u));
      else unit(u);
    }
  }
  el.dataset.nqSplit = mode;
  return out;
}
var MotionController = class {
  constructor(opts) {
    __publicField(this, "opts", opts);
    __publicField(this, "running", /* @__PURE__ */ new Map());
    // key nodeId:trackId
    __publicField(this, "scrubbers", []);
    __publicField(this, "raf", 0);
    __publicField(this, "speed");
    __publicField(this, "listeners", []);
    __publicField(this, "loop", () => {
      this.raf = requestAnimationFrame(this.loop);
      for (const s of this.scrubbers) s.update();
    });
    this.speed = opts.speed ?? 1;
  }
  /** Attach every track of a node. */
  attach(nodeId, el, tracks) {
    for (const t of tracks) {
      if (t.enabled === false) continue;
      if (t.disabledOn?.includes(this.opts.breakpoint)) continue;
      this.attachTrack(nodeId, el, t);
    }
    if (this.scrubbers.length && !this.raf) this.loop();
  }
  build(nodeId, el, t) {
    const reducedPolicy = this.opts.reducedMotion ? t.reducedMotion ?? "fade" : "keep";
    const targets = t.stagger ? t.stagger.target === "children" ? Array.from((el.querySelector(":scope > .nq-slot") ?? el).children) : splitForStagger(el, t.stagger.target) : [el];
    const frames = toWaapiKeyframes(t.keyframes, reducedPolicy === "fade" ? "fade" : "full");
    const { easing, duration } = resolveEasing(t.easing, t.duration);
    const n = targets.length;
    const each = t.stagger?.each ?? 0;
    const order = (i) => t.stagger?.from === "end" ? n - 1 - i : t.stagger?.from === "center" ? Math.abs(i - (n - 1) / 2) : i;
    const iterations = t.iterations < 0 ? Infinity : Math.max(1, t.iterations);
    const anims = targets.map((target, i) => {
      if (reducedPolicy === "skip") {
        const last = frames[frames.length - 1];
        const a2 = target.animate([{ ...last, offset: 1 }], { duration: 1, fill: "forwards" });
        a2.pause();
        return a2;
      }
      const a = target.animate(frames, {
        duration,
        delay: t.delay + order(i) * each,
        easing,
        iterations,
        direction: t.direction,
        fill: t.fill
      });
      a.pause();
      a.playbackRate = this.speed;
      return a;
    });
    const totalMs = t.delay + duration * (Number.isFinite(iterations) ? iterations : 1) + Math.max(0, n - 1) * each;
    return { track: t, nodeId, anims, totalMs, cleanup: [] };
  }
  attachTrack(nodeId, el, t) {
    const key = `${nodeId}:${t.id}`;
    this.running.get(key)?.anims.forEach((a) => a.cancel());
    const r = this.build(nodeId, el, t);
    this.running.set(key, r);
    if (this.opts.passive) {
      r.anims.forEach((a) => a.cancel());
      return;
    }
    const showFirst = ["inView", "load", "click", "hover", "manual", "timer", "focus"].includes(t.trigger) && t.fill !== "none";
    if (showFirst) r.anims.forEach((a) => a.currentTime = 0);
    const trigEl = t.triggerNodeId && this.opts.getEl(t.triggerNodeId) || el;
    const play = () => this.play(nodeId, t.id);
    const reverse = () => r.anims.forEach((a) => {
      a.playbackRate = -Math.abs(this.speed);
      a.play();
    });
    const on = (target, ev, fn) => {
      target.addEventListener(ev, fn);
      r.cleanup.push(() => target.removeEventListener(ev, fn));
    };
    if (t.after) {
      const prev = this.running.get(`${nodeId}:${t.after}`);
      const last = prev?.anims[prev.anims.length - 1];
      if (last) last.addEventListener("finish", play);
      return;
    }
    switch (t.trigger) {
      case "load":
        play();
        break;
      case "inView":
      case "outView": {
        let played = false;
        const io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              const hit = t.trigger === "inView" ? e.isIntersecting : !e.isIntersecting && played;
              if (t.trigger === "outView" && e.isIntersecting) played = true;
              if (hit) {
                play();
                if (t.once !== false) io.disconnect();
              } else if (t.trigger === "inView" && !e.isIntersecting && t.once === false) {
                if (t.reverseOnExit) reverse();
                else r.anims.forEach((a) => {
                  a.pause();
                  a.currentTime = 0;
                });
              }
            }
          },
          { threshold: 0.15 }
        );
        io.observe(trigEl);
        r.cleanup.push(() => io.disconnect());
        break;
      }
      case "hover":
        on(trigEl, "mouseenter", play);
        on(trigEl, "mouseleave", () => t.reverseOnExit !== false ? reverse() : void 0);
        break;
      case "focus":
        on(trigEl, "focusin", play);
        on(trigEl, "focusout", () => t.reverseOnExit !== false ? reverse() : void 0);
        break;
      case "click": {
        let on2 = false;
        on(trigEl, "click", () => {
          if (t.reverseOnExit && on2) reverse();
          else play();
          on2 = !on2;
        });
        break;
      }
      case "timer": {
        const id = window.setInterval(play, Math.max(200, t.timer?.interval ?? 3e3));
        play();
        r.cleanup.push(() => clearInterval(id));
        break;
      }
      case "scroll": {
        const dur = r.totalMs;
        const range = t.scroll ?? { start: 0, end: 1 };
        const update = () => {
          let prog;
          if (range.target === "page") {
            const max = document.documentElement.scrollHeight - innerHeight;
            prog = max > 0 ? scrollY / max : 0;
          } else {
            const rect = trigEl.getBoundingClientRect();
            const vh = innerHeight || 1;
            prog = (vh - rect.top) / (vh + rect.height);
          }
          const p = Math.min(1, Math.max(0, (prog - range.start) / Math.max(1e-4, range.end - range.start)));
          r.anims.forEach((a) => a.currentTime = p * dur);
        };
        update();
        this.scrubbers.push({ update });
        break;
      }
      case "mouseMove": {
        const dur = r.totalMs;
        let target = 0.5, cur = 0.5;
        const ax = t.mouse?.axis ?? "x";
        const sm = t.mouse?.smoothing ?? 0.12;
        on(window, "pointermove", ((e) => {
          target = ax === "y" ? e.clientY / innerHeight : ax === "both" ? (e.clientX / innerWidth + e.clientY / innerHeight) / 2 : e.clientX / innerWidth;
        }));
        this.scrubbers.push({
          update: () => {
            cur += (target - cur) * sm;
            r.anims.forEach((a) => a.currentTime = cur * dur);
          }
        });
        break;
      }
      case "manual":
        break;
    }
  }
  play(nodeId, trackId) {
    const runs = [...this.running.values()].filter((r) => r.nodeId === nodeId && (!trackId || r.track.id === trackId));
    return Promise.all(
      runs.flatMap(
        (r) => r.anims.map((a) => {
          a.playbackRate = Math.abs(this.speed);
          if (a.playState === "finished" || Number(a.currentTime ?? 0) >= r.totalMs) a.currentTime = 0;
          a.play();
          return a.finished.then(() => void 0).catch(() => void 0);
        })
      )
    ).then(() => void 0);
  }
  /** Editor preview: play then return to the resting design state. */
  async preview(nodeId, trackId) {
    await this.play(nodeId, trackId);
    await new Promise((r) => setTimeout(r, 350));
    for (const r of this.running.values()) if (r.nodeId === nodeId && (!trackId || r.track.id === trackId)) r.anims.forEach((a) => a.cancel());
  }
  /** Editor timeline: return everything to the resting state. */
  resetAll() {
    for (const r of this.running.values()) r.anims.forEach((a) => a.cancel());
  }
  pause(nodeId, trackId) {
    for (const r of this.running.values()) if (r.nodeId === nodeId && (!trackId || r.track.id === trackId)) r.anims.forEach((a) => a.pause());
  }
  /** Editor timeline: seek every animation of a node to a time (ms). */
  seek(nodeId, ms) {
    for (const r of this.running.values()) if (r.nodeId === nodeId) r.anims.forEach((a) => {
      a.pause();
      a.currentTime = ms;
    });
  }
  restartAll() {
    for (const r of this.running.values()) {
      if (r.track.trigger === "scroll" || r.track.trigger === "mouseMove") continue;
      r.anims.forEach((a) => {
        a.currentTime = 0;
        a.playbackRate = Math.abs(this.speed);
        a.play();
      });
    }
  }
  setSpeed(s) {
    this.speed = s;
    for (const r of this.running.values()) r.anims.forEach((a) => a.playbackRate = Math.sign(a.playbackRate || 1) * s);
  }
  pauseAll() {
    for (const r of this.running.values()) r.anims.forEach((a) => a.pause());
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const r of this.running.values()) {
      r.cleanup.forEach((c) => c());
      r.anims.forEach((a) => a.cancel());
    }
    this.running.clear();
    this.scrubbers = [];
    this.listeners.forEach((l) => l());
  }
};
function currentBreakpoint(bps, width = typeof innerWidth === "number" ? innerWidth : 1440) {
  let id = "base";
  for (const b of [...bps].filter((b2) => b2.maxWidth).sort((a, b2) => b2.maxWidth - a.maxWidth)) if (width <= b.maxWidth) id = b.id;
  return id;
}

// src/core/runtime/interactions.ts
var SAFE_STYLE_PROPS = /^(--[\w-]+|[a-zA-Z-]+)$/;
var isSafeUrl = (u) => /^(https?:|mailto:|tel:|#|\/|\.\/)/i.test(u);
var InteractionEngine = class {
  constructor(host) {
    __publicField(this, "host", host);
    __publicField(this, "state", /* @__PURE__ */ new Map());
    __publicField(this, "cleanups", []);
  }
  attach(nodeId, el, rules) {
    for (const rule of rules) {
      if (rule.enabled === false) continue;
      const run = (ev) => {
        if (!this.check(rule.conditions)) return;
        if (rule.trigger.type === "click" && el.tagName === "A" && rule.actions.some((a) => a.type !== "openLink")) ev?.preventDefault();
        void this.runActions(nodeId, rule.actions);
      };
      const on = (target, type, fn) => {
        target.addEventListener(type, fn);
        this.cleanups.push(() => target.removeEventListener(type, fn));
      };
      switch (rule.trigger.type) {
        case "click":
          on(el, "click", run);
          break;
        case "hover":
          on(el, "mouseenter", run);
          break;
        case "hoverEnd":
          on(el, "mouseleave", run);
          break;
        case "focus":
          on(el, "focusin", run);
          break;
        case "keydown": {
          const key = String(rule.trigger.params?.key ?? "Enter");
          on(window, "keydown", ((e) => {
            if (e.key === key) run(e);
          }));
          break;
        }
        case "load":
          run();
          break;
        case "inView": {
          const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && run()), { threshold: 0.3 });
          io.observe(el);
          this.cleanups.push(() => io.disconnect());
          break;
        }
        case "scrollPast": {
          let fired = false;
          const fn = () => {
            const past = el.getBoundingClientRect().top < innerHeight * Number(rule.trigger.params?.at ?? 0.5);
            if (past && !fired) {
              fired = true;
              run();
            } else if (!past) fired = false;
          };
          on(window, "scroll", fn);
          break;
        }
        case "timer": {
          const id = window.setInterval(run, Math.max(250, Number(rule.trigger.params?.interval ?? 3e3)));
          this.cleanups.push(() => clearInterval(id));
          break;
        }
      }
    }
  }
  check(conds) {
    return conds.every((c) => {
      const v = c.kind === "state" ? this.state.get(c.key ?? "") : c.kind === "breakpoint" ? this.host.breakpoint() : c.kind === "reducedMotion" ? this.host.reducedMotion : document.documentElement.dataset.theme ?? "light";
      switch (c.op) {
        case "eq":
          return String(v) === String(c.value);
        case "neq":
          return String(v) !== String(c.value);
        case "gt":
          return Number(v) > Number(c.value);
        case "lt":
          return Number(v) < Number(c.value);
      }
    });
  }
  async runActions(selfId, actions) {
    let pending = Promise.resolve();
    for (const a of actions) {
      if (a.delay) await new Promise((r) => setTimeout(r, a.delay));
      if (a.wait) await pending;
      pending = this.exec(selfId, a);
    }
  }
  exec(selfId, a) {
    const id = !a.targetId || a.targetId === "self" ? selfId : a.targetId;
    const el = this.host.getEl(id);
    const p = a.params ?? {};
    switch (a.type) {
      case "show":
        if (el) el.dataset.nqHidden = "false";
        break;
      case "hide":
        if (el) el.dataset.nqHidden = "true";
        break;
      case "toggle":
        if (el) el.dataset.nqHidden = el.dataset.nqHidden === "true" ? "false" : "true";
        break;
      case "openModal":
        if (el) {
          el.dataset.nqHidden = "false";
          el.classList.add("nq-modal-open");
          const close = (e) => {
            if (e.target === el) {
              el.classList.remove("nq-modal-open");
              el.dataset.nqHidden = "true";
              el.removeEventListener("click", close);
            }
          };
          el.addEventListener("click", close);
        }
        break;
      case "closeModal":
        if (el) {
          el.classList.remove("nq-modal-open");
          el.dataset.nqHidden = "true";
        }
        break;
      case "playAnimation":
        return this.host.motion.play(id, p.trackId ? String(p.trackId) : void 0);
      case "pauseAnimation":
        this.host.motion.pause(id, p.trackId ? String(p.trackId) : void 0);
        break;
      case "setStyle": {
        const prop = String(p.property ?? "");
        if (el && SAFE_STYLE_PROPS.test(prop)) {
          const val = String(p.value ?? "").replace(/[<>{};]/g, "");
          if (prop.startsWith("--")) el.style.setProperty(prop, val);
          else el.style.setProperty(prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()), val);
          if (p.transition) el.style.transition = `all ${Number(p.transition)}ms cubic-bezier(.2,.8,.2,1)`;
        }
        break;
      }
      case "setText":
        if (el) el.textContent = String(p.text ?? "");
        break;
      case "toggleClass":
        if (el && /^[\w-]+$/.test(String(p.className))) el.classList.toggle(String(p.className));
        break;
      case "scrollTo":
        el?.scrollIntoView({ behavior: this.host.reducedMotion ? "auto" : "smooth", block: p.block ?? "start" });
        break;
      case "switchVariant":
        if (el) el.dataset.variant = String(p.variant ?? "");
        break;
      case "setState": {
        const key = String(p.key ?? "");
        const cur = this.state.get(key);
        this.state.set(key, p.toggle ? !cur : p.value);
        document.documentElement.dataset[`nqState${key.replace(/^\w/, (c) => c.toUpperCase())}`] = String(this.state.get(key));
        break;
      }
      case "navigate":
        this.host.navigate(String(p.page ?? ""));
        break;
      case "openLink": {
        const url = String(p.url ?? "");
        if (isSafeUrl(url)) p.newTab ? window.open(url, "_blank", "noopener,noreferrer") : location.href = url;
        break;
      }
      case "toggleTheme": {
        const root = document.documentElement;
        root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
        break;
      }
    }
    return Promise.resolve();
  }
  destroy() {
    this.cleanups.forEach((c) => c());
    this.cleanups = [];
  }
};

// src/core/runtime/page-runtime.ts
var RUNTIME_VERSION = "1.0.0";
function boot(payload, opts = {}) {
  const root = opts.root ?? document;
  const registry = opts.components ?? window.NaqshRuntime?.components ?? {};
  const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const getEl = (id) => root.querySelector(`[data-nq-id="${CSS.escape(id)}"]`);
  const bp = () => currentBreakpoint(payload.settings.breakpoints);
  const dir = document.documentElement.dir || "ltr";
  const instances = opts.instances ?? /* @__PURE__ */ new Map();
  const seen = /* @__PURE__ */ new Set();
  for (const c of payload.components) {
    seen.add(c.id);
    const el = getEl(c.id);
    const mount = registry[c.componentId];
    if (!el) continue;
    const existing = instances.get(c.id);
    if (existing && existing.componentId === c.componentId) {
      existing.instance.update(c.props);
      continue;
    }
    existing?.instance.destroy();
    if (!mount) {
      el.dataset.nqMissing = c.componentId;
      console.warn(`[naqsh] component runtime "${c.componentId}" not loaded`);
      continue;
    }
    try {
      instances.set(c.id, { componentId: c.componentId, el, instance: mount(el, c.props, { speed: opts.speed ?? 1, reducedMotion, dir }) });
    } catch (err) {
      console.error(`[naqsh] failed to mount ${c.componentId}`, err);
      el.dataset.nqError = "mount";
    }
  }
  for (const [id, inst] of instances) if (!seen.has(id)) {
    inst.instance.destroy();
    instances.delete(id);
  }
  const motion = new MotionController({ reducedMotion, breakpoint: bp(), getEl, speed: opts.speed, passive: opts.passive });
  for (const [nodeId, tracks] of Object.entries(payload.animations)) {
    const el = getEl(nodeId);
    if (el) motion.attach(nodeId, el, tracks);
  }
  const navigate = opts.navigate ?? ((target) => {
    const slug = payload.pages[target] ?? target;
    location.href = slug === "" || slug === "index" ? "index.html" : `${slug}.html`;
  });
  const interactions = new InteractionEngine({ getEl, motion, breakpoint: bp, reducedMotion, navigate });
  if (!opts.passive) {
    for (const [nodeId, rules] of Object.entries(payload.interactions)) {
      const el = getEl(nodeId);
      if (el) interactions.attach(nodeId, el, rules);
    }
  }
  let lenis = null;
  let lenisRaf = 0;
  const LenisCtor = window.NaqshVendor?.lenis;
  if (!opts.passive && payload.settings.smoothScroll && !reducedMotion && LenisCtor && root === document) {
    lenis = new LenisCtor({ lerp: 0.1, smoothWheel: true });
    const tick = (t) => {
      lenis.raf(t);
      lenisRaf = requestAnimationFrame(tick);
    };
    lenisRaf = requestAnimationFrame(tick);
  }
  let toggle = null;
  if (!opts.passive && payload.settings.themeToggle && root === document) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "nq-theme-toggle";
    toggle.setAttribute("aria-label", "Toggle dark mode");
    toggle.textContent = "◐";
    toggle.style.cssText = "position:fixed;inset-inline-end:20px;bottom:20px;z-index:999;width:44px;height:44px;border-radius:50%;border:1px solid color-mix(in srgb,currentColor 25%,transparent);background:var(--color-surface,#fff);color:var(--color-text,#111);font-size:20px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.2)";
    toggle.onclick = () => {
      const r = document.documentElement;
      r.dataset.theme = r.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("nq-theme", r.dataset.theme);
      } catch {
      }
    };
    try {
      const saved = localStorage.getItem("nq-theme");
      if (saved) document.documentElement.dataset.theme = saved;
    } catch {
    }
    document.body.appendChild(toggle);
  }
  return {
    motion,
    interactions,
    instances,
    destroy(keepComponents = false) {
      toggle?.remove();
      motion.destroy();
      interactions.destroy();
      cancelAnimationFrame(lenisRaf);
      lenis?.destroy();
      if (!keepComponents) {
        for (const i of instances.values()) i.instance.destroy();
        instances.clear();
      }
    }
  };
}
function autoBoot() {
  const run = () => {
    const el = document.getElementById("naqsh-boot");
    if (!el) return;
    try {
      const payload = JSON.parse(el.textContent || "{}");
      window.__naqsh = boot(payload);
    } catch (e) {
      console.error("[naqsh] boot failed", e);
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
}
export {
  RUNTIME_VERSION,
  autoBoot,
  boot
};
