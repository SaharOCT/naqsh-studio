// src/library/items/glass-knot/runtime.ts
import * as THREE from "three";

// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
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
function trackPointer(el) {
  const state = { x: 0.5, y: 0.5, px: 0, py: 0, inside: false, down: false };
  const move = (e) => {
    const r = el.getBoundingClientRect();
    state.px = e.clientX - r.left;
    state.py = e.clientY - r.top;
    state.x = state.px / Math.max(1, r.width);
    state.y = state.py / Math.max(1, r.height);
    state.inside = state.x >= 0 && state.x <= 1 && state.y >= 0 && state.y <= 1;
  };
  const leave = () => state.inside = false;
  const down = () => state.down = true;
  const up = () => state.down = false;
  window.addEventListener("pointermove", move, { passive: true });
  el.addEventListener("pointerleave", leave);
  el.addEventListener("pointerdown", down);
  window.addEventListener("pointerup", up);
  return {
    state,
    destroy() {
      window.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    }
  };
}
function webglFallback(el, colors) {
  el.style.background = `linear-gradient(135deg, ${colors.join(",")})`;
  el.dataset.naqshFallback = "no-webgl";
}

// src/library/items/glass-knot/runtime.ts
function studioEnv(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 1118486, side: THREE.BackSide }));
  env.add(box);
  const panel = (color, pos, s) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(...s), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(16777215, [0, 4.5, 0], [6, 2]);
  panel(16767152, [-4.5, 1, 2], [2, 4]);
  panel(10470143, [4.5, 0, -2], [2, 5]);
  panel(16742981, [0, -2, 4.5], [5, 0.6]);
  const rt = pm.fromScene(env, 0.04);
  env.traverse((o) => {
    const m = o;
    m.geometry?.dispose();
    m.material?.dispose?.();
  });
  pm.dispose();
  return rt;
}
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    webglFallback(el, [str(p, "bg"), str(p, "tint")]);
    return { update() {
    }, destroy() {
    } };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
  el.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const envRT = studioEnv(renderer);
  scene.environment = envRT.texture;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  const key = new THREE.DirectionalLight(16777215, 2);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(8956671, 1.5);
  rim.position.set(-4, -2, -3);
  scene.add(rim);
  let mesh = null;
  const back = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.25 + Math.random() * 0.4, 32, 32), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i / 5, 0.7, 0.55), roughness: 0.3 }));
    b.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3, -2.5);
    back.add(b);
  }
  scene.add(back);
  const build = () => {
    if (mesh) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      scene.remove(mesh);
    }
    scene.background = new THREE.Color(str(p, "bg"));
    const shape = str(p, "shape", "knot");
    const geo = shape === "sphere" ? new THREE.IcosahedronGeometry(1.2, 24) : shape === "torus" ? new THREE.TorusGeometry(1, 0.42, 64, 160) : shape === "ico" ? new THREE.IcosahedronGeometry(1.3, 0) : new THREE.TorusKnotGeometry(0.9, 0.32, 260, 40);
    const kind = str(p, "material", "glass"), tint = new THREE.Color(str(p, "tint"));
    const mat = kind === "glass" ? new THREE.MeshPhysicalMaterial({ color: tint, transmission: 1, thickness: 1.2, roughness: 0.05, ior: 1.5, clearcoat: 1, attenuationColor: tint, attenuationDistance: 2 }) : kind === "chrome" ? new THREE.MeshPhysicalMaterial({ color: 16777215, metalness: 1, roughness: 0.05, clearcoat: 1 }) : kind === "gold" ? new THREE.MeshPhysicalMaterial({ color: 16762219, metalness: 1, roughness: 0.18 }) : new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85 });
    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    key.intensity = 2 * num(p, "light", 1.2);
    rim.intensity = 1.5 * num(p, "light", 1.2);
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
  const ptr = trackPointer(el);
  let mx = 0, my = 0;
  const loop = createLoop(el, ctx, (dt, t) => {
    if (!mesh) return;
    const sp = num(p, "speed", 1);
    mesh.rotation.x += dt * 0.2 * sp;
    mesh.rotation.y += dt * 0.3 * sp;
    if (bool(p, "mouse", true) && ptr.state.inside) {
      mx += (ptr.state.x - 0.5 - mx) * 0.05;
      my += (ptr.state.y - 0.5 - my) * 0.05;
    }
    camera.position.x = mx * 1.5;
    camera.position.y = -my * 1.2;
    camera.lookAt(0, 0, 0);
    back.children.forEach((b, i) => b.position.y += Math.sin(t + i) * 2e-3);
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
      ptr.destroy();
      scene.traverse((o) => {
        const m = o;
        m.geometry?.dispose();
        m.material?.dispose?.();
      });
      envRT.dispose();
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
