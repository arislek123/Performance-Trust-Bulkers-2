'use strict';
(() => {
  const screen=document.querySelector('.access-screen');
  const controller=new AbortController();
  const cleanups=[];
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  window.MotionUtils={smooth(a,b,value){const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);}};
  const scene={root:screen,signal:controller.signal,reduced:()=>media.matches,cleanup:fn=>cleanups.push(fn),
    on:(node,event,fn,options={})=>node.addEventListener(event,fn,{...options,signal:controller.signal}),
    onUpdate:()=>{},onResize:fn=>window.addEventListener('resize',fn,{passive:true,signal:controller.signal}),progress:()=>0};
  const ocean=window.OceanSurface?.(scene);
  const username=document.querySelector('#username');
  const password=document.querySelector('#password');
  const toggle=document.querySelector('#toggle-password');
  const message=document.querySelector('#preview-message');
  const button=document.querySelector('#sign-in');
  let pending=false;
  toggle.addEventListener('click',()=>{
    const visible=password.type==='password';password.type=visible?'text':'password';
    toggle.setAttribute('aria-label',visible?'Hide password':'Show password');toggle.setAttribute('aria-pressed',String(visible));
  },{signal:controller.signal});
  function errorMessage(text){message.textContent=text;message.hidden=false;}
  async function signIn(){
    if(pending||!username.reportValidity()||!password.reportValidity())return;
    pending=true;button.disabled=true;button.querySelector('span').textContent='Signing in…';message.hidden=true;
    try{
      const session=await import('./auth-client.js');
      await session.login(username.value,password.value);password.value='';location.replace('./tool.html');
    }catch(error){
      password.value='';
      const code=error?.code||'';
      errorMessage(code==='auth/too-many-requests'?'Too many attempts. Please try again later.':code==='auth/network-request-failed'?'Unable to connect. Please try again.':error?.message==='Sign-in is not configured.'?'Sign-in is not configured.':'Invalid username or password.');
    }
    finally{pending=false;button.disabled=false;button.querySelector('span').textContent='Sign in';}
  }
  import('./auth-client.js').then(async session=>{
    if(await session.currentUser()&&!session.sessionExpired())location.replace('./tool.html');
  }).catch(()=>{});
  button.addEventListener('click',signIn,{signal:controller.signal});
  for(const input of [username,password]){
    input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();signIn();}},{signal:controller.signal});
    input.addEventListener('input',()=>{message.hidden=true;},{signal:controller.signal});
  }
  document.addEventListener('visibilitychange',()=>ocean?.present({morph:0,wave:0,width:screen.clientWidth,height:screen.clientHeight,active:!document.hidden}),{signal:controller.signal});
  window.addEventListener('pagehide',event=>{password.value='';if(!event.persisted){controller.abort();cleanups.forEach(fn=>fn());}},{signal:controller.signal});
})();
