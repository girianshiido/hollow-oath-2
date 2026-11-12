interface InstallPrompt extends Event {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>;}
let promptEvent:InstallPrompt|null=null,registration:ServiceWorkerRegistration|null=null;
let state='Preparing offline play…';
let installing=false;
export const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
export const offlineState=()=>state;
export const hasUpdate=()=>Boolean(registration?.waiting);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e as InstallPrompt;});
window.addEventListener('appinstalled',()=>{promptEvent=null;window.dispatchEvent(new Event('pwa-ready'));});
export async function install():Promise<string>{
  if(standalone())return'The game is already running as an installed app.';
  if(promptEvent){await promptEvent.prompt();const result=await promptEvent.userChoice;promptEvent=null;return result.outcome==='accepted'?'Installation accepted. Your browser will finish installing the game.':'Installation dismissed. You can try again from your browser menu.';}
  return /iPad|iPhone|iPod/.test(navigator.userAgent)?'On iPhone or iPad: open this page in Safari, tap Share, then Add to Home Screen. Enable Open as Web App when offered.':'Open your browser menu and choose Install app or Add to Home screen. Installation requires HTTPS and browser support.';
}
export async function checkUpdates():Promise<string>{
  if(!registration)return'Offline play requires HTTPS or localhost and a supported browser.';
  try{await registration.update();return hasUpdate()?'An update is ready. Choose Install update to apply it safely.':'Update check completed. A newly found version may take a moment to finish downloading.';}catch{return'Unable to check for updates. Please reconnect and try again.';}
}
export function applyUpdate(){if(registration?.waiting){installing=true;registration.waiting.postMessage({type:'APPLY_UPDATE'});}}
export async function register(){
  if(!('serviceWorker'in navigator)){state='Offline play is unavailable in this browser.';return;}
  if(import.meta.env.DEV){state='Development preview · offline cache disabled';return;}
  try{
    registration=await navigator.serviceWorker.register('./sw.js');
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(installing)location.reload();});
    if(registration.waiting)window.dispatchEvent(new Event('pwa-ready'));
    registration.addEventListener('updatefound',()=>{const worker=registration?.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){state=navigator.serviceWorker.controller?'Update downloaded · ready to install':'Ready to play offline';window.dispatchEvent(new Event('pwa-ready'));}});});
    await navigator.serviceWorker.ready;state='Ready to play offline';window.dispatchEvent(new Event('pwa-ready'));
  }catch{state='Offline download failed. Reconnect, then check for updates.';}
}
