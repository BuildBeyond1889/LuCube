// Lu Cube web app: keeps the app on the device so it opens offline; a new version is picked up on the next open.
const C='lucube-__VER__',FILES=__FILES__;
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).catch(()=>{}))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
 // the pages: newest from the internet when there is one, the saved copy when there isn't
 if(r.mode==='navigate'||/\.html$|\/$/.test(u.pathname)){e.respondWith(fetch(r).then(x=>{const y=x.clone();caches.open(C).then(c=>c.put(r,y));return x}).catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||caches.match('index.html'))));return}
 e.respondWith(caches.match(r).then(x=>x||fetch(r)))});
