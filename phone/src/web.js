// ===================== LU CUBE · WEB APP (iPhone, iPad): the cube's /api answered inside the browser =====================
// Loaded before the cube's own script, in place of the Android app's native.js. The cube still thinks it talks to a
// little server; here the "server" is this file: your songs live in the browser's own storage (you add them from
// Files), your settings in localStorage, and the radio list comes straight from radio-browser.info.
(function(){
window.LUNATIVE=null;window.LUWEB=true;
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
window.LUSTORE=LS;
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}

// ---------- your songs: kept in the browser (IndexedDB), added from Files ----------
const DB=new Promise((ok,no)=>{const r=indexedDB.open('lucube',1);r.onupgradeneeded=()=>{r.result.createObjectStore('songs',{keyPath:'id'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const tx=async(mode,fn)=>{const d=await DB;return new Promise((ok,no)=>{const t=d.transaction('songs',mode),s=t.objectStore('songs');let out;Promise.resolve(fn(s)).then(v=>out=v);t.oncomplete=()=>ok(out);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)})};
const req=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const allSongs=()=>tx('readonly',s=>req(s.getAll())).catch(()=>[]);

// the song's own tags (MP3 ID3v2: title, artist, album, cover); everything else goes by its file name
async function tags(file){const o={};try{const h=new Uint8Array(await file.slice(0,10).arrayBuffer());
 if(h[0]!==73||h[1]!==68||h[2]!==51)return o;const v=h[3],size=(h[6]<<21)|(h[7]<<14)|(h[8]<<7)|h[9];
 const b=new Uint8Array(await file.slice(10,10+Math.min(size,4e6)).arrayBuffer());let p=0;
 const txt=(a,enc)=>{try{if(enc===1||enc===2){let s=new TextDecoder(enc===2?'utf-16be':'utf-16').decode(a);return s.replace(/\0+$/,'').replace(/^﻿/,'')}return new TextDecoder(enc===3?'utf-8':'latin1').decode(a).replace(/\0+$/,'')}catch(e){return''}};
 while(p+10<=b.length){const id=String.fromCharCode(b[p],b[p+1],b[p+2],b[p+3]);if(!/^[A-Z0-9]{4}$/.test(id))break;
  const n=v===4?((b[p+4]<<21)|(b[p+5]<<14)|(b[p+6]<<7)|b[p+7]):((b[p+4]<<24)|(b[p+5]<<16)|(b[p+6]<<8)|b[p+7]);const d=b.subarray(p+10,p+10+n);p+=10+n;if(n<=0)break;
  if(id==='TIT2')o.t=txt(d.subarray(1),d[0]);else if(id==='TPE1')o.a=txt(d.subarray(1),d[0]);else if(id==='TALB')o.al=txt(d.subarray(1),d[0]);else if(id==='TRCK')o.n=parseInt(txt(d.subarray(1),d[0]))||0;
  else if(id==='APIC'&&!o.art){const enc=d[0];let q=1;while(q<d.length&&d[q])q++;const mime=txt(d.subarray(1,q),0)||'image/jpeg';q+=2;
   if(enc===1||enc===2){while(q+1<d.length&&(d[q]||d[q+1]))q+=2;q+=2}else{while(q<d.length&&d[q])q++;q++}
   if(q<d.length)o.art=new Blob([d.slice(q)],{type:mime})}}}catch(e){}return o}
function fromName(name){let s=name.replace(/\.[a-z0-9]{2,5}$/i,'').replace(/_/g,' ').trim(),n=0;const m=/^(\d{1,3})(\s*[-.)]\s*|\s+)/.exec(s);if(m){n=+m[1];s=s.slice(m[0].length)}
 const k=s.split(/\s+-\s+/);return k.length>1&&!/^\d+$/.test(k[0])?{a:k[0].trim(),t:k.slice(1).join(' - ').trim(),n}:{t:s,a:'',n}}
async function addFiles(files){files=[...files].filter(f=>/^audio\//.test(f.type)||/\.(mp3|m4a|aac|wav|flac|aif|aiff|caf|ogg|opus)$/i.test(f.name));if(!files.length)return 0;let k=0;
 for(const f of files){note(`ADDING ${++k} OF ${files.length}…`);const g=await tags(f),fn=fromName(f.name),dir=(f.webkitRelativePath||'').split('/').slice(-2,-1)[0]||'';
  const rec={id:f.name+'·'+f.size,name:f.name,t:g.t||fn.t,a:g.a||fn.a,al:g.al||dir||'MY SONGS',n:g.n||fn.n,art:g.art||null,blob:f,at:Date.now()};
  try{await tx('readwrite',s=>s.put(rec))}catch(e){note('THE PHONE IS OUT OF ROOM');break}}
 SIG++;URLS.clear();note('');return files.length}
async function clearSongs(){await tx('readwrite',s=>s.clear());SIG++;URLS.clear()}
// the picker: Files on iPhone/iPad (iCloud Drive, On My iPhone, Downloads…), several songs at once
function pick(){return new Promise(done=>{const i=document.createElement('input');i.type='file';i.multiple=true;i.accept='audio/*,.mp3,.m4a,.aac,.wav,.flac,.aif,.aiff';i.style.display='none';document.body.append(i);
 let fin=false;const end=n=>{if(fin)return;fin=true;i.remove();done(n)};
 i.onchange=async()=>{const n=await addFiles(i.files||[]);end(n);if(n)reloadLib()};i.addEventListener('cancel',()=>end(0));i.click()})}
async function reloadLib(){try{const L=await (await window.fetch('/api/library')).json();if(typeof applyLib==='function'){if(!applyLib(L))renderFaces();else renderFaces()}
 const li=document.getElementById('libinfo');if(li){const n=L.playlists.reduce((x,p)=>x+p.tracks.length,0);li.textContent=n?`${L.playlists.length} playlists · ${n} songs.`:'No songs yet. Tap ＋ ADD SONGS.'}}catch(e){}}
window.luAddSongs=pick;window.luClearSongs=async()=>{await clearSongs();location.reload()};
let NOTE=null;function note(t){if(!NOTE){NOTE=document.createElement('div');NOTE.id='lunote';document.body&&document.body.append(NOTE)}NOTE.textContent=t;NOTE.style.display=t?'block':'none'}

// each song gets an address for this visit; the saved state keeps the song's own name instead, so you pick up where you left off
let SIG=1;const URLS=new Map();let IDS=new Map();
async function library(){const rows=await allSongs(),by={};IDS=new Map();
 for(const r of rows){let u=URLS.get(r.id);if(!u){u=URL.createObjectURL(r.blob);URLS.set(r.id,u)}IDS.set(u,r.id);(by[r.al]=by[r.al]||[]).push({r,u})}
 const playlists=Object.keys(by).sort((a,b)=>a==='MY SONGS'?1:b==='MY SONGS'?-1:a.localeCompare(b)).map(al=>{const L=by[al].sort((x,y)=>(x.r.n||999)-(y.r.n||999)||x.r.name.localeCompare(y.r.name));
  const c=L.find(x=>x.r.art);let cover='';if(c){const k='art·'+c.r.id;cover=URLS.get(k)||URL.createObjectURL(c.r.art);URLS.set(k,cover)}
  return{name:al,cover,tracks:L.map(({r,u})=>({t:r.t,a:r.a,d:0,src:u}))}});
 return{playlists,music:'tap ＋ ADD SONGS to bring songs in from Files'}}
const toIds=s=>{IDS.forEach((id,u)=>{s=s.split(u).join('luid:'+id)});return s};
const toUrls=s=>s.replace(/luid:([^"]+)/g,(m,id)=>{const u=URLS.get(JSON.parse('"'+id+'"'));return u||m});

// ---------- the player: iPhone and iPad ignore a page's volume setting, so your songs go through a volume knob ----------
// Songs (kept in the app) play through Web Audio: a gain for the volume bar and fades, and an analyser so the
// visualiser follows the real sound. Radio streams come from other sites, which Web Audio can't open, so they
// play on a plain player beside it (their volume is the side buttons). Where the browser can set volume itself
// (desktop), the plain <audio> is used as before.
const VOLRO=(()=>{try{if(/[?&]ro=1/.test(location.search))return true;const t=new Audio();t.volume=.5;return t.volume!==.5}catch(e){return false}})();
let CTX=null,ANL=null;const EVS=['loadstart','loadedmetadata','durationchange','canplay','canplaythrough','play','playing','pause','waiting','stalled','seeking','seeked','timeupdate','ended','error','emptied','progress'];
const sameSite=u=>/^(blob:|data:)/.test(u)||u.startsWith('/')||u.startsWith(location.origin);
class LuAudio extends EventTarget{
 constructor(){super();this.a=new Audio();this.r=new Audio();this.a.preload=this.r.preload='auto';this.cur=this.a;this._v=1;this.g=null;
  for(const el of [this.a,this.r])for(const ev of EVS)el.addEventListener(ev,()=>{if(el===this.cur)this.dispatchEvent(new Event(ev))})}
 get src(){return this.cur.src}
 set src(u){u=u||'';const el=u&&!sameSite(u)?this.r:this.a,o=el===this.a?this.r:this.a;if(o.getAttribute('src')){o.pause();o.removeAttribute('src');try{o.load()}catch(e){}}this.cur=el;el.src=u;this.apply()}
 getAttribute(k){return this.cur.getAttribute(k)}
 setAttribute(k,v){if(k==='src')this.src=v;else this.cur.setAttribute(k,v)}
 removeAttribute(k){this.a.removeAttribute(k);this.r.removeAttribute(k)}
 load(){try{this.cur.load()}catch(e){}}
 play(){this.route();if(CTX&&CTX.state!=='running')CTX.resume().catch(()=>{});return this.cur.play()}
 pause(){this.cur.pause()}
 get paused(){return this.cur.paused}get ended(){return this.cur.ended}get duration(){return this.cur.duration}get readyState(){return this.cur.readyState}
 get currentTime(){return this.cur.currentTime}set currentTime(t){this.cur.currentTime=t}
 get preload(){return this.a.preload}set preload(v){this.a.preload=this.r.preload=v}
 get volume(){return this._v}set volume(v){this._v=Math.max(0,Math.min(1,+v||0));this.apply()}
 route(){if(this.g||this.cur!==this.a)return;try{if(!CTX){CTX=new (window.AudioContext||window.webkitAudioContext)();ANL=CTX.createAnalyser();ANL.fftSize=256;ANL.connect(CTX.destination)}
  const sN=CTX.createMediaElementSource(this.a);this.g=CTX.createGain();sN.connect(this.g);this.g.connect(ANL)}catch(e){}this.apply()}
 apply(){if(this.g)this.g.gain.value=this._v;try{this.a.volume=this._v;this.r.volume=this._v}catch(e){}
  // the visualiser reads the real sound while one of your songs plays, and keeps time on its own for the radio
  try{if(typeof AU!=='undefined'&&this===AU){if(this.cur===this.a&&this.g&&ANL){AN=ANL;FQ=new Uint8Array(ANL.frequencyBinCount)}else{AN=null;FQ=null}}}catch(e){}}
}
window.luAudio=()=>VOLRO?new LuAudio():new Audio();
window.LUVOLRO=VOLRO;

// ---------- the radio: straight from radio-browser.info ----------
const J=o=>new Response(JSON.stringify(o),{headers:{'Content-Type':'application/json'}});
const T=t=>new Response(String(t));
const RB=['de1.api.radio-browser.info','de2.api.radio-browser.info','fi1.api.radio-browser.info','nl1.api.radio-browser.info','at1.api.radio-browser.info'].sort(()=>Math.random()-.5);
const ofetch=window.fetch.bind(window);
async function rb(path,q){let last;for(const h of RB){try{const r=await ofetch(`https://${h}${path}?${new URLSearchParams(q)}`);if(r.ok)return await r.json();last=r.status}catch(e){last=e}}throw new Error('can\'t reach the station directory ('+last+')')}
const CN={"the united states of america":"United States","the united kingdom of great britain and northern ireland":"United Kingdom","the russian federation":"Russia","russian federation":"Russia","the republic of korea":"South Korea","republic of korea":"South Korea","korea, republic of":"South Korea","the democratic people's republic of korea":"North Korea","the netherlands":"Netherlands","iran (islamic republic of)":"Iran","islamic republic of iran":"Iran","bolivia (plurinational state of)":"Bolivia","venezuela (bolivarian republic of)":"Venezuela","the philippines":"Philippines","viet nam":"Vietnam","türkiye":"Turkey","turkiye":"Turkey","czechia":"Czech Republic","the united republic of tanzania":"Tanzania","taiwan, province of china":"Taiwan","the lao people's democratic republic":"Laos","the syrian arab republic":"Syria","the republic of moldova":"Moldova","republic of moldova":"Moldova","the dominican republic":"Dominican Republic","the united arab emirates":"United Arab Emirates","the bahamas":"Bahamas","the gambia":"Gambia","the niger":"Niger","the sudan":"Sudan","the congo":"Congo","the democratic republic of the congo":"DR Congo","brunei darussalam":"Brunei","cabo verde":"Cape Verde","holy see":"Vatican City","palestine, state of":"Palestine","the state of palestine":"Palestine","the central african republic":"Central African Republic","the comoros":"Comoros","the marshall islands":"Marshall Islands","micronesia (federated states of)":"Micronesia","the solomon islands":"Solomon Islands","the cayman islands":"Cayman Islands","the falkland islands [malvinas]":"Falkland Islands","the faroe islands":"Faroe Islands","the northern mariana islands":"Northern Mariana Islands","the turks and caicos islands":"Turks and Caicos","the cook islands":"Cook Islands","virgin islands (british)":"British Virgin Islands","virgin islands (u.s.)":"US Virgin Islands","the united states minor outlying islands":"US Minor Islands","réunion":"Reunion","côte d'ivoire":"Ivory Coast","curaçao":"Curacao"};
const cnice=n=>{n=(n||'').trim();return CN[n.toLowerCase()]||(n.toLowerCase().startsWith('the ')?n.slice(4):n)};
// iPhone and iPad play MP3 and AAC streams; the page is https, so http stations are asked for over https (most answer)
const OKC=new Set(['MP3','AAC','AAC+']),num=x=>{const v=parseFloat(x);return isFinite(v)?Math.round(v*1000)/1000:null};
function trim(s){let u=(s.url_resolved||s.url||'').trim();const c=(s.codec||'').toUpperCase();if(!/^https?:\/\//.test(u)||s.hls==1||s.hls===true||!OKC.has(c))return null;
 const sec=u.startsWith('https:');if(!sec)u='https:'+u.slice(5);
 const n=(s.name||'').replace(/\s+/g,' ').trim().slice(0,60);if(!n)return null;let la=num(s.geo_lat),lo=num(s.geo_long);if(la!=null&&lo!=null&&(Math.abs(la)>90||Math.abs(lo)>180||(la===0&&lo===0)))la=lo=null;
 return{id:s.stationuuid||'',n,u,t:(s.tags||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,5),st:(s.state||'').replace(/\s+/g,' ').trim().slice(0,40),br:parseInt(s.bitrate)||0,c,la,lo,cc:(s.countrycode||'').toUpperCase(),v:parseInt(s.clickcount)||0,sec}}
const conn=()=>{try{return (navigator.connection&&navigator.connection.type)||'wifi'}catch(e){return'wifi'}};
window.LUNET={get type(){return conn()}};
const saverOn=()=>{const m=LS.get('lu_saver','off');return m==='always'||(m==='mobile'&&conn()==='cellular')};
window.luSaverOn=saverOn;
function saveWorld(names,by,partial){const per=saverOn()?15:30,out=[];
 for(const cc in by){const rows=by[cc].slice().sort((a,b)=>(b.sec-a.sec)||(b.v-a.v)),seen=new Set(),keep=[];
  for(const t of rows){const k=t.n.toLowerCase().replace(/[^a-z0-9]/g,'');if(seen.has(k)||seen.has(t.u))continue;seen.add(k);seen.add(t.u);keep.push(t);if(keep.length>=per)break}
  if(saverOn())keep.sort((a,b)=>((a.br&&a.br<=96)?0:1)-((b.br&&b.br<=96)?0:1));
  const geo=rows.filter(t=>t.la!=null),mid=a=>a.sort((x,y)=>x-y)[a.length>>1];
  if(!names[cc]||!String(names[cc]).trim())continue;
  out.push({cc,n:names[cc],lat:geo.length?mid(geo.map(g=>g.la)):null,lon:geo.length?mid(geo.map(g=>g.lo)):null,st:keep.map(({cc,v,sec,...r})=>r)})}
 out.sort((a,b)=>a.n.toLowerCase()<b.n.toLowerCase()?-1:1);const w={at:Date.now(),partial,saver:saverOn(),countries:out};
 if(!LS.set('lu_world',w)){w.countries.forEach(c=>c.st=c.st.slice(0,12));LS.set('lu_world',w)}WB.w=w}
const WB={busy:false,error:'',w:null};
async function buildWorld(){if(WB.busy)return;WB.busy=true;WB.error='';
 try{const names={},counts={},by={};for(const c of await rb('/json/countries',{})){const cc=(c.iso_3166_1||'').toUpperCase();if(cc.length===2&&cnice(c.name)){names[cc]=cnice(c.name);counts[cc]=(counts[cc]||0)+(parseInt(c.stationcount)||0)}}
  const add=rows=>rows.forEach(s=>{const t=trim(s);if(t&&names[t.cc])(by[t.cc]=by[t.cc]||[]).push(t)});
  add(await rb('/json/stations/search',{hidebroken:'true',order:'clickcount',reverse:'true',limit:saverOn()?'5000':'15000'}));
  saveWorld(names,by,true);
  if(!saverOn())for(const [cc,n] of Object.entries(counts).sort((a,b)=>b[1]-a[1])){if(n&&(by[cc]||[]).length<8){try{add(await rb('/json/stations/search',{countrycode:cc,hidebroken:'true',order:'clickcount',reverse:'true',limit:'80'}))}catch(e){}}}
  saveWorld(names,by,false)}catch(e){WB.error=String(e.message||e).slice(0,160)}finally{WB.busy=false}}
window.luRebuildWorld=()=>{LS.set('lu_world',null);WB.w=null;buildWorld()};
function worldJSON(){const w=WB.w||(WB.w=LS.get('lu_world',null));const fresh=w&&Date.now()-w.at<7*864e5&&!w.partial;if(!fresh&&!WB.busy)buildWorld();
 return w&&w.countries?w:{building:true,error:WB.busy?'':WB.error}}
async function search(q){const rows=[],seen=new Set();for(const key of ['name','state','tag']){try{for(const s of await rb('/json/stations/search',{[key]:q,hidebroken:'true',order:'clickcount',reverse:'true',limit:'25'})){const t=trim(s);if(t&&!seen.has(t.u)){seen.add(t.u);rows.push(t)}}}catch(e){}}return rows.slice(0,40)}

// ---------- what's playing: a browser can't read the song title out of a stream, but Icecast stations publish it ----------
// (status-json.xsl, readable from any page). Stations that don't publish it just show no title.
const ICYNO={};
async function icy(u){let U;try{U=new URL(u)}catch(e){return''}if(ICYNO[U.origin]>Date.now())return'';
 try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),5000),r=await ofetch(U.origin+'/status-json.xsl',{signal:ac.signal,cache:'no-store'});clearTimeout(tm);if(!r.ok)throw 0;
  const j=await r.json(),src=[].concat((j.icestats||{}).source||[]),mine=src.find(x=>{try{return new URL(x.listenurl).pathname===U.pathname}catch(e){return false}})||(src.length===1?src[0]:null);
  if(!mine)return'';const t=String(mine.title||'').trim(),a=String(mine.artist||'').trim();return (a&&t&&!t.includes(a)?a+' - '+t:t||a).slice(0,140)}
 catch(e){ICYNO[U.origin]=Date.now()+10*60e3;return''}}

// ---------- the few things the phone layer asks the "phone" for ----------
const call=(m,a)=>{a=a||{};
 if(m==='audioAccess'){pick();return Promise.resolve({})}
 if(m==='openExternal'){if(/^https?:/.test(a.url))window.open(a.url,'_blank');return Promise.resolve({ok:/^https?:/.test(a.url)})}
 if(m==='info')return Promise.resolve({version:'web app',build:0});
 return Promise.resolve({})};
window.lucall=call;

// ---------- the /api the cube asks for ----------
let LIBP=null;const lib=()=>LIBP||(LIBP=library().finally(()=>setTimeout(()=>LIBP=null,0)));
async function state(){const st=LS.get('lu_state',{})||{};delete st.xf;await lib();if(!/ipad\.html/.test(location.pathname))st.mode='lu';   // the iPhone always opens on Lu: the opening lands there
try{return JSON.parse(toUrls(JSON.stringify(st)))}catch(e){return st}}
window.fetch=function(u,o){const s=typeof u==='string'?u:(u&&u.url)||'';
 if(!s.startsWith('/api/'))return ofetch(u,o);const url=new URL(s,'https://x'),p=url.pathname,q=url.searchParams;
 if(p==='/api/state'){if(o&&o.method==='POST'){try{const nw=JSON.parse(toIds(o.body)),old=LS.get('lu_state',{})||{};nw.phone=old.phone;nw.place=old.place;for(const k of ['radio','mode'])if(nw[k]===undefined&&old[k]!==undefined)nw[k]=old[k];LS.set('lu_state',nw)}catch(e){}return Promise.resolve(J({ok:true}))}return state().then(J)}
 if(p==='/api/library')return lib().then(J);
 if(p==='/api/libsig')return Promise.resolve(T(SIG));
 if(p==='/api/radio/world')return Promise.resolve(J(worldJSON()));
 if(p==='/api/radio/search')return search(q.get('q')||'').then(r=>J({results:r}));
 if(p==='/api/radio/title')return icy(q.get('u')||'').then(t=>J({t}));
 return Promise.resolve(new Response('',{status:404}))};

// ---------- offline + updates: the service worker keeps the app on the device; a new version arrives on the next open ----------
if('serviceWorker' in navigator&&location.protocol==='https:')addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
window.luWebUpdate=async()=>{try{const r=await navigator.serviceWorker.getRegistration();if(r)await r.update()}catch(e){}location.reload()};
// keep the screen from shutting the music off where the browser allows it
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&typeof AU!=='undefined'&&AU.paused===false)AU.play().catch(()=>{})});
})();
