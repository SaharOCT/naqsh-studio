// src/library/items/model-viewer/runtime.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
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
function webglFallback(el, colors) {
  el.style.background = `linear-gradient(135deg, ${colors.join(",")})`;
  el.dataset.naqshFallback = "no-webgl";
}

// src/library/items/model-viewer/runtime.ts
var mount = (el, props, ctx) => {
  let p = { ...props };
  prepareHost(el);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    webglFallback(el, [str(p, "bg"), "#444"]);
    return { update() {
    }, destroy() {
    } };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%", touchAction: "none" });
  el.prepend(renderer.domElement);
  const status = document.createElement("div");
  status.style.cssText = "position:absolute;bottom:12px;inset-inline-start:12px;font:12px system-ui;color:rgba(255,255,255,.7);pointer-events:none";
  el.appendChild(status);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1e3);
  camera.position.set(2.5, 1.6, 3.2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const hemi = new THREE.HemisphereLight(16777215, 2236979, 0.8);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(16777215, 1.5);
  key.position.set(3, 5, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  let model = null, loadedSrc = "\0";
  const dispose = (o) => o.traverse((c) => {
    const m = c;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    mats.forEach((mt) => {
      Object.values(mt).forEach((v) => v?.isTexture && v.dispose());
      mt.dispose();
    });
  });
  const frame = (obj) => {
    const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const s = 2 / Math.max(size.x, size.y, size.z || 1);
    obj.scale.setScalar(s);
    obj.position.sub(center.multiplyScalar(s));
    obj.position.y += size.y * s / 2;
    controls.target.set(0, size.y * s / 2, 0);
  };
  const setModel = (obj) => {
    if (model) {
      scene.remove(model);
      dispose(model);
    }
    obj.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    frame(obj);
    model = obj;
    scene.add(obj);
  };
  const demo = () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 16, 48), new THREE.MeshStandardMaterial({ color: 16742981, roughness: 0.35, metalness: 0.1 }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 24, 120), new THREE.MeshStandardMaterial({ color: 16777215, metalness: 1, roughness: 0.1 }));
    ring.rotation.x = Math.PI / 2.4;
    g.add(body, ring);
    return g;
  };
  const load = () => {
    const src = safeURL(str(p, "src")) || (str(p, "src").startsWith("blob:") ? str(p, "src") : "");
    if (src === loadedSrc) return;
    loadedSrc = src;
    if (!src) {
      setModel(demo());
      status.textContent = "";
      return;
    }
    status.textContent = "Loading model…";
    new GLTFLoader().load(src, (gltf) => {
      setModel(gltf.scene);
      status.textContent = "";
    }, void 0, () => {
      status.textContent = "Could not load model — showing demo";
      setModel(demo());
    });
  };
  const apply = () => {
    scene.background = new THREE.Color(str(p, "bg"));
    renderer.toneMappingExposure = num(p, "exposure", 1);
    key.intensity = num(p, "light", 1.5);
    camera.fov = num(p, "fov", 35);
    camera.updateProjectionMatrix();
    floor.visible = bool(p, "floor", true);
    controls.autoRotate = num(p, "autoRotate", 0.4) > 0 && !ctx.reducedMotion;
    controls.autoRotateSpeed = num(p, "autoRotate", 0.4) * 2;
    load();
  };
  apply();
  const resize = () => {
    const r = el.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = Math.max(1, r.width) / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();
  const loop = createLoop(el, ctx, () => {
    controls.update();
    renderer.render(scene, camera);
  }, { allowReduced: true });
  return {
    update(n) {
      p = { ...p, ...n };
      apply();
    },
    setSpeed: loop.setSpeed,
    destroy() {
      loop.destroy();
      ro.disconnect();
      controls.dispose();
      if (model) dispose(model);
      floor.geometry.dispose();
      floor.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      status.remove();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
