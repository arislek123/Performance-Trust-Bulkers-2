import {installProfiles} from './fleet-data.js';
import {installLeadReference} from './propulsion.js';
const leave=()=>{document.documentElement.classList.add('auth-locked');location.replace('./index.html');};
try{
 const session=await import('./auth-client.js');
 if(!await session.currentUser()||session.sessionExpired()){await session.logout();leave();}
 else{
  const data=await session.loadReferences();installProfiles(data.profiles);installLeadReference(data.leadVesselReference);
  session.watchAccess(leave);
  const signOut=document.querySelector('#signOut');
  signOut.addEventListener('click',async()=>{
   signOut.disabled=true;
   try{await session.logout();leave();}catch{signOut.disabled=false;const message=document.querySelector('#authMessage');message.hidden=false;message.textContent='Sign out could not be completed. Please try again.';}
  });
  const check=()=>{if(session.sessionExpired())session.logout().finally(leave);};
  window.addEventListener('pageshow',check);window.addEventListener('focus',check);setInterval(check,60000);
  await import('./app.js');document.documentElement.classList.remove('auth-locked');
 }
}catch{
 document.body.replaceChildren();document.documentElement.classList.remove('auth-locked');
 const main=document.createElement('main');main.style.cssText='margin:10vh auto;max-width:480px;padding:24px';
 const title=document.createElement('h1');title.textContent='Unable to open the tool';
 const text=document.createElement('p');text.textContent='Please sign in again. If the problem continues, contact the administrator.';
 const link=document.createElement('a');link.href='./index.html';link.textContent='Sign in';main.append(title,text,link);document.body.append(main);
}
