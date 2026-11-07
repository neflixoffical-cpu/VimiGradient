/* VimiGradient — WebGL renderer. MIT License. */
(function () {
  const MAX = 10;

  const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

  const FRAG = `
precision highp float;
#define MAXC ${MAX}
uniform vec2 uRes;
uniform float uTime;
uniform int uCount;
uniform vec3 uColors[MAXC];
uniform vec2 uPoints[MAXC];
uniform vec3 uBg;
uniform int uMode;
uniform float uAngle, uSoft, uWarp, uWarpScale, uSwirl, uSeed;
uniform float uGrain, uGrainSize, uGrainScale, uGrainT;
uniform int uGrainType;
uniform float uBright, uContrast, uSat, uHue, uVig, uDither, uFlow;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){
  vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*vnoise(p);p=m*p;a*=.5;}return v;}

vec3 srgb2lin(vec3 c){return pow(c,vec3(2.2));}
vec3 lin2srgb(vec3 c){return pow(max(c,0.),vec3(1./2.2));}

vec3 palette(float t){
  t=clamp(t,0.,1.);
  float f=t*float(uCount-1);
  vec3 col=uColors[0];
  for(int i=0;i<MAXC-1;i++){
    if(i>=uCount-1)break;
    if(f>=float(i)&&f<=float(i)+1.){col=mix(srgb2lin(uColors[i]),srgb2lin(uColors[i+1]),smoothstep(0.,1.,f-float(i)));return col;}
  }
  return srgb2lin(col);
}

vec3 hueShift(vec3 c,float a){
  const vec3 k=vec3(.57735);float ca=cos(a);
  return c*ca+cross(k,c)*sin(a)+k*dot(k,c)*(1.-ca);
}

void main(){
  vec2 uv=gl_FragCoord.xy/uRes; uv.y=1.-uv.y;
  float asp=uRes.x/uRes.y;
  vec2 A=vec2(asp,1.);
  float t=uTime*.25; // phase: every motion is periodic with 2*PI -> seamless loops
  vec2 tc=vec2(cos(t),sin(t));

  // swirl around center
  vec2 c=(uv-.5)*A; float r=length(c);
  float sa=uSwirl*exp(-r*r*2.);
  c=mat2(cos(sa),-sin(sa),sin(sa),cos(sa))*c;
  uv=c/A+.5;

  // domain warp
  vec2 wp=uv*A*uWarpScale+uSeed;
  vec2 q=vec2(fbm(wp+tc*.6),fbm(wp+vec2(5.2,1.3)-tc.yx*.5));
  vec2 q2=vec2(fbm(wp+q*2.+vec2(1.7,9.2)+tc*.4),fbm(wp+q*2.+vec2(8.3,2.8)-tc.yx*.35));
  uv+=(q2-.5)*uWarp;

  vec3 col;
  float ang=radians(uAngle);
  vec2 dir=vec2(cos(ang),sin(ang));
  if(uMode==0||uMode==5){
    vec3 acc=vec3(0.);float tw=0.;
    for(int i=0;i<MAXC;i++){
      if(i>=uCount)break;
      vec2 p=uPoints[i];
      p+=uFlow*.12*vec2(sin(t*2.+float(i)*2.1),cos(t+float(i)*1.3));
      vec2 d=(uv-p)*A;
      float w;
      if(uMode==0){ w=1./pow(dot(d,d)+1e-4,uSoft*.5); }
      else { w=exp(-dot(d,d)*uSoft*6.); }
      acc+=srgb2lin(uColors[i])*w;tw+=w;
    }
    if(uMode==0) col=acc/tw;
    else { float a=clamp(tw,0.,1.); col=mix(srgb2lin(uBg),acc/max(tw,1e-4),smoothstep(0.,1.,a)); }
  } else if(uMode==1){
    float s=dot((uv-.5)*A,dir)/ (abs(dir.x)*asp+abs(dir.y)) +.5;
    col=palette(s);
  } else if(uMode==2){
    vec2 ctr=uPoints[0];
    col=palette(length((uv-ctr)*A)*uSoft*.5);
  } else if(uMode==3){
    vec2 ctr=uPoints[0];
    vec2 d=(uv-ctr)*A;
    float a=atan(d.y,d.x)-ang;
    float s=fract(a/6.2831853);
    s=1.-abs(s*2.-1.);
    col=palette(s);
  } else {
    vec2 pp=(uv-.5)*A;
    float s=.5+.5*sin(dot(pp,dir)*uSoft*4.+sin(dot(pp,vec2(-dir.y,dir.x))*3.+t*2.)*1.5+uSeed);
    col=palette(s);
  }

  // adjustments (in linear-ish space)
  col=lin2srgb(col);
  col=hueShift(col,radians(uHue));
  col+=uBright;
  col=(col-.5)*uContrast+.5;
  float l=dot(col,vec3(.299,.587,.114));
  col=mix(vec3(l),col,uSat);
  vec2 vc=gl_FragCoord.xy/uRes-.5;
  col*=1.-uVig*dot(vc,vc)*1.6;

  // grain
  vec2 gp=floor(gl_FragCoord.xy*uGrainScale/uGrainSize);
  float g=hash(gp+uGrainT*17.13+uSeed)-.5;
  if(uGrainType==0){ col+=g*uGrain; }
  else if(uGrainType==1){
    vec3 gc=vec3(g,hash(gp+31.7+uGrainT)-.5,hash(gp+71.3+uGrainT)-.5);
    col+=gc*uGrain;
  } else {
    float n=g*uGrain*2.+.5;
    vec3 a=col;
    vec3 lo=2.*a*n+a*a*(1.-2.*n);
    vec3 hi=sqrt(max(a,0.))*(2.*n-1.)+2.*a*(1.-n);
    col=mix(lo,hi,step(.5,n));
  }
  // dither to kill banding
  col+=(hash(gl_FragCoord.xy+3.1)-.5)/255.*(1.+uDither*6.);
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`;

  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
      if (!gl) throw new Error('WebGL is not supported in this browser');
      this.gl = gl;
      const sh = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      gl.useProgram(p);
      this.p = p;
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(p, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {};
      ['uRes', 'uTime', 'uCount', 'uColors', 'uPoints', 'uBg', 'uMode', 'uAngle', 'uSoft', 'uWarp', 'uWarpScale', 'uSwirl', 'uSeed',
        'uGrain', 'uGrainSize', 'uGrainScale', 'uGrainT', 'uGrainType', 'uBright', 'uContrast', 'uSat', 'uHue', 'uVig', 'uDither', 'uFlow']
        .forEach(n => this.u[n] = gl.getUniformLocation(p, n));
      this.maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    }

    /** grainScale = output pixels per canvas pixel, so preview grain matches export */
    render(s, time, grainScale) {
      const gl = this.gl, u = this.u, c = this.canvas;
      gl.viewport(0, 0, c.width, c.height);
      const n = Math.min(s.colors.length, MAX);
      const cols = new Float32Array(MAX * 3), pts = new Float32Array(MAX * 2);
      for (let i = 0; i < n; i++) {
        cols.set(hexToRgb(s.colors[i].color), i * 3);
        pts[i * 2] = s.colors[i].x; pts[i * 2 + 1] = s.colors[i].y;
      }
      gl.uniform2f(u.uRes, c.width, c.height);
      gl.uniform1f(u.uTime, time);
      gl.uniform1i(u.uCount, n);
      gl.uniform3fv(u.uColors, cols);
      gl.uniform2fv(u.uPoints, pts);
      gl.uniform3fv(u.uBg, hexToRgb(s.bg));
      gl.uniform1i(u.uMode, +s.mode);
      gl.uniform1f(u.uAngle, s.angle);
      gl.uniform1f(u.uSoft, s.softness);
      gl.uniform1f(u.uWarp, s.warp);
      gl.uniform1f(u.uWarpScale, s.warpScale);
      gl.uniform1f(u.uSwirl, s.swirl);
      gl.uniform1f(u.uSeed, s.seed);
      gl.uniform1f(u.uGrain, s.grain);
      gl.uniform1f(u.uGrainSize, s.grainSize);
      gl.uniform1f(u.uGrainScale, grainScale || 1);
      gl.uniform1f(u.uGrainT, s.grainAnim ? Math.floor(time * 24) % 1000 : 0);
      gl.uniform1i(u.uGrainType, +s.grainType);
      gl.uniform1f(u.uBright, s.brightness);
      gl.uniform1f(u.uContrast, s.contrast);
      gl.uniform1f(u.uSat, s.saturation);
      gl.uniform1f(u.uHue, s.hue);
      gl.uniform1f(u.uVig, s.vignette);
      gl.uniform1f(u.uDither, s.blur);
      gl.uniform1f(u.uFlow, s.flow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  window.VG = window.VG || {};
  VG.Renderer = Renderer;
  VG.MAX_COLORS = MAX;
})();
