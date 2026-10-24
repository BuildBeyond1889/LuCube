// ===================== LU CUBE · PHONE: the same cube and faces, laid out for a phone =====================
// Top: ♫ Lu / 📻 Radio / ◎ Remote. Middle: the cube, front and centre (swipe it to turn, tap its buttons).
// Bottom: Lu & Remote get a thumb wheel; Radio gets the globe, which spins to whatever you scroll to. Tap to play / tune in.
(function(){
let PW=innerWidth,PH=innerHeight,CY0=Math.round(PH*.37);
const LS=window.LUSTORE,N=window.lucall,HAS=!!window.LUNATIVE;
const $=id=>document.getElementById(id),E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vib=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
breakApart=function(){};   // on a phone the cube stays a cube

// ---------- no music yet (or no permission): friendly faces instead of empty ones ----------
const _lrf=luRenderFaces,_ltf=luTickFaces;
luRenderFaces=function(){if(PLS.length)return _lrf();const ok=window.LUAUDIO!==false;
 F_NOW.style.background='var(--y)';F_NOW.innerHTML=TB('LU CUBE // YOUR MUSIC')+`<div style="padding:16px 14px"><div class="big" style="font-size:40px">${ok?'NO SONGS<br>YET':'MUSIC<br>ACCESS'}</div>
  <div style="font:700 9px/1.7 'Space Mono';margin-top:10px">${ok?'Put songs in a folder on your phone (Music, Download…): each folder becomes a playlist. Or sync them from Lu Cube on your PC in ⚙ settings.':'Lu Cube needs permission to play the songs on your phone. Nothing leaves the phone.'}</div>
  <div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill" data-act="lib:allow">${ok?'↻ LOOK AGAIN':'ALLOW ACCESS'}</span><span class="pill" style="background:var(--b);color:#fff" data-act="pm:radio">📻 TRY THE RADIO</span></div></div>`;
 [F_COVER,F_PL,F_LIB,F_LYR,F_VIZ].forEach((f,k)=>{f.style.background=k%2?'var(--g)':'var(--b)';f.innerHTML=TB(['COVER','PLAYLIST','LIBRARY','LYRICS','VISUALISER'][k])+`<div style="position:absolute;inset:20px 0 0;display:grid;place-items:center;font:400 34px Anton;color:${k%2?'#111':'#fff'}">♫</div>`})};
luTickFaces=function(){if(PLS.length)return _ltf()};
async function relib(){await N('audioAccess');const L=await (await fetch('/api/library')).json();if(L.playlists.length){applyLib(L,true);pushTree(true)}else renderFaces()}

// ---------- REMOTE: whatever another app is playing (needs notification access, asked once) ----------
let REMOTE=false,RS=[],RSEL='',RGRANT=false,RAT=0;
const rcur=()=>RS.find(s=>s.pkg===RSEL)||RS.find(s=>s.playing)||RS[0]||null;
async function rpoll(){if(!HAS)return;const r=await N('remoteList');RGRANT=!!r.granted;const old=JSON.stringify(RS.map(s=>[s.pkg,s.title,s.playing,s.art&&s.art.length]));
 RS=r.sessions||[];RAT=performance.now();const nw=JSON.stringify(RS.map(s=>[s.pkg,s.title,s.playing,s.art&&s.art.length]));
 if(REMOTE&&(old!==nw||!rpoll.drawn)){rpoll.drawn=1;renderFaces();bottomUI()}}
setInterval(()=>{if(REMOTE&&!document.hidden)rpoll()},1000);
const rpos=s=>s?(s.position+(s.playing?performance.now()-RAT:0))/1000:0;
const RCOL=p=>/spotify/.test(p)?'#1fd47a':/youtube/.test(p)?'#e0281a':/podcast|pocket|castbox/.test(p)?'#9b5cff':/audible|book/.test(p)?'#ff7a1a':'#2f6be8';
const VIA=s=>`<span style="display:inline-block;font:700 8px 'Space Mono';letter-spacing:.12em;background:#111;color:${RCOL(s.pkg)};padding:3px 7px">VIA ${E(s.app.toUpperCase())}</span>`;
function remRender(){const s=rcur(),up=s?(s.title||'').toUpperCase():'';F_NOW.classList.remove('hasbn');
 if(!RGRANT){F_NOW.style.background='var(--y)';F_NOW.innerHTML=TB('REMOTE // SETUP','#1f8a5a')+`<div style="padding:14px"><div class="big" style="font-size:36px">ONE<br>SWITCH</div><div style="font:700 9px/1.7 'Space Mono';margin-top:8px">Turn on <b>notification access</b> for Lu Cube and this cube shows and controls whatever Spotify, YouTube Music, podcasts or audiobooks are playing.</div><div style="margin-top:12px"><span class="pill" data-act="rem:allow">TURN IT ON →</span></div></div>`}
 else if(!s){F_NOW.style.background='var(--y)';F_NOW.innerHTML=TB('REMOTE // PLAYING ELSEWHERE','#1f8a5a')+`<div style="padding:14px"><div class="big" style="font-size:36px">NOTHING<br>PLAYING</div><div style="font:700 9px/1.7 'Space Mono';margin-top:8px">Start a song in Spotify, YouTube Music, a podcast app… and it turns up here. Lu Cube is the remote, the other app does the playing.</div></div>`}
 else{F_NOW.style.background='var(--y)';F_NOW.innerHTML=TB('REMOTE // PLAYING ELSEWHERE','#1f8a5a')+`<div style="padding:12px 12px 4px">${VIA(s)}<div class="big" style="font-size:${up.length>26?24:up.length>14?30:40}px;margin-top:8px;overflow-wrap:anywhere">${E(up)}</div><div class="mid" style="font-size:15px;margin-top:4px">${E(s.artist)}</div></div>
  <div class="prog"><i id="pg"></i></div><div style="display:flex;justify-content:space-between;margin:3px 10px;font:700 9px 'Space Mono'"><span id="tm"></span><span>${s.duration>0?fmt(s.duration/1000):'LIVE'}</span></div>
  <div class="ctrl"><b data-act="rem:prev">⏮</b><b class="p" data-act="rem:play">${s.playing?'❚❚':'▶'}</b><b data-act="rem:next">⏭</b></div>
  <div style="margin:8px 12px 0;font:700 8px 'Space Mono';letter-spacing:.06em;opacity:.7">${E(s.app.toUpperCase())} DOES THE PLAYING · THE CUBE IS THE REMOTE</div>`}
 const art=s&&s.art?`url('${s.art}') center/cover no-repeat,#111`:`radial-gradient(circle at 35% 30%,${s?RCOL(s.pkg):'#2f6be8'},#111 78%)`;
 F_COVER.style.background='#111';F_COVER.innerHTML=TB('COVER'+(s?' · '+E(s.app.toUpperCase()):''),'#111','var(--y)')+`<div style="position:absolute;left:0;right:0;top:20px;bottom:0;background:${art}"></div>${s?`<div style="position:absolute;left:0;right:0;bottom:0;padding:8px 10px;background:linear-gradient(transparent,rgba(0,0,0,.85));color:#fff"><div class="mid" style="font-size:16px">${E(short(up,34))}</div><div style="font:700 8px 'Space Mono';color:#ffc21a">${E(s.artist)}</div></div>`:''}`;
 F_PL.style.background='var(--g)';F_PL.innerHTML=TB('APPS PLAYING','var(--r)')+`<div class="pl">${RS.map((x,k)=>`<div data-act="rem:pick:${k}" class="${s&&x.pkg===s.pkg?'on':''}"><span><b style="color:${RCOL(x.pkg)}">●</b>${E(x.app)}</span><span>${E(short(x.title||'',18))}</span></div>`).join('')||'<div><span>NO APPS PLAYING</span></div>'}</div>
  <div style="position:absolute;left:10px;bottom:10px;right:10px;font:700 8px 'Space Mono';letter-spacing:.06em">TAP AN APP · THE CUBE CONTROLS THAT ONE</div>`;
 F_LIB.style.background='var(--g)';F_LIB.innerHTML=TB('♥ SONG CATCHER · '+CAUGHT().length,'var(--b)')+caughtList(6);
 F_LYR.style.background='var(--g)';F_LYR.innerHTML=TB('NOTIFICATION ACCESS','var(--o)')+`<div style="padding:14px 14px 0;font:700 9px/1.7 'Space Mono'"><div style="font:400 30px/1 Anton;margin-bottom:8px">${RGRANT?'ALLOWED ✓':'NOT YET'}</div>That's how the cube sees the song name and cover, and presses play, pause and skip for the other app. Nothing is saved or sent anywhere.<div style="margin-top:10px"><span class="pill" data-act="rem:allow">${RGRANT?'CHANGE IN SETTINGS':'TURN IT ON →'}</span></div></div>`;
 F_VIZ.style.background='#fff';F_VIZ.innerHTML=TB('VISUALISER','#111','var(--y)')+`<div style="position:absolute;inset:20px 0 0 0"><div style="padding:10px;font:700 9px 'Space Mono'">BARS · ${E(short(up,30))}</div><div class="viz pfake ${s&&s.playing?'go':''}" id="viz">${'<i></i>'.repeat(16)}</div></div>`;
 remTick()}
function remTick(){const s=rcur(),pg=$('pg'),tm=$('tm');if(!s)return;const t=rpos(s);if(pg)pg.style.width=(s.duration>0?Math.min(100,t*1000/s.duration*100):100)+'%';if(tm)tm.textContent=fmt(t)}

// ---------- SONG CATCHER: hear something good on the radio, tap ♥ CATCH, find it later in Spotify or YouTube Music ----------
const CAUGHT=()=>LS.get('lu_caught',[]);
function caughtList(n){const L=CAUGHT().slice().reverse().slice(0,n);if(!L.length)return `<div style="padding:16px 14px;font:700 9px/1.7 'Space Mono'">Nothing caught yet. On the radio, when the station shows what's playing, tap <b>♥ CATCH</b> on the Now face.</div>`;
 const all=CAUGHT();return `<div class="pl pcatch">${L.map(x=>{const i=all.indexOf(all.find(y=>y.at===x.at));return `<div><span><b>♥</b>${E(short(x.t,30))}<small>${E(short([x.st,x.n].filter(Boolean).join(' · '),34))}</small></span><span><em data-act="cs:sp:${i}">SPOTIFY</em><em data-act="cs:yt:${i}">YT</em></span></div>`}).join('')}</div>`}
function catchNow(){const s=song();if(!s.nowT)return;const L=CAUGHT();if(L.some(x=>x.t===s.nowT)){LS.set('lu_caught',L.filter(x=>x.t!==s.nowT));vib(15);renderFaces();return}const c=cityOf(s);L.push({t:s.nowT,st:s.t,n:c?c.n:'',at:Date.now()});LS.set('lu_caught',L.slice(-200));vib(30);renderFaces()}
function openSearch(kind,i){const x=CAUGHT()[i];if(!x)return;const q=x.t.replace(/\s*[-–|]\s*/g,' ').trim();
 if(kind==='sp')N('openExternal',{url:'spotify:search:'+q}).then(r=>{if(!r.ok)N('openExternal',{url:'https://open.spotify.com/search/'+encodeURIComponent(q)})});
 else N('openExternal',{url:'https://music.youtube.com/search?q='+encodeURIComponent(q)})}
// the cube's Song Catcher keeps its list on the phone, and opens finds in the Spotify / YouTube Music apps
window.catchStore={get:CAUGHT,set:L=>LS.set('lu_caught',L)};
window.openOut=(kind,q)=>{if(kind==='sp')N('openExternal',{url:'spotify:search:'+q}).then(r=>{if(!r.ok)N('openExternal',{url:'https://open.spotify.com/search/'+encodeURIComponent(q)})});else N('openExternal',{url:'https://music.youtube.com/search?q='+encodeURIComponent(q)})};

// ---------- the radio's faces get a few phone extras ----------
const _rrf=radRenderFaces;radRenderFaces=function(){_rrf();if(REMOTE)return;

 const sun=!!LS.get('lu_sun',false),w=document.createElement('b');w.className='psun'+(sun?' on':'');w.dataset.act='al:sun';w.textContent=sun?'☀ SUNRISE ON':'☀ SUNRISE';F_LYR.append(w);
};

// ---------- one switch, three modes, same light sweep; each mode keeps its place ----------
function wipe(change){const faces=[...document.querySelectorAll('.f')].filter(f=>/^F_/.test(f.id)),snap=faces.map(f=>({html:f.innerHTML,bg:f.style.background}));change();
 if(!cubeOn)return;WIPING=1;const ovs=faces.map((f,k)=>{const o=document.createElement('div');o.className='wipeOld';o.style.background=snap[k].bg;o.innerHTML=snap[k].html;o.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));const l=document.createElement('div');l.className='wipeLn';f.append(o,l);return[o,l]});
 const t0=performance.now(),D=1250,ease=u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
 (function st(){const u=Math.min(1,(performance.now()-t0)/D),x=(ease(u)*100).toFixed(2);ovs.forEach(([o,l])=>{o.style.clipPath=`inset(0 0 0 ${x}%)`;l.style.left=x+'%';l.style.opacity=u>.92?(1-u)/.08:1});sweep(u,x);
  if(u<1)requestAnimationFrame(st);else{ovs.forEach(([o,l])=>{o.remove();l.remove()});const again=WIPING===2;WIPING=0;renderFaces()}})()}
function sweep(u,x){const ph=$('pwipe');ph.style.display=u<1?'block':'none';ph.style.left=x+'%';ph.style.opacity=u>.92?(1-u)/.08:1}
let pick=0,prot=0,PICK={lu:null,radio:null,remote:null};
const PM=()=>REMOTE?'remote':MODE;
function setMode(m){if(WIPING||m===PM())return;PICK[PM()]=pick;
 if(m==='remote'){wipe(()=>{if(P.playing){if(MODE==='radio'){hangUp();P.playing=false}else AU.pause()}REMOTE=true;rpoll.drawn=0;renderFaces();rpoll()});}
 else if(REMOTE&&m===MODE){wipe(()=>{REMOTE=false;renderFaces()})}
 else{REMOTE=false;switchMode();const t0=performance.now();(function st(){const u=Math.min(1,(performance.now()-t0)/1250),e=u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;sweep(u,(e*100).toFixed(2));if(u<1)requestAnimationFrame(st)})()}
 pick=PICK[m]!=null?PICK[m]:(P.has?P.pl:0);document.body.dataset.mode=m;topUI();bottomUI()}
window.luSetMode=setMode;
const _rf=renderFaces,_tf=tickFaces;
renderFaces=function(){if(WIPING){WIPING=2;return}if(REMOTE)remRender();else _rf()};
tickFaces=function(){if(REMOTE)remTick();else _tf()};
const _act=act;act=function(a){const p=a.split(':');
 if(p[0]==='pm'){setMode(p[1]);return}
 if(p[0]==='lib'){relib();return}
 if(p[0]==='rem'){const s=rcur();if(p[1]==='allow'){N('remoteSettings');return}if(p[1]==='pick'){const x=RS[+p[2]];if(x){RSEL=x.pkg;renderFaces();goFace('NOW PLAYING')}return}
  if(s){const c=p[1]==='play'?(s.playing?'pause':'play'):p[1];N('remoteCmd',{pkg:s.pkg,cmd:c});s.playing=c==='play'?true:c==='pause'?false:s.playing;renderFaces();setTimeout(rpoll,350);setTimeout(rpoll,1200)}return}
 if(p[0]==='cs'){openSearch(p[1],+p[2]);return}
 if(a==='al:sun'){LS.set('lu_sun',!LS.get('lu_sun',false));if(LS.get('lu_sun'))AL.on=true;saveState();renderFaces();syncAlarm(true);return}
 if(REMOTE&&p[0]!=='go'){const s=rcur();if(!s)return;if(p[0]==='play'||p[0]==='next'||p[0]==='prev')return act('rem:'+p[0]);if(p[0]==='pl'){const x=RS[+p[1]];if(x){RSEL=x.pkg;renderFaces();goFace('NOW PLAYING')}}return}
 return _act(a)};

// ---------- phone chrome ----------
const ui=document.createElement('div');ui.innerHTML=`<div id="ptop"><h2 id="ptitle">LU</h2><div class="pr"><b id="pfind" title="search stations">🔎</b><div class="seg" id="pseg"><b data-m="lu">♫</b><b data-m="radio">📻</b><b data-m="remote">◎</b></div><b id="pgear" title="settings">⚙</b></div></div>
 <div id="pdots"></div><div id="pface"></div><div id="pbot"><canvas id="pglobe"></canvas><div id="pwheel"></div><div id="plab"><small id="plk"></small><b id="pln"></b><i id="plt">TAP TO PLAY</i></div></div><div id="pwipe"></div>
 <div id="psheet"><div class="in" id="pin"></div></div>`;
document.body.append(ui);
const FN={lu:{COVER:'COVER','NOW PLAYING':'NOW',PLAYLIST:'LIST',LIBRARY:'LIBRARY',LYRICS:'LYRICS',VISUALISER:'VIZ'},radio:{COVER:'LIVE FROM','NOW PLAYING':'ON AIR',PLAYLIST:'CHANNELS',LIBRARY:'WORLD',LYRICS:'WAKE-UP',VISUALISER:'PASSPORT'},remote:{COVER:'COVER','NOW PLAYING':'NOW',PLAYLIST:'APPS',LIBRARY:'CAUGHT',LYRICS:'ACCESS',VISUALISER:'VIZ'}};
const ORDER=['NOW PLAYING','COVER','PLAYLIST','LIBRARY','LYRICS','VISUALISER'];
const dots=$('pdots');ORDER.forEach(n=>{const d=document.createElement('i');d.dataset.n=n;d.onclick=()=>goFace(n);dots.append(d)});
document.querySelectorAll('#pseg b').forEach(b=>b.onclick=()=>setMode(b.dataset.m));
$('pgear').onclick=()=>sheet(true);$('psheet').onclick=e=>{if(e.target.id==='psheet')sheet(false)};
$('pfind').onclick=()=>{const f=document.querySelector('.find');const on=!document.body.classList.contains('pfindon');document.body.classList.toggle('pfindon',on);if(on&&f){const i=f.querySelector('input');setTimeout(()=>i&&i.focus(),50)}};
document.addEventListener('pointerdown',e=>{if(!document.body.classList.contains('pfindon'))return;const f=document.querySelector('.find');if((f&&f.contains(e.target))||e.target.closest('#pfind'))return;document.body.classList.remove('pfindon');const i=f&&f.querySelector('input');if(i)i.blur()},true);
const PCUBE='<svg width="17" height="17" viewBox="0 0 100 100" aria-hidden="true" style="display:block;flex:none"><polygon points="50,6 90,29 50,52 10,29" fill="#fff" stroke="#111" stroke-width="7" stroke-linejoin="round"/><polygon points="10,29 50,52 50,96 10,73" fill="#2f6be8" stroke="#111" stroke-width="7" stroke-linejoin="round"/><polygon points="50,52 90,29 90,73 50,96" fill="#e0281a" stroke="#111" stroke-width="7" stroke-linejoin="round"/></svg>';
function topUI(){const m=PM();$('ptitle').innerHTML='<span>'+(m==='lu'?'LU':m==='radio'?'RADIO':'REMOTE')+'</span>'+PCUBE;$('ptitle').title=(m==='lu'?'Lu':m==='radio'?'Radio':'Remote')+' Cube';document.querySelectorAll('#pseg b').forEach(b=>b.classList.toggle('on',b.dataset.m===m));document.body.classList.remove('pfindon')}

// ---------- bottom: thumb wheel (Lu, Remote) or the globe (Radio) ----------
let ptok=[];const PW2=$('pwheel'),GC=$('pglobe'),gx=GC.getContext('2d');
const BL=()=>REMOTE?RS:PLS;
function bottomUI(){const L=BL(),m=PM();pick=Math.max(0,Math.min(L.length-1,pick));PW2.innerHTML='';
 ptok=m==='radio'?[]:L.map((p,i)=>{const d=document.createElement('div');d.className='ptok';if(m==='remote'){d.style.background=p.art?`url('${p.art}') center/cover,#111`:`radial-gradient(circle at 35% 30%,${RCOL(p.pkg)},#111 78%)`;d.innerHTML=`<span>${E((p.app||'?')[0])}</span>`}else d.style.background=p.art;PW2.append(d);return d});
 $('pbot').dataset.mode=m;plabel()}
function plabel(){const m=PM(),L=BL(),p=L[pick],k=$('plk'),n=$('pln'),t=$('plt');
 if(!p){k.textContent=m==='remote'?'REMOTE':m==='radio'?'THE WORLD':'YOUR MUSIC';n.textContent=m==='remote'?(RGRANT?'NOTHING PLAYING':'TURN ON ACCESS'):m==='radio'?(RLOAD?'TUNING THE WORLD…':'LOADING…'):'NO SONGS YET';t.textContent='';return}
 if(m==='remote'){const c=rcur();k.textContent='PLAYING IN';n.textContent=p.app;t.textContent=c&&c.pkg===p.pkg?(p.playing?'CONTROLLING · TAP TO PAUSE':'CONTROLLING · TAP TO PLAY'):'TAP TO CONTROL';return}
 const on=P.has&&P.pl===pick;
 k.textContent=m==='radio'?(p.city?(isNight(p.city)?'☾ ':'☀ ')+local(p.city)+' THERE · '+p.songs.length+' CHANNELS':'★ '+p.songs.length+' SAVED'):'PLAYLIST · '+p.songs.length+' SONGS';
 n.textContent=p.n;t.textContent=on?(P.playing?'NOW PLAYING · TAP TO PAUSE':'PAUSED · TAP TO PLAY'):(m==='radio'?(p.fav?'TAP TO SEE THEM':'TAP TO TUNE IN'):'TAP TO PLAY')}
function tapPick(){const m=PM();if(m==='remote'){const p=RS[pick];if(!p){if(!RGRANT)N('remoteSettings');return}if(rcur()&&rcur().pkg===p.pkg)act('rem:play');else{RSEL=p.pkg;renderFaces();goFace('NOW PLAYING')}plabel();return}
 if(!PLS.length)return;if(P.has&&P.pl===pick)act('play');else{act('pl:'+pick);goFace(m==='radio'&&PLS[pick].fav?'PLAYLIST':'NOW PLAYING')}plabel()}
// swipe sideways to scroll (a buzz on each click), tap to play / tune in.
// Radio: the globe is a real globe under your finger. Spin it any way; the country nearest the middle is the pick.
const pb=$('pbot');let sw=null,GD=null,GV=[0,0],GSNAP=true,GR=100,PINS=[];
const radio=()=>PM()==='radio';
pb.addEventListener('pointerdown',e=>{if(e.target.id==='pfav')return;pb.setPointerCapture(e.pointerId);
 if(radio()){GD={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,lon:gLon2,lat:gLat2,moved:false};GV=[0,0];GSNAP=false;return}
 sw={x:e.clientX,p:pick,moved:false}});
pb.addEventListener('pointermove',e=>{
 if(GD){const dx=e.clientX-GD.x,dy=e.clientY-GD.y;if(Math.hypot(dx,dy)>6)GD.moved=true;if(!GD.moved)return;const k=180/(Math.PI*GR);
  gLon2=GD.lon-dx*k;gLat2=Math.max(-65,Math.min(75,GD.lat+dy*k));GV=[GV[0]*.5-(e.clientX-GD.lx)*k*.5,GV[1]*.5+(e.clientY-GD.ly)*k*.5];GD.lx=e.clientX;GD.ly=e.clientY;return}
 if(!sw)return;const dx=e.clientX-sw.x,st=62;if(Math.abs(dx)>6)sw.moved=true;const L=BL().length;if(!L)return;prot=Math.max(-.4,Math.min(L-.6,sw.p-dx/st));const n=Math.max(0,Math.min(L-1,Math.round(sw.p-dx/st)));if(n!==pick){pick=n;plabel();vib(7)}});
pb.addEventListener('pointerup',e=>{
 if(GD){const m=GD.moved;GD=null;if(!m){GSNAP=true;tapGlobe(e.clientX,e.clientY)}return}
 if(!sw)return;const m=sw.moved;sw=null;if(!m)tapPick()});
pb.addEventListener('pointercancel',()=>{sw=null;GD=null});
// tap a pin to tune straight to it; tap anywhere else to tune the country in the middle
function tapGlobe(x,y){const r=GC.getBoundingClientRect(),cx=(x-r.left)*2,cy=(y-r.top)*2;let best=-1,bd=56*56;
 const mid=PINS.find(q=>q[0]===pick);if(mid&&(mid[1]-cx)**2+(mid[2]-cy)**2<70*70){tapPick();return}bd=40*40;PINS.forEach(([i,px,py])=>{const d=(px-cx)**2+(py-cy)**2;if(d<bd){bd=d;best=i}});if(best>=0&&best!==pick){pick=best;vib(7)}tapPick()}
// ★ favourites have no place on the map, so they get their own button
const pfav=document.createElement('b');pfav.id='pfav';pfav.textContent='★ FAVOURITES';pb.append(pfav);
pfav.addEventListener('click',e=>{e.stopPropagation();if(PLS[0]&&PLS[0].fav){act('pl:0');goFace('PLAYLIST')}});
setInterval(()=>{pfav.style.display=radio()&&PLS[0]&&PLS[0].fav?'block':'none'},500);
let gLon2=0,gLat2=20;
function drawPGlobe(t){const W=GC.width=GC.clientWidth*2,H=GC.height=GC.clientHeight*2,cx=W/2,R=Math.min(W*.32,H*.31),cy=H*.39;GR=R/2;gx.clearRect(0,0,W,H);
 if(!GD&&!GSNAP){gLon2+=GV[0];gLat2=Math.max(-65,Math.min(75,gLat2+GV[1]));GV=[GV[0]*.93,GV[1]*.93];if(Math.hypot(GV[0],GV[1])<.04)GSNAP=true} // a flick keeps it turning, then it settles
 const p=PLS[pick],c=p&&p.city;
 if(GSNAP&&!GD){if(c&&c.lon!=null){gLon2+=((((c.lon-gLon2)%360)+540)%360-180)*.09;gLat2+=(c.lat*.85-gLat2)*.09}else gLon2+=.08}
 const sg=gx.createRadialGradient(cx-R*.3,cy-R*.35,R*.1,cx,cy,R);sg.addColorStop(0,'#22306a');sg.addColorStop(1,'#060918');gx.fillStyle=sg;gx.beginPath();gx.arc(cx,cy,R,0,7);gx.fill();
 const at=gx.createRadialGradient(cx,cy,R*.92,cx,cy,R*1.15);at.addColorStop(0,'rgba(90,140,255,0)');at.addColorStop(.45,'rgba(90,140,255,.32)');at.addColorStop(1,'rgba(90,140,255,0)');gx.fillStyle=at;gx.beginPath();gx.arc(cx,cy,R*1.15,0,7);gx.fill();
 const a=-gLon2*D2R,b=gLat2*D2R,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),P3=d=>{const X=d[0]*ca+d[2]*sa,z0=-d[0]*sa+d[2]*ca;return[X,d[1]*cb-z0*sb,d[1]*sb+z0*cb]},dz=Math.max(2,R/60);
 gx.fillStyle='#a8c8ff';for(const d of LANDV){const v=P3(d);if(v[2]<0)continue;gx.globalAlpha=.22+.78*v[2];gx.fillRect(cx+v[0]*R-dz/2,cy-v[1]*R-dz/2,dz,dz)}gx.globalAlpha=1;
 // while you spin it, whichever country is nearest the middle is the pick (a little buzz as each one comes round)
 if(GD||!GSNAP){let bi=-1,bz=-2;PLS.forEach((q,i)=>{if(!q.city||!q.city.v)return;const v=P3(q.city.v),z=v[2]-Math.abs(v[1])*.15;if(z>bz){bz=z;bi=i}});if(bi>=0&&bi!==pick){pick=bi;plabel();vib(6)}}
 PINS=[];
 // the middle of the globe, so you can see what you're aiming at
 gx.strokeStyle='rgba(255,194,26,.35)';gx.lineWidth=2;gx.beginPath();gx.arc(cx,cy,R*.09,0,7);gx.stroke();
 PLS.forEach((q,i)=>{if(!q.city||!q.city.v)return;const v=P3(q.city.v);if(v[2]<.05)return;const on=i===pick,px=cx+v[0]*R,py=cy-v[1]*R,rr=on?R*.05:R*.026;PINS.push([i,px,py]);gx.fillStyle=on?'#ffc21a':(P.has&&P.pl===i)?'#ffffff':'#e8382f';gx.beginPath();gx.arc(px,py,rr,0,7);gx.fill();
  if(on){const u=(t/1100)%1;gx.strokeStyle=`rgba(255,194,26,${1-u})`;gx.lineWidth=3;gx.beginPath();gx.arc(px,py,rr+u*R*.22,0,7);gx.stroke()}})}
function frameP(t){const m=PM();if(m==='radio'&&!document.hidden)drawPGlobe(t);else{if(!sw)prot+=(pick-prot)*.2;ptok.forEach((d,i)=>{const da=(i-prot)*.48,vis=Math.max(0,1-Math.abs(da)/1.45),on=i===pick,R=PW*.62,x=PW/2+Math.sin(da)*R,y=R*(1-Math.cos(da))*1.05+30,s=(on?1.12:.78)*(.55+.45*vis);
  d.style.transform=`translate(${x-34}px,${y}px) scale(${s})`;d.style.opacity=vis;d.classList.toggle('on',on);d.classList.toggle('pl',m==='remote'?!!(rcur()&&BL()[i]&&rcur().pkg===BL()[i].pkg):P.has&&P.pl===i)})}
 const f=front();dots.querySelectorAll('i').forEach(d=>{d.classList.toggle('on',d.dataset.n===f)});$('pface').textContent=(FN[m]||FN.lu)[f]||'';requestAnimationFrame(frameP)}
setInterval(()=>{plabel();if(!REMOTE&&ptok.length!==BL().length&&PM()!=='radio')bottomUI()},1000);
// the cube's list changes (library loaded, genre picked, the world arrived): keep the wheel in step
let lastLen=-1;setInterval(()=>{const k=PM()+PLS.length;if(k!==lastLen){lastLen=k;if(!REMOTE&&P.has&&pick>=PLS.length)pick=P.pl;bottomUI()}},500);

// ---------- ⚙ settings ----------
const TIERS=[['THE CUBE','Everyone starts here'],['WANDERER','25 countries · checker trim'],['VOYAGER','75 countries · dotted trim'],['GLOBETROTTER','150 countries · striped trim'],['CITIZEN OF EARTH','197 countries · holographic']];
function sheet(on){$('psheet').classList.toggle('on',on);if(on)drawSheet()}
function seg(id,opts,cur){return `<div class="sg" data-k="${id}">${opts.map(([v,l])=>`<b data-v="${v}" class="${String(v)===String(cur)?'on':''}">${l}</b>`).join('')}</div>`}
let SYNCMSG='',VERS='';
function drawSheet(){const sv=LS.get('lu_saver','mobile'),ev=!!LS.get('lu_even',false),sk=LS.get('lu_skin',0)|0,unl=typeof bnSeen==='number'?bnSeen:0,pc=LS.get('lu_pc',{addr:'',code:''}),s=MODE==='radio'&&P.has?song():null;
 const mb=s&&s.br?Math.round(s.br*.45):null,place=(ST&&ST.place&&ST.place.name)||'';
 $('pin').innerHTML=`<div class="hd"><b>SETTINGS</b><i id="pclose">✕</i></div>
 <h4>DATA SAVER</h4><p>Smaller station list and low-bitrate stations first${mb?` · this station uses about <b>${mb} MB an hour</b>`:''}.</p>${seg('saver',[['off','OFF'],['mobile','ON MOBILE DATA'],['always','ALWAYS']],sv)}<p><span class="btn" id="prw">↻ REFRESH THE STATION LIST</span></p>
 <h4>EVEN VOLUME</h4><p>Loud stations and quiet songs play at the same level.</p>${seg('even',[[0,'OFF'],[1,'ON']],ev?1:0)}
 <h4>CUBE SKIN</h4><p>Earn passport banners on the radio to unlock more.</p><div class="skins">${TIERS.map(([n,d],i)=>`<b data-skin="${i}" class="${i===sk?'on':''} ${i>unl?'lock':''}"><u class="sw sw${i}"></u>${n}<small>${i>unl?'🔒 '+d:d}</small></b>`).join('')}</div>
 <h4>SYNC WITH YOUR PC</h4><p>On the PC run <b>Phone Sync.bat</b> in the Lu Cube folder; it shows an address and a code. Same Wi-Fi.</p>
 <div class="row"><input id="paddr" placeholder="192.168.1.20:8766" value="${E(pc.addr)}" inputmode="url"><input id="pcode" placeholder="CODE" value="${E(pc.code)}" style="width:80px"></div><p><span class="btn" id="psync">⇄ SYNC NOW</span> <span id="psmsg">${E(SYNCMSG)}</span></p>
 <h4>REMOTE</h4><p>Notification access lets the cube control Spotify, YouTube Music and the rest. ${RGRANT?'<b>On.</b>':'<b>Off.</b>'}</p><p><span class="btn" id="prem">OPEN NOTIFICATION ACCESS</span></p>
 <h4>WAKE-UP</h4><p>Set the time on the radio's Wake-up face. ☀ Sunrise wakes you to a station somewhere it's morning right now.</p><p><span class="btn" id="palm">ALLOW EXACT ALARMS</span></p>
 <h4>WEATHER TOWN</h4><p>The cube takes on your weather and time of day.</p><div class="row"><input id="ptown" placeholder="Your town" value="${E(place)}"><span class="btn" id="pset">SET</span></div>
 <h4>ANDROID AUTO</h4><p>Lu Cube shows up in Android Auto with your playlists and the radio. Because it's installed from GitHub, not the Play Store, turn on <b>Unknown sources</b> once: Android Auto settings → tap <i>Version</i> ten times → ⋮ Developer settings → Unknown sources.</p>
 <h4>ABOUT</h4><p>Lu Cube for Android ${E(VERS)} · MIT licence · BuildBeyond1889. Stations from radio-browser.info, weather from Open-Meteo.</p><p><span class="btn" id="pupd">GET THE LATEST VERSION</span></p>`;
 $('pclose').onclick=()=>sheet(false);
 document.querySelectorAll('#pin .sg b').forEach(b=>b.onclick=()=>{const k=b.parentNode.dataset.k,v=b.dataset.v;if(k==='saver')LS.set('lu_saver',v);if(k==='even'){LS.set('lu_even',v==='1');N('evenVolume',{on:v==='1'})}drawSheet()});
 document.querySelectorAll('#pin [data-skin]').forEach(b=>b.onclick=()=>{const i=+b.dataset.skin;if(i>unl){vib(40);return}LS.set('lu_skin',i);applySkin();drawSheet()});
 $('prw').onclick=()=>{window.luRebuildWorld();WORLD=null;radioFetch.busy=0;if(MODE==='radio')radioFetch();$('prw').textContent='DOWNLOADING…'};
 $('prem').onclick=()=>N('remoteSettings');$('palm').onclick=()=>N('alarmSettings');$('pupd').onclick=()=>{if(UPD.n>MYB)doUpdate();else checkUpdate(true)};$('pupd').textContent=UPD.n>MYB?'⬇ UPDATE TO BUILD '+UPD.n:'CHECK FOR AN UPDATE';
 $('pset').onclick=async()=>{const q=$('ptown').value.trim();if(!q)return;$('pset').textContent='…';try{const j=await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&name='+encodeURIComponent(q))).json(),r=(j.results||[])[0];
  if(!r){$('pset').textContent='NOT FOUND';return}ST.place={name:r.name,lat:r.latitude,lon:r.longitude};const st=LS.get('lu_state',{})||{};st.place=ST.place;LS.set('lu_state',st);fetchWX();$('pset').textContent='✓ '+r.name.toUpperCase()}catch(e){$('pset').textContent='NO INTERNET'}};
 $('psync').onclick=()=>{LS.set('lu_pc',{addr:$('paddr').value.trim(),code:$('pcode').value.trim()});pcSync()}}
let MYB=0;const UPD={n:0,url:'',busy:false};
N('info').then(r=>{VERS=(r.version||'')+(r.build?' (build '+r.build+')':'');MYB=r.build|0;setTimeout(()=>checkUpdate(false),5000)});
// updates: the app asks GitHub for the newest build and installs it itself (no browser download needed)
async function checkUpdate(loud){if(!HAS||!MYB)return;const say=t=>{const b=$('pupd');if(b)b.textContent=t};if(loud)say('CHECKING…');
 try{const j=await (await fetch('https://api.github.com/repos/BuildBeyond1889/LuCube/releases/tags/phone-latest')).json(),m=/build (\d+)/i.exec(j.name||''),a=(j.assets||[]).find(x=>/\.apk$/i.test(x.name));
  if(m&&a){UPD.n=+m[1];UPD.url=a.browser_download_url}
  if(UPD.n>MYB){bar('NEW VERSION READY · BUILD '+UPD.n+' · TAP TO UPDATE');say('⬇ UPDATE TO BUILD '+UPD.n)}else if(loud)say('✓ UP TO DATE · BUILD '+MYB)}catch(e){if(loud)say('NO INTERNET · TRY AGAIN')}}
function bar(t){let b=$('pupbar');if(!b){b=document.createElement('div');b.id='pupbar';b.onclick=()=>doUpdate();document.body.append(b)}b.textContent=t;b.style.display='block'}
async function doUpdate(){if(UPD.busy||!UPD.url)return;UPD.busy=true;bar('DOWNLOADING THE UPDATE…');
 try{const r=await window.LUNATIVE.installUpdate({url:UPD.url});
  if(r.needsPermission)bar('ALLOW LU CUBE TO INSTALL UPDATES, THEN COME BACK AND TAP HERE');else bar('TAP UPDATE ON THE NEXT SCREEN · BUILD '+UPD.n)}
 catch(e){bar('UPDATE DIDN\'T DOWNLOAD · TAP TO TRY AGAIN')}finally{UPD.busy=false}}
if(HAS)window.LUNATIVE.addListener('update',e=>{if(e.pct>=0)bar('DOWNLOADING THE UPDATE · '+e.pct+'%')});

// ---------- cube skins, unlocked by passport banners ----------
function applySkin(){const sk=Math.min(LS.get('lu_skin',0)|0,typeof bnSeen==='number'?bnSeen:0);document.body.className=document.body.className.replace(/\bskin-\d\b/g,'').trim()+(sk?' skin-'+sk:'')}
const addTrim=f=>{if(!f.querySelector(':scope>.skt')){const u=document.createElement('u');u.className='skt';f.append(u)}};
document.querySelectorAll('.f').forEach(f=>{addTrim(f);new MutationObserver(()=>addTrim(f)).observe(f,{childList:true})});
setInterval(applySkin,3000);

// ---------- PC sync: songs from Lu Cube on your PC, plus passport, radio favourites and caught songs both ways ----------
let SYNCING=false;
async function pcSync(){if(SYNCING)return;const pc=LS.get('lu_pc',{}),msg=t=>{SYNCMSG=t;const e=$('psmsg');if(e)e.textContent=t};
 if(!pc.addr){msg('Type the address your PC shows.');return}const base='http://'+pc.addr.replace(/^https?:\/\//,'').replace(/\/+$/,''),q='c='+encodeURIComponent(pc.code||'');
 SYNCING=true;msg('Finding your PC…');
 try{const hi=await (await fetch(base+'/sync/hello?'+q)).json();if(!hi.ok){msg(hi.error||'The code doesn\'t match.');return}
  // passport, radio favourites and caught songs: merged on the PC, both sides end up with everything
  const mine={pass:PASS,rfavs:MODE==='radio'?FAVS:RFAVS,caught:CAUGHT()};
  const mg=await (await fetch(base+'/sync/state?'+q,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(mine)})).json();
  if(mg&&mg.pass){PASS=mg.pass;RFAVS=(mg.rfavs||[]).filter(x=>typeof x==='string');if(MODE==='radio'){FAVS=RFAVS;if(WORLD)rebuildRadio()}LS.set('lu_caught',mg.caught||CAUGHT());bnCheck();saveState();renderFaces()}
  const lib=await (await fetch(base+'/sync/library?'+q)).json(),files=lib.files||[],done=LS.get('lu_synced',{});let k=0,got=0;
  for(const f of files){k++;if(done[f.p]===f.s)continue;msg(`Copying ${k} of ${files.length} · ${short(f.p.split('/').pop(),28)}`);
   try{await window.LUNATIVE.downloadFile({url:base+'/sync/file?'+q+'&p='+encodeURIComponent(f.p),dest:f.p});done[f.p]=f.s;got++;if(got%5===0)LS.set('lu_synced',done)}catch(e){}}
  LS.set('lu_synced',done);msg(`Done · ${got} new song${got===1?'':'s'} from ${hi.name||'your PC'} · passport synced`);
  if(got)setTimeout(relib,2500)}
 catch(e){msg('Can\'t reach '+pc.addr+'. Same Wi-Fi? Is Phone Sync.bat running?')}finally{SYNCING=false}}

// ---------- the phone's player follows the cube's settings; Android Auto gets the same lists ----------
let shufK=null,alK='';setInterval(()=>{if(SHUF!==shufK){shufK=SHUF;N('shuffle',{on:SHUF})}syncAlarm()},2000);
N('evenVolume',{on:!!LS.get('lu_even',false)});
function syncAlarm(force){const sun=!!LS.get('lu_sun',false),st=AL.src&&STBY[AL.src],o={on:!!AL.on&&(!!AL.src||sun),h:AL.h,m:AL.m,sunrise:sun,station:AL.src?{u:AL.src,t:AL.name||(st&&st.t)||'Lu Cube',a:'Wake-up'}:null};
 const k=JSON.stringify(o);if(k===alK&&!force)return;alK=k;
 if(sun&&WORLD)o.candidates=WORLD.filter(c=>c.songs.length&&c.lon!=null).map(c=>{const x=c.songs[0];return{u:x.src,t:x.t,a:c.n,off:Math.round(c.lon/15)*60}});
 N('setAlarm',o)}
let treeK='';function pushTree(force){if(!HAS)return;const lists=[],luP=MODE==='lu'?PLS:(RKEEP.lu?RKEEP.lu.pls:[]);
 luP.forEach((p,i)=>{if(p.songs&&p.songs.length)lists.push({id:'L'+i,title:p.n,group:'lu',items:p.songs.slice(0,500).map(s=>({t:s.t,a:s.a||'',u:s.src}))})});
 if(WORLD){const fav=(MODE==='radio'?FAVS:RFAVS).map(u=>STBY[u]).filter(Boolean);if(fav.length)lists.push({id:'RF',title:'★ Favourites',group:'radio',items:fav.map(s=>({t:s.t,a:s.a||'',u:s.src,live:true}))});
  WORLD.filter(c=>c.songs.length).forEach(c=>lists.push({id:'R'+c.cc,title:c.n,group:'radio',items:c.songs.slice(0,20).map(s=>({t:s.t,a:s.a||c.n,u:s.src,live:true}))}))}
 const json=JSON.stringify({lists});if(json===treeK&&!force)return;treeK=json;N('setBrowseTree',{json})}
setInterval(()=>{if(!document.hidden)pushTree()},15000);

// ---------- start: the cube front and centre ----------
function place(){PW=innerWidth;PH=innerHeight;CY0=Math.round(PH*.37);csz=Math.min(1,(PW-40)/300)}
addEventListener('resize',place);
setTimeout(()=>{place();toCube(PW/2,CY0);cpos=[PW/2,CY0];goFace('NOW PLAYING');document.body.dataset.mode=MODE;
 topUI();bottomUI();renderFaces();applySkin();requestAnimationFrame(frameP);rpoll();
 // keep it centred (the desktop version lets you drag it around; here it stays put)
 setInterval(()=>{if(cubeOn&&!shatter){cpos[0]=PW/2;cpos[1]=CY0;csz=Math.min(1,(PW-40)/300)}},100)},60);
// the radio may come up first (that's where you left it): match the switch
setInterval(()=>{if(!REMOTE&&document.body.dataset.mode!==MODE){document.body.dataset.mode=MODE;topUI();bottomUI()}},400);
})();
