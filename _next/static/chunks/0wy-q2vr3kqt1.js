(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,14122,e=>{"use strict";var t=e.i(75723);let i=`
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
}`;e.s(["default",0,(e,c,o)=>{let a={...c},s=(0,t.f)(e),f=[.5,.5],u=null,v=(0,t.X)(e,e=>u?.resize(e.canvas.width,e.canvas.height),1.5);(u=(0,t.v)(v.canvas,i))||(0,t.P)(e,[(0,t.L)(a,"bg"),(0,t.L)(a,"c2"),(0,t.L)(a,"c1")]),u?.resize(v.canvas.width,v.canvas.height);let r=(0,t.b)(e,o,(e,i)=>{u&&((0,t.I)(a,"mouse",!0)&&s.state.inside&&(f[0]+=(s.state.x-f[0])*.05,f[1]+=(1-s.state.y-f[1])*.05),u.render({uRes:[v.canvas.width,v.canvas.height],uTime:i*(0,t.w)(a,"speed",1)*6,c1:(0,t.Y)((0,t.L)(a,"c1")),c2:(0,t.Y)((0,t.L)(a,"c2")),c3:(0,t.Y)((0,t.L)(a,"c3")),bg:(0,t.Y)((0,t.L)(a,"bg")),uInt:(0,t.w)(a,"intensity",1),uMouse:f}))});return{update(e){a={...a,...e}},setSpeed:r.setSpeed,destroy(){r.destroy(),s.destroy(),u?.destroy(),v.destroy()}}}])}]);