// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
function hexToRgb(hex) {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [1, 1, 1];
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
function prepareHost(el, opts = {}) {
  const cs = getComputedStyle(el);
  if (cs.position === "static") el.style.position = "relative";
  if (opts.clip !== false) el.style.overflow = "hidden";
}
function createCanvas(el, onResize, maxDpr = 2) {
  prepareHost(el);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
  el.prepend(canvas);
  const handle = {
    canvas,
    width: 1,
    height: 1,
    dpr: 1,
    destroy() {
      ro.disconnect();
      canvas.remove();
    }
  };
  const measure = (notify = true) => {
    const r = el.getBoundingClientRect();
    handle.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    handle.width = Math.max(1, Math.round(r.width));
    handle.height = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(handle.width * handle.dpr);
    canvas.height = Math.round(handle.height * handle.dpr);
    if (notify) onResize(handle);
  };
  const ro = new ResizeObserver(() => measure());
  ro.observe(el);
  measure(false);
  return handle;
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
var VERT = `attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
function createShaderQuad(canvas, frag) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false, alpha: true });
  if (!gl) return null;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[naqsh] shader error", gl.getShaderInfoLog(s));
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, "precision highp float;\nvarying vec2 vUv;\n" + frag);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[naqsh] program link error", gl.getProgramInfoLog(prog));
    return null;
  }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  const locs = /* @__PURE__ */ new Map();
  const u = (name) => {
    if (!locs.has(name)) locs.set(name, gl.getUniformLocation(prog, name));
    return locs.get(name);
  };
  return {
    gl,
    resize(w, h) {
      gl.viewport(0, 0, w, h);
    },
    render(uniforms) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const [k, v] of Object.entries(uniforms)) {
        const l = u(k);
        if (!l) continue;
        if (typeof v === "number") gl.uniform1f(l, v);
        else if (v.length === 2) gl.uniform2fv(l, v);
        else if (v.length === 3) gl.uniform3fv(l, v);
        else if (v.length === 4) gl.uniform4fv(l, v);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    destroy() {
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  };
}
function webglFallback(el, colors) {
  el.style.background = `linear-gradient(135deg, ${colors.join(",")})`;
  el.dataset.naqshFallback = "no-webgl";
}

// src/library/items/silk/runtime.ts
var FRAG = `
uniform vec2 uRes; uniform float uTime; uniform vec3 uColor; uniform vec3 uShadow; uniform float uFolds; uniform float uShine;
float h(vec2 p,float t){
  return sin(p.x*uFolds+sin(p.y*1.7+t)*1.3+t*.7)*.5+sin((p.x*.6+p.y)*uFolds*.7-t*.5)*.35+sin(p.y*uFolds*.4+t*.3)*.25;
}
void main(){
  vec2 p=vUv*vec2(uRes.x/uRes.y,1.)*1.6; float t=uTime*.4; float e=.002;
  float c=h(p,t);
  vec3 n=normalize(vec3(h(p+vec2(e,0.),t)-c, h(p+vec2(0.,e),t)-c, e*1.5));
  vec3 l=normalize(vec3(-.4,.6,.7));
  float diff=clamp(dot(n,l),0.,1.);
  float spec=pow(clamp(dot(reflect(-l,n),vec3(0,0,1)),0.,1.),24.)*uShine;
  vec3 col=mix(uShadow,uColor,diff)+spec*vec3(1.,.95,.85)*.6;
  col*=1.-.3*length(vUv-.5);
  gl_FragColor=vec4(col,1.);
}`;
var mount = (el, props, ctx) => {
  let p = { ...props };
  let quad = null;
  const cv = createCanvas(el, (h) => quad?.resize(h.canvas.width, h.canvas.height), 1.5);
  quad = createShaderQuad(cv.canvas, FRAG);
  if (!quad) webglFallback(el, [str(p, "shadow"), str(p, "color")]);
  quad?.resize(cv.canvas.width, cv.canvas.height);
  const loop = createLoop(el, ctx, (_dt, t) => {
    quad?.render({
      uRes: [cv.canvas.width, cv.canvas.height],
      uTime: t * num(p, "speed", 0.6) * 4,
      uColor: hexToRgb(str(p, "color")),
      uShadow: hexToRgb(str(p, "shadow")),
      uFolds: num(p, "folds", 3),
      uShine: num(p, "shine", 1)
    });
  });
  return { update(n) {
    p = { ...p, ...n };
  }, setSpeed: loop.setSpeed, destroy() {
    loop.destroy();
    quad?.destroy();
    cv.destroy();
  } };
};
var runtime_default = mount;
export {
  runtime_default as default
};
