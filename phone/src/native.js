// ===================== LU CUBE · PHONE: the phone's own player, and the cube's /api answered on the phone =====================
// Loaded before the cube's own script. The cube still thinks it talks to an <audio> element and a little server;
// here the <audio> is Android's media player (keeps going with the screen off, lock screen, Bluetooth, Android Auto)
// and the "server" is this file: your songs come from the phone, the radio list straight from radio-browser.info.
(function(){
const CAP=window.Capacitor,LN=CAP&&CAP.Plugins&&CAP.Plugins.LuNative;
window.LUNATIVE=LN||null;
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
window.LUSTORE=LS;
const call=(m,a)=>LN&&LN[m]?LN[m](a||{}).catch(e=>{console.warn('LuNative.'+m,e);return {}}):Promise.resolve({});
window.lucall=call;

// ---------- the player: looks like an <audio>, drives the phone's media player ----------
let NS={},nsAt=0,BOOT=null,bootUsed=false,icyNow='';
const ALL=[];
class NativeAudio extends EventTarget{
 constructor(main){super();this.main=main;this._src='';this.qkey='';this.preload='auto';this._vol=1;this._sentVol=-1;this.wantPlay=false;this._dur=NaN;this._last='';ALL.push(this)}
 get src(){return this._src}
 set src(u){this._src=u||'';if(!this.main||!u)return;this.wantPlay=false;this._dur=NaN;
  // which list is this song in? hand the whole list to the phone so it carries on by itself with the screen off
  const pl=(typeof PLS!=="undefined"?PLS:[])[P.pl],songs=pl&&pl.songs&&pl.songs.some(x=>x.src===u)?pl.songs:[{t:'',a:'',src:u}],idx=Math.max(0,songs.findIndex(x=>x.src===u));
  const key=songs.map(x=>x.src).join('\n');
  if(BOOT&&!bootUsed&&BOOT.id===u){bootUsed=true;this.qkey=(BOOT.ids||[]).join('\n')===key?key:'';NS=BOOT;nsAt=performance.now();this._dur=BOOT.duration>0?BOOT.duration/1000:NaN;if(BOOT.playing)setTimeout(()=>{this.fire('play');this.fire('playing')},0);return}
  bootUsed=true;
  if(key===this.qkey){call('skipTo',{index:idx,ms:0});return}
  this.qkey=key;const live=(typeof MODE!=="undefined"?MODE:"lu")==='radio';
  call('setQueue',{index:idx,position:0,play:false,items:songs.map(x=>({id:x.src,u:x.src,t:live?x.t:(x.t||''),a:live?(x.a||''):(x.a||''),al:pl?pl.n:'',art:'',live}))})}
 getAttribute(k){return k==='src'?(this._src||null):null}
 setAttribute(k,v){if(k==='src')this.src=v}
 removeAttribute(k){if(k==='src'){this._src='';this.qkey='';if(this.main)call('stop')}}
 load(){}
 play(){if(!this.main)return Promise.resolve();this.wantPlay=true;NS.playWhenReady=true;NS.playing=NS.playing||false;return call('play').then(()=>{})}
 pause(){if(!this.main){return}this.wantPlay=false;NS.playWhenReady=false;call('pause')}
 get paused(){return this.main?!NS.playWhenReady:true}
 get ended(){return false}
 get duration(){return this._dur}
 get currentTime(){if(!this.main)return 0;let p=(NS.position||0)/1000;if(NS.playing)p+=(performance.now()-nsAt)/1000;return isFinite(this._dur)?Math.min(p,this._dur):p}
 set currentTime(t){if(!this.main)return;NS.position=t*1000;nsAt=performance.now();call('seek',{ms:Math.max(0,t*1000)})}
 get volume(){return this._vol}
 set volume(v){this._vol=v;if(!this.main)return;if(Math.abs(v-this._sentVol)>.004){this._sentVol=v;call('volume',{v})}}
 fire(n){this.dispatchEvent(new Event(n))}
}
window.NativeAudio=NativeAudio;
const A=()=>ALL.find(a=>a.main);

// what the phone's player says: state changes (play, pause, buffering, next song, from the notification or a car too)
function onState(s){if(!s||s.count===undefined)return;const a=A();if(!a)return;const was=NS;NS=s;nsAt=performance.now();
 if(s.duration>0&&a._dur!==s.duration/1000){a._dur=s.duration/1000;a.fire('loadedmetadata')}
 if(s.id&&s.id!==a._src&&a._src){ // the phone moved on by itself: the cube follows
  a._src=s.id;const L=typeof PLS!=="undefined"?PLS:[];let i=L[P.pl]&&L[P.pl].songs?L[P.pl].songs.findIndex(x=>x.src===s.id):-1;
  if(i>=0)P.idx=i;else{const k=L.findIndex(p=>!p.fav&&p.songs&&p.songs.some(x=>x.src===s.id));if(k>=0){P.pl=k;P.idx=L[k].songs.findIndex(x=>x.src===s.id)}}
  P.el=0;a._dur=s.duration>0?s.duration/1000:NaN;try{songChanged()}catch(e){}}
 if(s.playWhenReady!==was.playWhenReady)a.fire(s.playWhenReady?'play':'pause');
 if(s.state===2&&s.playWhenReady&&was.state!==2)a.fire('waiting');
 if(s.playing&&!was.playing)a.fire('playing')}
if(LN){LN.addListener('state',onState);LN.addListener('icy',e=>{icyNow=e.title||''});
 LN.addListener('error',e=>{const a=A();if(!a)return;NS.playing=false;
  if((typeof MODE!=="undefined"?MODE:"lu")==='radio')a.fire('error');else if(PLS[P.pl])setTimeout(()=>{try{play(P.pl,nextIdx())}catch(x){}},600)})}
setInterval(()=>{const a=A();if(a&&NS.playing)a.fire('timeupdate')},250);

// ---------- the /api the cube asks for ----------
const J=o=>new Response(JSON.stringify(o),{headers:{'Content-Type':'application/json'}});
const T=t=>new Response(String(t));
const RB=['de1.api.radio-browser.info','de2.api.radio-browser.info','fi1.api.radio-browser.info','nl1.api.radio-browser.info','at1.api.radio-browser.info'].sort(()=>Math.random()-.5);
const ofetch=window.fetch.bind(window);
async function rb(path,q){let last;for(const h of RB){try{const r=await ofetch(`https://${h}${path}?${new URLSearchParams(q)}`,{headers:{'User-Agent':'LuCube/1.0'}});if(r.ok)return await r.json();last=r.status}catch(e){last=e}}throw new Error('can\'t reach the station directory ('+last+')')}
const CN={"the united states of america":"United States","the united kingdom of great britain and northern ireland":"United Kingdom","the russian federation":"Russia","russian federation":"Russia","the republic of korea":"South Korea","republic of korea":"South Korea","korea, republic of":"South Korea","the democratic people's republic of korea":"North Korea","the netherlands":"Netherlands","iran (islamic republic of)":"Iran","islamic republic of iran":"Iran","bolivia (plurinational state of)":"Bolivia","venezuela (bolivarian republic of)":"Venezuela","viet nam":"Vietnam","taiwan, republic of china":"Taiwan","taiwan, province of china":"Taiwan","türkiye":"Turkey","the philippines":"Philippines","the democratic republic of the congo":"DR Congo","united republic of tanzania":"Tanzania","the united republic of tanzania":"Tanzania","syrian arab republic":"Syria","the syrian arab republic":"Syria","lao people's democratic republic":"Laos","the lao people's democratic republic":"Laos","republic of moldova":"Moldova","the republic of moldova":"Moldova","the united arab emirates":"United Arab Emirates","the dominican republic":"Dominican Republic","the czech republic":"Czechia","the bahamas":"Bahamas","the gambia":"Gambia","the sudan":"Sudan","the niger":"Niger","the comoros":"Comoros","the congo":"Congo","the plurinational state of bolivia":"Bolivia","the bolivarian republic of venezuela":"Venezuela","the islamic republic of iran":"Iran","palestine, state of":"Palestine","state of palestine":"Palestine","brunei darussalam":"Brunei","cabo verde":"Cape Verde","côte d'ivoire":"Ivory Coast","the central african republic":"Central African Republic","micronesia (federated states of)":"Micronesia"};
const cnice=n=>{n=(n||'').trim();return CN[n.toLowerCase()]||(n.toLowerCase().startsWith('the ')?n.slice(4):n)};
const OKC=new Set(['MP3','AAC','AAC+','OGG','OPUS']),num=x=>{const v=parseFloat(x);return isFinite(v)?Math.round(v*1000)/1000:null};
function trim(s){const u=(s.url_resolved||s.url||'').trim(),c=(s.codec||'').toUpperCase();if(!/^https?:\/\//.test(u)||s.hls==1||s.hls===true||!OKC.has(c))return null;
 const n=(s.name||'').replace(/\s+/g,' ').trim().slice(0,60);if(!n)return null;let la=num(s.geo_lat),lo=num(s.geo_long);if(la!=null&&lo!=null&&(Math.abs(la)>90||Math.abs(lo)>180||(la===0&&lo===0)))la=lo=null;
 return{id:s.stationuuid||'',n,u,t:(s.tags||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,5),st:(s.state||'').replace(/\s+/g,' ').trim().slice(0,40),br:parseInt(s.bitrate)||0,c,la,lo,cc:(s.countrycode||'').toUpperCase(),v:parseInt(s.clickcount)||0}}
// data saver: on mobile data (or always, if you say so) the list is smaller and low-bitrate stations come first
window.LUNET={type:'wifi'};
const saverOn=()=>{const m=LS.get('lu_saver','mobile');return m==='always'||(m==='mobile'&&window.LUNET.type==='cellular')};
window.luSaverOn=saverOn;
function saveWorld(names,by,partial){const per=saverOn()?15:30,out=[];
 for(const cc in by){const rows=by[cc].slice().sort((a,b)=>b.v-a.v),seen=new Set(),keep=[];
  for(const t of rows){const k=t.n.toLowerCase().replace(/[^a-z0-9]/g,'');if(seen.has(k)||seen.has(t.u))continue;seen.add(k);seen.add(t.u);keep.push(t);if(keep.length>=per)break}
  if(saverOn())keep.sort((a,b)=>((a.br&&a.br<=96)?0:1)-((b.br&&b.br<=96)?0:1));
  const geo=rows.filter(t=>t.la!=null),mid=a=>a.sort((x,y)=>x-y)[a.length>>1];
  out.push({cc,n:names[cc],lat:geo.length?mid(geo.map(g=>g.la)):null,lon:geo.length?mid(geo.map(g=>g.lo)):null,st:keep.map(({cc,v,...r})=>r)})}
 out.sort((a,b)=>a.n.toLowerCase()<b.n.toLowerCase()?-1:1);const w={at:Date.now(),partial,saver:saverOn(),countries:out};
 if(!LS.set('lu_world',w)){w.countries.forEach(c=>c.st=c.st.slice(0,12));LS.set('lu_world',w)}WB.w=w}
const WB={busy:false,error:'',w:null};
async function buildWorld(){if(WB.busy)return;WB.busy=true;WB.error='';
 try{const names={},counts={},by={};for(const c of await rb('/json/countries',{})){const cc=(c.iso_3166_1||'').toUpperCase();if(cc.length===2){names[cc]=cnice(c.name);counts[cc]=(counts[cc]||0)+(parseInt(c.stationcount)||0)}}
  const add=rows=>rows.forEach(s=>{const t=trim(s);if(t&&names[t.cc])(by[t.cc]=by[t.cc]||[]).push(t)});
  add(await rb('/json/stations/search',{hidebroken:'true',order:'clickcount',reverse:'true',limit:saverOn()?'5000':'15000'}));
  saveWorld(names,by,true);
  if(!saverOn())for(const [cc,n] of Object.entries(counts).sort((a,b)=>b[1]-a[1])){if(n&&(by[cc]||[]).length<8){try{add(await rb('/json/stations/search',{countrycode:cc,hidebroken:'true',order:'clickcount',reverse:'true',limit:'80'}))}catch(e){}}}
  saveWorld(names,by,false)}catch(e){WB.error=String(e.message||e).slice(0,160)}finally{WB.busy=false}}
window.luRebuildWorld=()=>{LS.set('lu_world',null);WB.w=null;buildWorld()};
function worldJSON(){const w=WB.w||(WB.w=LS.get('lu_world',null));const fresh=w&&Date.now()-w.at<7*864e5&&!w.partial;if(!fresh&&!WB.busy)buildWorld();
 return w&&w.countries?w:{building:true,error:WB.busy?'':WB.error}}
async function search(q){const rows=[],seen=new Set();for(const key of ['name','state','tag']){try{for(const s of await rb('/json/stations/search',{[key]:q,hidebroken:'true',order:'clickcount',reverse:'true',limit:'25'})){const t=trim(s);if(t&&!seen.has(t.u)){seen.add(t.u);rows.push(t)}}}catch(e){}}return rows.slice(0,40)}
// your songs: every folder of music on the phone is a playlist (Music, Download, songs synced from your PC…)
let LIBP=null;
async function library(){if(!LN)return{playlists:[],music:'this phone'};
 if(!LIBP)LIBP=call('audioAccess').then(()=>0);await LIBP;
 const r=await call('scanLibrary');window.LUAUDIO=!!r.granted;
 return{playlists:(r.playlists||[]).map(p=>({name:p.name,cover:p.cover||'',tracks:p.tracks.map(t=>({t:t.t,a:t.a,d:t.d,src:t.src}))})),music:r.granted?'your phone (Music, Download…)':'your phone — Lu Cube needs permission to see your music'}}
// your settings live on the phone; if the phone's player is already going (you closed the app with music on), carry on from there
const bootP=LN?call('getState').then(s=>{if(s&&s.count>0&&s.id)BOOT=s;return s}):Promise.resolve({});
async function state(){const st=LS.get('lu_state',{})||{};delete st.xf;await bootP;
 if(BOOT){const live=!!BOOT.live||/^https?:/.test(BOOT.id);if(live){st.mode='radio';st.radio=st.radio||{};st.radio.last={src:BOOT.id}}else{st.mode='lu';st.last={src:BOOT.id,pl:(st.last||{}).pl||'',t:Math.round((BOOT.position||0)/1000)}}}
 return st}
window.fetch=function(u,o){const s=typeof u==='string'?u:(u&&u.url)||'';
 if(!s.startsWith('/api/'))return ofetch(u,o);const url=new URL(s,'https://x'),p=url.pathname,q=url.searchParams;
 if(p==='/api/state'){if(o&&o.method==='POST'){try{const nw=JSON.parse(o.body),old=LS.get('lu_state',{})||{};nw.phone=old.phone;nw.place=old.place;LS.set('lu_state',nw)}catch(e){}return Promise.resolve(J({ok:true}))}return state().then(J)}
 if(p==='/api/library')return library().then(J);
 if(p==='/api/libsig')return (LN?call('libSig'):Promise.resolve({sig:'0'})).then(r=>T(r.sig||'0'));
 if(p==='/api/radio/world')return Promise.resolve(J(worldJSON()));
 if(p==='/api/radio/search')return search(q.get('q')||'').then(r=>J({results:r}));
 if(p==='/api/radio/title'){const a=A();return Promise.resolve(J({t:a&&a._src===q.get('u')?icyNow:''}))}
 return Promise.resolve(new Response('',{status:404}))};
// network type for the data saver
const NET=CAP&&CAP.Plugins&&CAP.Plugins.Network;if(NET){NET.getStatus().then(s=>{window.LUNET.type=s.connectionType}).catch(()=>{});NET.addListener('networkStatusChange',s=>{window.LUNET.type=s.connectionType})}
})();
