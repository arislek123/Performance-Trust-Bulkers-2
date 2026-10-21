'use strict';
window.OceanSurface = scene => {
  let canvas = scene.root.querySelector('#sea');
  if (!canvas) return;
  const host = canvas.parentElement;
  const gl = canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
  let raf = null, time = 0, phase = 0, morph = 0, waveProgress = 0, displayWidth = 0, displayHeight = 0, suspended = false;
  const pointer = {x:0.5,y:0.42,tx:0.5,ty:0.42,power:0,target:0,at:0};
  const vertex = `attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}`;
  const fragment = `precision highp float;
  uniform vec2 u_res;uniform vec2 u_display;uniform vec2 u_mouse;uniform float u_time;uniform float u_power;uniform float u_morph;uniform float u_wave;
  vec2 mouseWorld;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}
  float surface(vec2 pos){
    vec2 p=pos*0.62;float t=u_time;
    float h=sin(dot(p,vec2(1.0,0.32))*1.85+t*0.83)*0.20;
    h+=sin(dot(p,vec2(-0.35,1.0))*2.9-t*0.57)*0.12;
    h+=sin(dot(p,vec2(0.82,-0.57))*5.1+t*0.73)*0.06;
    h+=(noise(p*3.6+vec2(t*0.11,-t*0.14))-0.5)*0.065;
    vec2 delta=pos-mouseWorld;float distance=length(delta);
    h+=u_power*0.44*sin(distance*4.4-t*3.4)*exp(-distance*0.31);
    h-=u_power*0.36*exp(-distance*distance*0.8);
    return h*(1.0-0.78*smoothstep(0.05,0.8,u_morph));
  }
  vec3 eye(){return mix(vec3(0.0,5.8,7.0),vec3(0.0,11.0,0.02),smoothstep(0.05,0.78,u_morph));}
  vec3 ray(vec2 uv){vec3 f=normalize(-eye());vec3 r=vec3(1.0,0.0,0.0);vec3 up=normalize(cross(r,f));return normalize(f+uv.x*0.58*r+uv.y*0.58*up);}
  float sketch(float x,float row){return 0.7*sin(x*0.043+row*0.63)+0.24*sin(x*0.117-row*0.93)+0.10*sin(x*0.241+row*1.13)+0.38*sin(row*0.31);}
  float waveY(float x,float row,float phase,float amplitude){float envelope=0.45+0.55*exp(-pow((x-500.0)/340.0,2.0));return -102.0+8.0*row+sin(x*0.012+row*0.13-phase)*amplitude*envelope+sin(x*0.025-row*0.08+phase*0.6)*amplitude*0.2+sketch(x,row);}
  vec3 waveField(vec2 uv){
    float x=uv.x*1000.0,y=(1.0-uv.y)*500.0,phase=u_wave*22.0,amplitude=22.0+22.0*smoothstep(0.0,1.0,u_wave),row=(y+102.0)/8.0;
    float envelope=0.45+0.55*exp(-pow((x-500.0)/340.0,2.0));
    // Invert the monotone row mapping instead of looping over all 89 curves per pixel.
    for(int i=0;i<6;i++){float derivative=8.0+amplitude*envelope*0.13*cos(x*0.012+row*0.13-phase)-amplitude*0.016*cos(x*0.025-row*0.08+phase*0.6)+0.441*cos(x*0.043+row*0.63)-0.2232*cos(x*0.117-row*0.93)+0.113*cos(x*0.241+row*1.13)+0.1178*cos(row*0.31);row-=clamp((waveY(x,row,phase,amplitude)-y)/max(1.5,derivative),-6.0,6.0);}
    float nearest=floor(row+0.5),distance=abs(y-waveY(x,nearest,phase,amplitude));
    float width=(mod(nearest,4.0)<0.5?0.525:0.325)*(0.94+0.12*sin(nearest*2.17)),aa=0.7*500.0/u_res.y;
    float ink=(1.0-smoothstep(max(0.0,width-aa),width+aa,distance))*(0.2+0.23*clamp(nearest/89.0,0.0,1.0))*(0.94+0.09*sin(nearest*1.73));
    if(mod(nearest,7.0)>1.5&&mod(nearest,7.0)<2.5){float retrace=abs(y-waveY(x,nearest,phase,amplitude)-0.75-0.22*sin(x*0.08+nearest*0.6));ink=1.0-(1.0-ink)*(1.0-(1.0-smoothstep(max(0.0,0.175-aa),0.175+aa,retrace))*0.085);}
    return mix(vec3(243.0,247.0,250.0)/255.0,vec3(84.0,126.0,148.0)/255.0,ink);
  }
  void main(){
    vec2 screen=gl_FragCoord.xy/u_res,uv=(screen*2.0-1.0)*vec2(u_display.x/u_display.y,1.0);
    vec2 muv=(u_mouse*2.0-1.0)*vec2(u_display.x/u_display.y,1.0);
    vec3 ro=eye();vec3 mray=ray(muv);
    mouseWorld=(ro+mray*(-ro.y/mray.y)).xz;
    vec3 rd=ray(uv);float distance=-ro.y/rd.y;
    for(int i=0;i<4;i++){vec3 p=ro+rd*distance;distance=(surface(p.xz)-ro.y)/rd.y;}
    vec3 pos=ro+rd*distance;float e=0.018;
    float dx=surface(pos.xz+vec2(e,0.0))-surface(pos.xz-vec2(e,0.0));
    float dz=surface(pos.xz+vec2(0.0,e))-surface(pos.xz-vec2(0.0,e));
    vec3 n=normalize(vec3(-dx,2.0*e,-dz));vec3 view=normalize(ro-pos);
    vec3 reflected=reflect(-view,n);
    float fresnel=pow(1.0-max(dot(n,view),0.0),3.0);
    vec3 deep=vec3(0.30,0.58,0.73);vec3 reflectedSky=mix(vec3(0.45,0.70,0.86),vec3(0.78,0.90,0.97),clamp(reflected.y,0.0,1.0));
    vec3 col=mix(deep,reflectedSky,0.32+fresnel*0.55);
    vec3 light=normalize(vec3(-0.25,0.85,-0.38));
    float spec=pow(max(dot(reflect(-light,n),view),0.0),75.0);
    float silver=pow(max(0.0,1.0-abs(reflected.x+0.3)),18.0)*pow(max(reflected.y,0.0),3.0);
    col+=vec3(0.35,0.54,0.75)*(spec*0.85+silver*0.32);
    col+=vec3(0.025,0.06,0.08)*pow(max(n.y,0.0),9.0);
    float fog=1.0-exp(-distance*0.018);col=mix(col,vec3(0.64,0.82,0.93),fog*0.7);
    vec2 mesh=abs(sin(pos.xz*2.4));
    float grid=1.0-smoothstep(0.025,0.065,min(mesh.x,mesh.y));
    float contour=1.0-smoothstep(0.035,0.085,abs(sin(pos.y*27.0)));
    col=mix(col,vec3(0.25,0.48,0.65),grid*0.15+contour*0.055);
    vec3 water=pow(col,vec3(0.88)),curves=water;if(u_morph>0.001)curves=waveField(screen);
    float flatten=smoothstep(0.18,0.98,u_morph);
    gl_FragColor=vec4(mix(water,curves,flatten),1.0);
  }`;
  let render, resize;
  function fallback() {
    if (gl) {const replacement=document.createElement('canvas');replacement.id='sea';replacement.setAttribute('aria-hidden','true');canvas.replaceWith(replacement);canvas=replacement;}
    const ctx=canvas.getContext('2d');if(!ctx)return;
    let w=1,h=1;
    resize=()=>{w=host.clientWidth;h=host.clientHeight;const d=Math.min(window.devicePixelRatio||1,1.5);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);render();};
    render=()=>{
      const gradient=ctx.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#a1d9ed');gradient.addColorStop(.45,'#89c7e4');gradient.addColorStop(1,'#c9ddeb');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
      for(let row=0;row<45;row++){
        ctx.beginPath();const base=h*(row/45);ctx.strokeStyle=`rgba(50,119,158,${(.10+row/450)*(1-morph)})`;ctx.lineWidth=.8;
        for(let x=0;x<=w;x+=8){const dx=x-w*pointer.x,dy=base-h*pointer.y,d=Math.hypot(dx,dy);const ripple=Math.sin(d*.032-time*3)*Math.exp(-d/260)*pointer.power*38;const y=base+Math.sin(x/140+row*.2+time*.8)*(8+row*.2)+ripple;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
      }
      const flat=window.MotionUtils.smooth(.18,.98,morph);ctx.globalAlpha=flat;ctx.fillStyle='#f3f7fa';ctx.fillRect(0,0,w,h);
      if(flat>0){const U=window.MotionUtils,a=22+22*U.smooth(0,1,waveProgress),phase=waveProgress*22;for(let row=0;row<89;row++){const pen=U.wavePen(row);for(let pass=0;pass<(row%7===2?2:1);pass++){ctx.beginPath();ctx.strokeStyle=`rgba(84,126,148,${pass?.085:pen.opacity})`;ctx.lineWidth=(pass?.35:pen.width)*h/500;for(let x=-16;x<=1016;x+=4){const y=U.waveY(x,row,phase,a)+(pass?U.waveRetrace(x,row):0);if(x===-16)ctx.moveTo(x/1000*w,y/500*h);else ctx.lineTo(x/1000*w,y/500*h);}ctx.stroke();}}}ctx.globalAlpha=1;
    };
  }
  if(gl){
    function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null;}return s;}
    const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
    if(vs&&fs){
      const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(gl.getProgramParameter(program,gl.LINK_STATUS)){
        scene.cleanup(()=>{gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);});
        gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
        const position=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
        const res=gl.getUniformLocation(program,'u_res'),display=gl.getUniformLocation(program,'u_display'),mouse=gl.getUniformLocation(program,'u_mouse'),clock=gl.getUniformLocation(program,'u_time'),power=gl.getUniformLocation(program,'u_power'),shape=gl.getUniformLocation(program,'u_morph'),wave=gl.getUniformLocation(program,'u_wave');
        resize=()=>{const d=Math.min(window.devicePixelRatio||1,1.25,1600/host.clientWidth);canvas.width=Math.round(host.clientWidth*d);canvas.height=Math.round(host.clientHeight*d);gl.viewport(0,0,canvas.width,canvas.height);render();};
        render=()=>{gl.uniform2f(res,canvas.width,canvas.height);gl.uniform2f(display,displayWidth||host.clientWidth,displayHeight||host.clientHeight);gl.uniform2f(mouse,pointer.x,1-pointer.y);gl.uniform1f(clock,time);gl.uniform1f(power,pointer.power);gl.uniform1f(shape,morph);gl.uniform1f(wave,waveProgress);gl.drawArrays(gl.TRIANGLES,0,3);};
      }else fallback();
    }else fallback();
  }else fallback();
  if(!render||!resize)return;
  function frame(){
    raf=null;if(scene.signal.aborted||suspended)return;
    const reduced=scene.reduced();
    pointer.x+=(pointer.tx-pointer.x)*.22;pointer.y+=(pointer.ty-pointer.y)*.22;
    pointer.power+=(pointer.target-pointer.power)*.2;
    time=phase+(reduced?0:pointer.x*.55+pointer.y*.35);
    render();
    if(!reduced&&(Math.abs(pointer.tx-pointer.x)+Math.abs(pointer.ty-pointer.y)+Math.abs(pointer.target-pointer.power)>.002))raf=requestAnimationFrame(frame);
  }
  function request(){if(!suspended&&raf===null)raf=requestAnimationFrame(frame);}
  scene.on(host,'pointermove',e=>{if(scene.reduced())return;const b=host.getBoundingClientRect();pointer.tx=(e.clientX-b.left)/b.width;pointer.ty=(e.clientY-b.top)/b.height;pointer.target=1.25;request();},{passive:true});
  scene.on(host,'pointerleave',()=>{pointer.target=0;request();});
  scene.onUpdate(()=>{phase=scene.reduced()?0:scene.progress(host,{start:0,distance:(innerHeight||800)*.55,repeat:true})*4;request();});
  scene.onResize(resize);
  scene.on(canvas,'webglcontextlost',e=>{e.preventDefault();if(raf!==null)cancelAnimationFrame(raf);raf=null;});
  scene.cleanup(()=>{if(raf!==null)cancelAnimationFrame(raf);});
  resize();request();
  return {canvas,present(state){morph=state.morph;waveProgress=state.wave;displayWidth=state.width;displayHeight=state.height;suspended=state.active===false;canvas.dataset.morph=morph.toFixed(4);canvas.dataset.wave=waveProgress.toFixed(4);if(suspended){if(raf!==null)cancelAnimationFrame(raf);raf=null;}else request();}};
};
