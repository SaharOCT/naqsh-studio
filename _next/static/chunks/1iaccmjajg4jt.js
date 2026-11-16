(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,11932,e=>{"use strict";var t=e.i(75723);let c=`
uniform vec2 uRes; uniform float uTime; uniform vec3 c1; uniform vec3 c2; uniform vec3 bg; uniform float uScale; uniform float uWarp;
void main(){
  vec2 p=(vUv-.5)*vec2(uRes.x/uRes.y,1.)*uScale; float t=uTime*.25;
  for(int i=1;i<6;i++){float fi=float(i);
    p+=uWarp*.35*vec2(sin(p.y*fi*.9+t*fi*.7+fi), cos(p.x*fi*.8-t*fi*.6))/fi;}
  float v=.5+.5*sin(p.x+p.y+t*2.);
  float w=.5+.5*cos(length(p)*1.5-t*3.);
  vec3 col=mix(bg, c1, smoothstep(.2,.9,v));
  col=mix(col, c2, smoothstep(.45,1.,w)*.85);
  col+=.08*sin(vec3(0.,2.,4.)+p.xyx*2.+t);
  gl_FragColor=vec4(col,1.);
}`;e.s(["default",0,(e,i,o)=>{let a={...i},s=null,l=(0,t.X)(e,e=>s?.resize(e.canvas.width,e.canvas.height),1.5);(s=(0,t.v)(l.canvas,c))||(0,t.P)(e,[(0,t.L)(a,"bg"),(0,t.L)(a,"c1"),(0,t.L)(a,"c2")]),s?.resize(l.canvas.width,l.canvas.height);let r=(0,t.b)(e,o,(e,c)=>{s?.render({uRes:[l.canvas.width,l.canvas.height],uTime:c*(0,t.w)(a,"speed",1)*4,c1:(0,t.Y)((0,t.L)(a,"c1")),c2:(0,t.Y)((0,t.L)(a,"c2")),bg:(0,t.Y)((0,t.L)(a,"bg")),uScale:(0,t.w)(a,"scale",2.2),uWarp:(0,t.w)(a,"warp",1.4)})});return{update(e){a={...a,...e}},setSpeed:r.setSpeed,destroy(){r.destroy(),s?.destroy(),l.destroy()}}}])}]);