import { APP, UPDATE } from './config.js';

function parse(v = '0.0.0') { return String(v).split('.').map(n => Number.parseInt(n, 10) || 0); }
function compareVersions(a, b) { const pa=parse(a), pb=parse(b); for(let i=0;i<3;i++){if((pa[i]||0)>(pb[i]||0))return 1;if((pa[i]||0)<(pb[i]||0))return -1;}return 0; }
function validVersion(v) { return typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v); }
const KEY=UPDATE.storageKey;
function loadState(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return {};}}
function saveState(state){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{/* storage optional */}}

export async function checkForUpdate(){
 const res=await fetch(`${UPDATE.manifestUrl}?t=${Date.now()}`,{cache:'no-store'});
 if(!res.ok)throw new Error(`Update check failed (${res.status})`);
 const manifest=await res.json();
 if(!validVersion(manifest.version))throw new Error('Update manifest has an invalid version.');
 if(manifest.approved!==true)throw new Error('The latest release is not marked as approved.');
 if(manifest.channel!==APP.channel)throw new Error('The release channel does not match this application.');
 const available=compareVersions(manifest.version,APP.version)>0;
 const state=loadState();state.lastChecked=new Date().toISOString();state.latest=manifest;state.available=available;saveState(state);
 return {current:APP.version,latest:manifest.version,available,manifest};
}
export function getUpdateState(){return loadState();}
async function waitForStagedWorker(registration,timeoutMs=20000){
 if(registration.waiting)return registration.waiting;
 if(!registration.installing)return null;
 return new Promise(resolve=>{
  const worker=registration.installing;let settled=false;
  const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);worker.removeEventListener('statechange',onState);resolve(value);};
  const onState=()=>{if(registration.waiting)finish(registration.waiting);else if(worker.state==='redundant'||worker.state==='activated')finish(registration.waiting||null);};
  const timer=setTimeout(()=>finish(registration.waiting||null),timeoutMs);worker.addEventListener('statechange',onState);
 });
}
export async function applyUpdate(){
 const state=loadState();
 if(!state.available||state.latest?.approved!==true||compareVersions(state.latest.version,APP.version)<=0)throw new Error('There is no approved newer release to apply.');
 if(!('serviceWorker'in navigator)){window.location.reload();return;}
 const registration=await navigator.serviceWorker.getRegistration();
 if(!registration){window.location.reload();return;}
 await registration.update();const waitingWorker=await waitForStagedWorker(registration);
 if(!waitingWorker)throw new Error('No staged update was found. Confirm that the release changed sw.js and its cache version.');
 await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error('The new service worker did not activate in time.')),15000);
  navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timeout);resolve();},{once:true});
  waitingWorker.postMessage({type:'SKIP_WAITING'});
 });
 window.location.reload();
}
export async function repairAppCache(){
 if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('studentiot-neural-core-')).map(key=>caches.delete(key)));}
 if('serviceWorker'in navigator){const registration=await navigator.serviceWorker.getRegistration('./');if(registration)await registration.unregister();}
 window.location.reload();
}
export async function registerSW(){
 if(!('serviceWorker'in navigator))return {supported:false};
 try{const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});return {supported:true,registration};}
 catch(error){return {supported:false,error:error.message};}
}
