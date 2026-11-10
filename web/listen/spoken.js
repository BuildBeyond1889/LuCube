// ===================== LU CUBE · PHONE: audiobooks and podcasts, and taking playlists off the cube =====================
// Audiobooks and podcasts (luKindOf in native.js says which playlists are which) get:
//   · their place remembered: every chapter / episode keeps where you stopped; a book or show picks up where you left off
//     when you come back to it on the wheel ("▶ RESUME · CH 3 · 12:40"), and finished episodes get a ✓;
//   · back 15 / forward 30 in place of ⏮ ⏭ (hold them for the previous / next chapter or episode), also on the lock screen;
//   · ↺ START OVER on the Now face.
// Music plays exactly as before.
// The library face has a red ✕: tap it, then a playlist, to take it off the cube. Your own music only comes off Lu Cube
// (the files stay on the phone); what Lu Cube downloaded itself is deleted to free the space, and can be got again.
(function(){
const LS=window.LUSTORE,N=window.lucall,LN=window.LUNATIVE;
const $=id=>document.getElementById(id),E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vib=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
const kind=p=>!p||p.fav||!window.luKindOf?'music':luKindOf(p.n,p.songs);
const spoken=p=>{const k=kind(p);return k==='book'||k==='pod'};
const cur=()=>P.has&&PLS[P.pl]?PLS[P.pl]:null;
const key=p=>String(p.n).toLowerCase();
const clock=s=>{s=Math.max(0,Math.round(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=String(s%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${x}`:`${m}:${x}`};
const MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// ---------- where you are: each chapter / episode (by its file) and each book / show (its last one) ----------
const POS=()=>LS.get('lu_pos',{})||{};
const RES=()=>LS.get('lu_resume',{})||{};
function save(){const p=cur();if(!p||!spoken(p))return;const s=p.songs[P.idx];if(!s)return;const t=AU.currentTime,d=AU.duration;if(!(t>0))return;
 const m=POS(),was=m[s.src]||{};m[s.src]={p:Math.round(t),d:isFinite(d)&&d>0?Math.round(d):was.d||0,done:!!was.done||(isFinite(d)&&d>0&&t>=d*.95),at:Date.now()};
 const ks=Object.keys(m);if(ks.length>3000)ks.sort((a,b)=>(m[a].at||0)-(m[b].at||0)).slice(0,ks.length-3000).forEach(k=>delete m[k]);
 LS.set('lu_pos',m);const r=RES();r[key(p)]=s.src;LS.set('lu_resume',r)}
setInterval(()=>{if(P.playing)save()},5000);
AU.addEventListener('pause',save);
window.luDone=src=>!!(POS()[src]||{}).done;

// where a book / show picks up: its last chapter or episode, or the next one if that was finished
function resumeOf(p){const r=RES()[key(p)];let i=r?p.songs.findIndex(x=>x.src===r):-1;if(i<0)return null;
 const q=POS()[p.songs[i].src]||{};if(q.done){if(kind(p)==='book'&&i+1<p.songs.length)return{i:i+1,pos:0};return null}
 return{i,pos:q.p||0}}
// a chapter / episode that starts (by itself or tapped in the list) goes back to where you stopped in it
let seekT=0;
function seekTo(src,t){clearTimeout(seekT);seekT=setTimeout(()=>{const p=cur();if(!p||!p.songs[P.idx]||p.songs[P.idx].src!==src)return;try{AU.currentTime=t}catch(e){}},450)}
const _sc=songChanged;songChanged=function(){_sc.apply(this,arguments);const p=cur();if(!p||!spoken(p))return;const s=p.songs[P.idx];if(!s)return;const q=POS()[s.src];if(q&&!q.done&&q.p>8)seekTo(s.src,Math.max(0,q.p-3))};

// ---------- the wheel's label ----------
window.luWheelLabel=p=>{const k=kind(p),n=p.songs.length;return k==='book'?`AUDIOBOOK · ${n} CHAPTER${n===1?'':'S'}`:k==='pod'?`PODCAST · ${n} EPISODE${n===1?'':'S'}`:''};
window.luResumeLabel=p=>{if(!spoken(p))return'';const r=resumeOf(p);if(!r)return'';const s=p.songs[r.i];
 const where=kind(p)==='book'?'CH '+(r.i+1):(s.dt?(m=>MON[+m[2]-1]+' '+(+m[3]))(/^(\d{4})-(\d{2})-(\d{2})/.exec(s.dt)):'EP '+(r.i+1));return r.pos>8?`▶ RESUME · ${where} · ${clock(r.pos)}`:`▶ PLAY · ${where}`};

// ---------- the 15 / 30 jumps (and holding them for the previous / next track) ----------
// a button held down: the tap that ends now was pressed more than 0.45 s ago
let downAt=0,upAt=0;addEventListener('pointerdown',()=>{downAt=performance.now()},true);addEventListener('pointerup',()=>{upAt=performance.now()},true);
const held=()=>performance.now()-upAt<400&&upAt-downAt>450;
function jump(s){const d=AU.duration;let t=Math.max(0,(AU.currentTime||0)+s);if(isFinite(d)&&d>0)t=Math.min(t,Math.max(0,d-1));try{AU.currentTime=t}catch(e){}vib(10);save()}
const ICB=`<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style="display:block"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" fill="currentColor"/><text x="12" y="16.2" text-anchor="middle" font-family="Space Mono,monospace" font-weight="700" font-size="7" fill="currentColor">15</text></svg>`;
const ICF=`<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style="display:block"><path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z" fill="currentColor"/><text x="12" y="16.2" text-anchor="middle" font-family="Space Mono,monospace" font-weight="700" font-size="7" fill="currentColor">30</text></svg>`;

// ---------- taking playlists off the cube ----------
let DEL=false;
const box=document.createElement('div');box.id='pdel';document.body.append(box);let delAt=0;
box.addEventListener('click',e=>{if(performance.now()-delAt<450){e.stopPropagation();e.preventDefault()}},true);
async function ask(i){const p=PLS[i];if(!p||p.fav)return;let mine=[];try{mine=((await N('addedPlaylists')).playlists||[])}catch(e){}
 const own=mine.find(x=>String(x).toLowerCase()===key(p)),subs=LS.get('lu_pod_subs',[])||[],sub=subs.some(s=>String(s.name).toLowerCase()===key(p));
 box.innerHTML=`<div class="in"><div class="hd"><b>${own?'DELETE':'REMOVE'} ${E(p.n)}?</b><i data-x="no">✕</i></div>
  <p>${own?'Lu Cube downloaded this, so its files are deleted to free up the space. You can get it again any time from Free Music or Books &amp; Podcasts.':'It comes off the cube and the wheel. The files stay on your phone, untouched.'}${sub?' You\'ll stop getting its new episodes too.':''}</p>
  <div class="row"><span class="btn go" data-x="ok">${own?'DELETE IT':'REMOVE IT'}</span><span class="btn" data-x="no">CANCEL</span></div></div>`;
 delAt=performance.now();box.classList.add('on');
 box.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{box.classList.remove('on');if(b.dataset.x==='ok')remove(p,own,sub)});
 box.onclick=e=>{if(e.target===box&&performance.now()-delAt>600)box.classList.remove('on')}}
async function remove(p,own,sub){const n=key(p);vib(30);
 if(cur()===p){if(P.playing)act('play');P.has=false}
 const h=LS.get('lu_hidden',[])||[];if(!h.some(x=>String(x).toLowerCase()===n)){h.push(p.n);LS.set('lu_hidden',h)}
 if(own)try{await N('removeAdded',{playlist:own})}catch(e){}
 if(sub){const L=(LS.get('lu_pod_subs',[])||[]).filter(s=>String(s.name).toLowerCase()!==n);LS.set('lu_pod_subs',L);N('podSubs',{subs:L})}
 const d=LS.get('lu_packs',{})||{};Object.keys(d).forEach(k=>{if(k.toLowerCase()===n||k.toLowerCase()===n+'#files')delete d[k]});LS.set('lu_packs',d);
 const r=RES();delete r[n];LS.set('lu_resume',r);
 if(window.luFinder&&luFinder.forget)luFinder.forget(p.n);
 try{await window.luRelib()}catch(e){}renderFaces()}

// ---------- the faces ----------
const _lrf=luRenderFaces;
luRenderFaces=function(){_lrf.apply(this,arguments);
 const p=cur();if(p&&spoken(p)){const c=F_NOW.querySelector('.ctrl');if(c){const b=c.querySelectorAll('b');if(b[0]){b[0].innerHTML=ICB;b[0].title='back 15 seconds (hold: previous)'}if(b[2]){b[2].innerHTML=ICF;b[2].title='forward 30 seconds (hold: next)'}}
  const o=F_NOW.querySelector('.opts');if(o&&!o.querySelector('[data-act="sp:over"]'))o.insertAdjacentHTML('beforeend','<span class="pill" data-act="sp:over">↺ START OVER</span>')
  // also on the playlist face, next to ALL PLAYLISTS (a long title can push the Now face's own row out of sight)
  const g=F_PL.querySelector('[data-act="go:LIBRARY"]');if(g&&!F_PL.querySelector('[data-act="sp:over"]'))g.insertAdjacentHTML('afterend','<span class="pill" data-act="sp:over" style="background:var(--k);color:var(--y)">↺ START OVER</span>')}
 if(F_LIB.querySelector('.lib')){F_LIB.classList.toggle('delmode',DEL);F_LIB.insertAdjacentHTML('beforeend',`<b class="ldel${DEL?' on':''}" data-act="sp:del" title="take playlists off the cube">${DEL?'DONE':'✕'}</b>${DEL?'<div class="ldelh">TAP A PLAYLIST TO TAKE IT OFF</div>':''}`)}};

const _act=act;act=function(a){const s=String(a);
 if(s==='sp:del'){DEL=!DEL;vib(15);renderFaces();return}
 if(s==='sp:over'){const p=cur();if(!p)return;const m=POS();if(kind(p)==='book'){p.songs.forEach(x=>delete m[x.src]);LS.set('lu_pos',m);const r=RES();delete r[key(p)];LS.set('lu_resume',r);play(P.pl,0)}else{delete m[p.songs[P.idx].src];LS.set('lu_pos',m);try{AU.currentTime=0}catch(e){}}vib(20);return}
 if(/^pl:\d+$/.test(s)){const i=+s.slice(3),p=PLS[i];
  if(DEL&&p&&!p.fav){ask(i);return}
  if(p&&spoken(p)&&p.songs.length&&!(P.has&&P.pl===i)){const r=resumeOf(p);if(r){plOff=0;play(i,r.i);goFace('PLAYLIST');return}}}
 if((s==='prev'||s==='next')&&spoken(cur())&&!held()){jump(s==='prev'?-15:30);return}
 return _act.apply(this,arguments)};

// the lock screen gets the same jumps while a book or podcast is on
let lastMode=null;
setInterval(()=>{const on=!!(cur()&&spoken(cur()));const k=on+':'+!!P.playing;if(k!==lastMode){lastMode=k;N('spokenMode',{on})}},1000);
})();
