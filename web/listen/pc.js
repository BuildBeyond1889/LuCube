// ===================== LU CUBE · PC: the listening layer's link to this computer =====================
// Loaded before the cube's own script, on the PC only (musiccube.py adds it to the page; the iPhone/iPad web app and
// the Android app don't get it). Add Music, the finders, audiobooks and podcasts (addmusic.js, finder.js, spoken.js)
// were written for the phone and talk to "LuNative". Here the same calls go to Lu Cube's own server instead:
//   files you pick are copied into Music\<playlist>, downloads land there too, podcast episodes come by themselves.
(function(){
window.LUPC=true;

// ---------- notes the page keeps (where you are in each book, which playlists are books / podcasts / hidden …) ----------
// kept by the server in data\listen.json, so the desktop cube, the window and Phone Sync all see the same ones
let NOTES={};
try{const x=new XMLHttpRequest();x.open('GET','/api/listen',false);x.send();if(x.status===200)NOTES=JSON.parse(x.responseText)||{}}catch(e){}
const DIRTY={};let saveT=0;
function flush(){const d={};for(const k in DIRTY){d[k]=NOTES[k]===undefined?null:NOTES[k];delete DIRTY[k]}if(!Object.keys(d).length)return;
 fetch('/api/listen',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).catch(()=>{})}
const LS={get(k,d){const v=NOTES[k];return v===undefined||v===null?d:JSON.parse(JSON.stringify(v))},
 set(k,v){NOTES[k]=v==null?undefined:JSON.parse(JSON.stringify(v));DIRTY[k]=1;clearTimeout(saveT);saveT=setTimeout(flush,800);return true}};
window.LUSTORE=LS;
addEventListener('pagehide',()=>{const d={};for(const k in DIRTY)d[k]=NOTES[k]===undefined?null:NOTES[k];if(Object.keys(d).length)navigator.sendBeacon('/api/listen',new Blob([JSON.stringify(d)],{type:'application/json'}))});

const ofetch=window.fetch.bind(window);
const J=async(u,o)=>{const r=await ofetch(u,o);if(!r.ok)throw new Error(r.status+' '+(r.statusText||''));return r.json()};
const post=(u,o)=>J(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o||{})});

// ---------- events the phone's player would send (download progress, copying progress) ----------
const EV={};
const emit=(n,e)=>(EV[n]||[]).forEach(f=>{try{f(e)}catch(x){}});

// ---------- picking songs on this PC: the browser's own file picker, then the songs are copied into Music ----------
const AUDIO=/\.(mp3|flac|ogg|oga|opus|m4a|aac|wav)$/i,IMG=/^(cover|folder|front)\.(jpe?g|png)$/i;
let PICKED=[],PCOVER=null;
function pickMusic({folder}){return new Promise(res=>{const inp=document.createElement('input');inp.type='file';inp.multiple=true;
 if(folder){inp.webkitdirectory=true}else inp.accept='audio/*,.mp3,.flac,.ogg,.opus,.m4a,.aac,.wav';
 inp.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(inp);let done=false;
 const fin=r=>{if(done)return;done=true;inp.remove();res(r)};
 inp.addEventListener('change',()=>{const all=[...inp.files];PICKED=all.filter(f=>AUDIO.test(f.name)).sort((a,b)=>(a.webkitRelativePath||a.name).localeCompare(b.webkitRelativePath||b.name,undefined,{numeric:true}));
  PCOVER=folder?all.find(f=>IMG.test(f.name))||null:null;
  const top=folder&&all[0]&&all[0].webkitRelativePath?all[0].webkitRelativePath.split('/')[0]:'';fin({count:PICKED.length,title:top})});
 inp.addEventListener('cancel',()=>fin({cancelled:true}));
 window.LUPICK=inp;inp.click()})}
async function importPending({playlist}){const L=PICKED,name=String(playlist||'Added').replace(/[\\/:*?"<>|]+/g,' ').trim()||'Added';let n=0;
 for(let i=0;i<L.length;i++){emit('import',{done:i,total:L.length});const f=L[i];
  const r=await ofetch('/api/import?dest='+encodeURIComponent(name+'/'+f.name),{method:'POST',body:f});if(r.ok)n++}
 if(PCOVER){try{await ofetch('/api/import?dest='+encodeURIComponent(name+'/cover'+(/\.png$/i.test(PCOVER.name)?'.png':'.jpg')),{method:'POST',body:PCOVER})}catch(e){}}
 PICKED=[];PCOVER=null;luUnhide(name);
 return{songs:n,playlist:name}}

// ---------- downloads (the finders, the free packs, podcast episodes you GET by hand) ----------
async function downloadFile({url,dest}){let live=true;
 (async()=>{while(live){await new Promise(r=>setTimeout(r,400));if(!live)break;try{const g=await J('/api/dlprog?dest='+encodeURIComponent(dest));if(live&&g.total>0)emit('dlprogress',{dest,got:g.got,total:g.total})}catch(e){}}})();
 try{await post('/api/dl',{url,dest});return{ok:true}}finally{live=false}}
async function httpText({url}){const r=await ofetch('/api/fetch?u='+encodeURIComponent(url));if(!r.ok)throw new Error(String(r.status));return{text:await r.text()}}

// ---------- telling you about new episodes: a Windows notification, as well as the strip on the page ----------
function notify(n,names){try{if(!n||!('Notification' in window))return;const go=()=>{try{new Notification(`${n} new episode${n===1?'':'s'} in Lu Cube`,{body:names.join(' · '),silent:false})}catch(e){}};
 if(Notification.permission==='granted')go();else if(Notification.permission!=='denied')Notification.requestPermission().then(p=>{if(p==='granted')go()})}catch(e){}}
window.luNotify=notify;
// (a check waits for the list of shows to be saved first: starring a show sends both at once)
let SUBSP=Promise.resolve();
async function podCheck(o){await SUBSP.catch(()=>{});const r=await post('/api/pods/check',o&&o.feed?{feed:o.feed}:{});const L=(r.shows||[]).filter(s=>s.new);if(r.total)notify(r.total,L.map(s=>s.name));return r}

window.LUNATIVE={addListener(n,f){(EV[n]=EV[n]||[]).push(f);return{remove(){EV[n]=(EV[n]||[]).filter(x=>x!==f)}}},
 pickMusic,importPending,downloadFile,httpText,podCheck};
const CALLS={
 addedPlaylists:()=>J('/api/added'),
 dropPending:()=>{PICKED=[];PCOVER=null;return{}},
 removeAdded:o=>post('/api/removeAdded',o),
 podSubs:o=>(SUBSP=SUBSP.catch(()=>{}).then(()=>post('/api/pods/subs',o))),
 podStatus:()=>J('/api/pods/status'),
 podNews:async()=>{const r=await J('/api/pods/news'),L=r.news||[];if(L.length)notify(L.reduce((a,x)=>a+(x.n|0),0),[...new Set(L.map(x=>x.show))]);return r},
 spokenMode:()=>({})};
window.lucall=(m,a)=>Promise.resolve().then(()=>CALLS[m]?CALLS[m](a||{}):{}).catch(e=>{console.warn('lucall '+m,e);return{}});

// ---------- what a playlist is: music, an audiobook or a podcast ----------
// (what Lu Cube downloaded is marked when it arrives; folders from Get Audiobooks.bat say so themselves; a folder whose
// every file is dated is a podcast; long tracks, 20 min+ on average, an audiobook; anything else is music)
const KH={};
window.luKindOf=(name,tracks)=>{const n=String(name||'').toLowerCase(),k=(LS.get('lu_kinds',{})||{})[n];if(k)return k;if(KH[n])return KH[n];
 const T=tracks||[];if(T.length&&T.every(t=>t.dt))return'pod';const avg=T.length?T.reduce((a,t)=>a+(+t.d||0),0)/T.length:0;return T.length>=2&&avg>=1200?'book':'music'};
window.luUnhide=name=>LS.set('lu_hidden',(LS.get('lu_hidden',[])||[]).filter(x=>String(x).toLowerCase()!==String(name||'').toLowerCase()));
window.luSetKind=(name,kind)=>{const m=LS.get('lu_kinds',{})||{};m[String(name||'').toLowerCase()]=kind;LS.set('lu_kinds',m);luUnhide(name)};

// the library as the page asks for it: hidden playlists left out, then music, audiobooks, podcasts (each A to Z),
// and a podcast's newest episode on top
window.fetch=function(u,o){const s=typeof u==='string'?u:(u&&u.url)||'';
 if(s!=='/api/library'&&!s.startsWith('/api/library?'))return ofetch(u,o);
 return ofetch(u,o).then(r=>r.json()).then(L=>{const hid=new Set((LS.get('lu_hidden',[])||[]).map(x=>String(x).toLowerCase()));
  (L.playlists||[]).forEach(p=>{if(p.kind)KH[String(p.name).toLowerCase()]=p.kind});
  const G={music:0,book:1,pod:2};
  L.playlists=(L.playlists||[]).filter(p=>!hid.has(String(p.name).toLowerCase())).map(p=>({...p,tracks:p.tracks.length&&p.tracks.every(t=>t.dt)?p.tracks.slice().sort((a,b)=>a.dt<b.dt?1:a.dt>b.dt?-1:0):p.tracks}))
   .sort((a,b)=>(G[luKindOf(a.name,a.tracks)]-G[luKindOf(b.name,b.tracks)])||String(a.name).localeCompare(String(b.name),undefined,{sensitivity:'base'}));
  return new Response(JSON.stringify(L),{headers:{'Content-Type':'application/json'}})})};
})();
