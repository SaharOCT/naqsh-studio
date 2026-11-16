// src/library/_shared/kit.ts
var num = (p, k, d = 0) => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
var str = (p, k, d = "") => p[k] === void 0 || p[k] === null ? d : String(p[k]);
var bool = (p, k, d = false) => p[k] === void 0 ? d : p[k] === true || p[k] === "true";
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

// src/library/items/aurora/runtime.ts
var FRAG = `
uniform vec2 uRes; uniform float uTime; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 bg; uniform float uInt; uniform vec2 uMouse;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.02;a*=.5;}return v;}
void main(){
  vec2 uv=vUv; vec2 p=uv; p.x*=uRes.x/uRes.y;
  float t=uTime*.12;
  vec3 col=bg;
  for(int i=0;i<3;i++){
    float fi=float(i);
    float w=fbm(vec2(p.x*1.4+fi*3.1+t*(1.+fi*.3), t*.6+fi))*.55;
    float y=.55+.12*fi-.25*w+(uMouse.y-.5)*.08;
    float band=exp(-pow((uv.y-y)*(6.+fi*2.),2.));
    float rays=.6+.4*fbm(vec2(p.x*9.+t*3.+fi, uv.y*2.));
    vec3 c=i==0?c1:(i==1?c2:c3);
    col+=c*band*rays*.75*uInt;
  }
  float stars=step(.9975,hash(floor(uv*uRes/2.)))*(.5+.5*sin(uTime*2.+uv.x*80.));
  col+=stars*(1.-uv.y*.3)*.8;
  col*=1.-.35*length(uv-vec2(.5,.6));
  gl_FragColor=vec4(col,1.);
}`;
var mount = (el, props, ctx) => {
  let p = { ...props };
  const ptr = trackPointer(el);
  const mouse = [0.5, 0.5];
  let quad = null;
  const cv = createCanvas(el, (h) => quad?.resize(h.canvas.width, h.canvas.height), 1.5);
  quad = createShaderQuad(cv.canvas, FRAG);
  if (!quad) webglFallback(el, [str(p, "bg"), str(p, "c2"), str(p, "c1")]);
  quad?.resize(cv.canvas.width, cv.canvas.height);
  const loop = createLoop(el, ctx, (dt, t) => {
    if (!quad) return;
    if (bool(p, "mouse", true) && ptr.state.inside) {
      mouse[0] += (ptr.state.x - mouse[0]) * 0.05;
      mouse[1] += (1 - ptr.state.y - mouse[1]) * 0.05;
    }
    quad.render({
      uRes: [cv.canvas.width, cv.canvas.height],
      uTime: t * num(p, "speed", 1) * 6,
      c1: hexToRgb(str(p, "c1")),
      c2: hexToRgb(str(p, "c2")),
      c3: hexToRgb(str(p, "c3")),
      bg: hexToRgb(str(p, "bg")),
      uInt: num(p, "intensity", 1),
      uMouse: mouse
    });
  });
  return {
    update(n) {
      p = { ...p, ...n };
    },
    setSpeed: loop.setSpeed,
    destroy() {
      loop.destroy();
      ptr.destroy();
      quad?.destroy();
      cv.destroy();
    }
  };
};
var runtime_default = mount;
export {
  runtime_default as default
};
