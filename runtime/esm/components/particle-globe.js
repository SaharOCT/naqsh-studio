// src/library/items/particle-globe/runtime.ts
import * as THREE from "three";

// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
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
function webglFallback(el, colors) {
  el.style.background = `linear-gradient(135deg, ${colors.join(",")})`;
  el.dataset.naqshFallback = "no-webgl";
}

// src/library/items/particle-globe/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch {
    webglFallback(el, [str(p, "bg"), str(p, "color")]);
    return { update() {
    }, destroy() {
    } };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
  el.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 3.2;
  const group = new THREE.Group();
  scene.add(group);
  let pts = null, arcs = null;
  const disposeObj = (o) => {
    o?.traverse((c) => {
      const m = c;
      m.geometry?.dispose();
      const mat = m.material;
      Array.isArray(mat) ? mat.forEach((x) => x.dispose()) : mat?.dispose();
    });
    if (o) group.remove(o);
  };
  const build = () => {
    disposeObj(pts);
    disposeObj(arcs);
    scene.background = new THREE.Color(str(p, "bg"));
    const n = Math.round(num(p, "points", 4e3)), pos = new Float32Array(n * 3), golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - i / (n - 1) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      pos.set([Math.cos(th) * r, y, Math.sin(th) * r], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: str(p, "color"), size: 0.012, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
    group.add(pts);
    arcs = new THREE.Group();
    const rand = () => new THREE.Vector3().randomDirection();
    for (let i = 0; i < Math.round(num(p, "arcs", 10)); i++) {
      const a = rand(), b = rand();
      const mid = a.clone().add(b).normalize().multiplyScalar(1 + a.distanceTo(b) * 0.45);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 4e-3, 6, false), new THREE.MeshBasicMaterial({ color: str(p, "arc"), transparent: true, opacity: 0.85 }));
      arcs.add(tube);
    }
    group.add(arcs);
    group.scale.setScalar(num(p, "size", 1));
  };
  build();
  const resize = () => {
    const r = el.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = Math.max(1, r.width) / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();
  let drag = false, lx = 0, ly = 0, vy = 0, vx = 0;
  const down = (e) => {
    drag = true;
    lx = e.clientX;
    ly = e.clientY;
  };
  const move = (e) => {
    if (!drag) return;
    vy = (e.clientX - lx) * 5e-3;
    vx = (e.clientY - ly) * 5e-3;
    lx = e.clientX;
    ly = e.clientY;
  };
  const up = () => drag = false;
  el.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  const loop = createLoop(el, ctx, (dt) => {
    group.rotation.y += vy + dt * 0.15 * num(p, "speed", 1);
    group.rotation.x = Math.max(-1, Math.min(1, group.rotation.x + vx));
    vy *= 0.92;
    vx *= 0.92;
    renderer.render(scene, camera);
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
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      disposeObj(pts);
      disposeObj(arcs);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
