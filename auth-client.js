import {config} from './firebase-config.js';
import {initializeApp,initializeAuth,browserSessionPersistence,onAuthStateChanged,signInWithEmailAndPassword,signOut,getIdToken} from './firebase-sdk.js';
import {permittedUser,loginEmail,parseReferenceDocument} from './auth-policy.js';
if(!config?.firebase?.apiKey||!config?.allowedUid)throw Error('Sign-in is not configured.');
const app=initializeApp(config.firebase);
const auth=initializeAuth(app,{persistence:browserSessionPersistence});
export const ready=new Promise((resolve,reject)=>{
 let stop=()=>{};stop=onAuthStateChanged(auth,user=>{stop();resolve(user);},reject);
});
export async function currentUser(){
 const user=await ready;
 if(permittedUser(auth.currentUser,config.allowedUid))return auth.currentUser;
 if(user)await signOut(auth);
 return null;
}
export async function login(username,password){
 const email=loginEmail(username,config);
 const result=await signInWithEmailAndPassword(auth,email,password);
 if(!permittedUser(result.user,config.allowedUid)){await signOut(auth);throw Error('Invalid username or password.');}
 sessionStorage.setItem('performance-sign-in-at',String(Date.now()));
}
export async function logout(){await signOut(auth);sessionStorage.removeItem('performance-sign-in-at');}
export function watchAccess(callback){return onAuthStateChanged(auth,user=>{if(!permittedUser(user,config.allowedUid))callback();});}
export function sessionExpired(){const started=Number(sessionStorage.getItem('performance-sign-in-at'));return !Number.isFinite(started)||!started||Date.now()-started>4*60*60*1000;}
export async function loadReferences(){
 const user=await currentUser();if(!user||sessionExpired()){await logout();throw Error('Sign in required.');}
 const token=await getIdToken(user);
 const url=`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.firebase.projectId)}/databases/(default)/documents/performanceToolReference/configuration`;
 const result=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!result.ok){if(result.status===401||result.status===403)await logout();throw Error('Vessel reference data could not be loaded.');}
 return parseReferenceDocument(await result.json());
}
