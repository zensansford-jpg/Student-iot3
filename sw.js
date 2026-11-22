/* Neural Core service worker — staged updates require explicit user approval. */
const CACHE_NAME='studentiot-neural-core-v1.1.0';
const STATIC_ASSETS=['./','./index.html','./styles.css','./manifest.webmanifest','./js/config.js','./js/store.js','./js/supabase-client.js','./js/analytics.js','./js/neural-viz.js','./js/software-center.js','./js/ui.js','./js/main.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC_ASSETS)));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('studentiot-neural-core-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.endsWith('/version.json')||req.cache==='no-store')return;event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res&&res.status===200&&res.type==='basic'){const copy=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)).catch(()=>{});}return res;})));});
