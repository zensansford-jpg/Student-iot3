/* Neural Core service worker
 * New workers wait for user approval before activation.
 * version.json and Supabase API responses always bypass the cache.
 */
const CACHE_NAME = 'studentiot-neural-core-v1.0.1';
const STATIC_ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './js/config.js', './js/store.js', './js/supabase-client.js',
  './js/analytics.js', './js/neural-viz.js', './js/software-center.js',
  './js/ui.js', './js/main.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
});
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('studentiot-neural-core-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request=event.request, url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.endsWith('/version.json')||request.cache==='no-store') return;
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response&&response.status===200&&response.type==='basic'){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)).catch(()=>{});}
    return response;
  })));
});
