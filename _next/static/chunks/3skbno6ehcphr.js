(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,11274,e=>{"use strict";var o=e.i(75723);let t=`
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
}`;e.s(["default",0,(e,l,c)=>{let s={...l},a=null,i=(0,o.X)(e,e=>a?.resize(e.canvas.width,e.canvas.height),1.5);(a=(0,o.v)(i.canvas,t))||(0,o.P)(e,[(0,o.L)(s,"shadow"),(0,o.L)(s,"color")]),a?.resize(i.canvas.width,i.canvas.height);let u=(0,o.b)(e,c,(e,t)=>{a?.render({uRes:[i.canvas.width,i.canvas.height],uTime:t*(0,o.w)(s,"speed",.6)*4,uColor:(0,o.Y)((0,o.L)(s,"color")),uShadow:(0,o.Y)((0,o.L)(s,"shadow")),uFolds:(0,o.w)(s,"folds",3),uShine:(0,o.w)(s,"shine",1)})});return{update(e){s={...s,...e}},setSpeed:u.setSpeed,destroy(){u.destroy(),a?.destroy(),i.destroy()}}}])}]);