// Lu Cube web app: keeps the app on the device so it opens offline; a new version is picked up on the next open.
const C='lucube-a7fcab2bf3',FILES=["./", "index.html", "ipad.html", "manifest.json", "icon-180.png", "icon-192.png", "icon-512.png", "fonts/OFL-Anton.txt", "fonts/OFL-Inter.txt", "fonts/OFL-SpaceMono.txt", "fonts/anton-latin-400-normal.woff2", "fonts/inter-latin-400-normal.woff2", "fonts/inter-latin-600-normal.woff2", "fonts/space-mono-latin-400-normal.woff2", "fonts/space-mono-latin-700-normal.woff2"];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).catch(()=>{}))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
 // the pages: newest from the internet when there is one, the saved copy when there isn't
 if(r.mode==='navigate'||/\.html$|\/$/.test(u.pathname)){e.respondWith(fetch(r).then(x=>{const y=x.clone();caches.open(C).then(c=>c.put(r,y));return x}).catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||caches.match('index.html'))));return}
 e.respondWith(caches.match(r).then(x=>x||fetch(r)))});
