// ===================== LU CUBE · PC: the listening layer, last touches =====================
// (after addmusic.js, finder.js and spoken.js) the wheel shows what each playlist is, a book or show you're partway
// through says so under the wheel, and new playlists turn up on the cube as soon as they land in Music.
(function(){
// a fresh look at Music (after a download, an import, a podcast episode or taking a playlist off)
window.luRelib=async function(){const L=await (await fetch('/api/library')).json();if(L.playlists&&L.playlists.length)applyLib(L);else renderFaces()};

// the wheel's discs: ringed yellow (music), orange (audiobook) or red (podcast)
const kindOf=p=>!p||p.fav?'':window.luKindOf?luKindOf(p.n,p.songs):'music';
function ring(){if(typeof toks==='undefined')return;const lu=MODE==='lu'&&mode==='pl';toks.forEach((d,i)=>{const k=lu?kindOf(PLS[i]):'';if(k)d.dataset.k=k;else delete d.dataset.k})}
const _bt=buildToks;buildToks=function(){const r=_bt.apply(this,arguments);ring();return r};
// …and the line under the wheel says it: AUDIOBOOK · 21 CHAPTERS · ▶ RESUME · CH 8 · 8:20
const _wn=wheelNow;wheelNow=function(){const r=_wn.apply(this,arguments);
 try{if(MODE==='lu'&&mode==='pl'&&PLS[sel]&&!PLS[sel].fav){const p=PLS[sel],a=window.luWheelLabel?luWheelLabel(p):'',b=window.luResumeLabel?luResumeLabel(p):'';
  if(a){document.getElementById('nowk').textContent=a+' · CLICK TO OPEN';const sb=document.getElementById('nowsub');if(sb&&b)sb.textContent=b+(P.has?' · now playing: '+song().t:'')}}}catch(e){}
 ring();return r};
// the chips under a search: they scroll sideways with the mouse wheel, and a small bar under them shows where you are
// (drag it, or click along it)
addEventListener('wheel',e=>{const c=e.target.closest&&e.target.closest('#plink .lkc,#plink .lkcbar');if(!c)return;const row=c.classList.contains('lkc')?c:c.previousElementSibling;
 if(!row||row.scrollWidth<=row.clientWidth||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;e.preventDefault();row.scrollLeft+=e.deltaY},{passive:false});
function chipBar(){const row=document.querySelector('#plink .lkc');if(!row)return;let bar=row.nextElementSibling;
 if(row.scrollWidth<=row.clientWidth+2){if(bar&&bar.classList.contains('lkcbar'))bar.remove();return}
 if(!bar||!bar.classList.contains('lkcbar')){bar=document.createElement('div');bar.className='lkcbar';bar.innerHTML='<i></i>';row.after(bar);
  row.addEventListener('scroll',()=>place(row,bar));
  bar.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const r=bar.getBoundingClientRect(),th=bar.firstChild,tw=th.offsetWidth,on=e.target===th,dx=on?e.clientX-th.getBoundingClientRect().left:tw/2;
   const go=x=>{row.scrollLeft=(x-r.left-dx)/(r.width-tw)*(row.scrollWidth-row.clientWidth)};if(!on)go(e.clientX);bar.classList.add('drag');
   const mv=ev=>go(ev.clientX),up=()=>{bar.classList.remove('drag');removeEventListener('pointermove',mv);removeEventListener('pointerup',up)};addEventListener('pointermove',mv);addEventListener('pointerup',up)})}
 place(row,bar)}
function place(row,bar){const th=bar.firstChild,w=bar.clientWidth,f=row.clientWidth/row.scrollWidth,tw=Math.max(24,w*f),max=row.scrollWidth-row.clientWidth;th.style.width=tw+'px';th.style.left=(max>0?row.scrollLeft/max*(w-tw):0)+'px'}
const pl=document.getElementById('plink');if(pl)new MutationObserver(()=>chipBar()).observe(pl,{childList:true});
// podcasts that came in while Lu Cube was open: the strip on the page and a Windows notification
setInterval(()=>{lucall('podNews').then(r=>{const L=(r&&r.news)||[];if(!L.length)return;window.luFinder&&luFinder.toast&&luFinder.toast(L.reduce((a,x)=>a+(x.n|0),0),[...new Set(L.map(x=>x.show))]);luRelib().catch(()=>{})})},120000);
})();

// ===================== the unfolded window (the big-screen mode) =====================
// In Lu mode the window gets the same things as the cube:
//   · the list on the left says AUDIOBOOK / PODCAST, ticks finished chapters and episodes, shows episode dates, ↺ START OVER
//   · the player says which chapter, and swaps ⏮ ⏭ for back 15 / forward 30
//   · the library tiles carry the yellow / orange / red rings, "▶ CH 3" on a book you're in, "2 NEW" on a show
//   · ✕ REMOVE next to SHUFFLE / FADE / SLEEP
//   · the LINER NOTES box becomes ADD MUSIC; Free Music and Books & Podcasts open over the left and middle of the window
(function(){
if(typeof mxRender!=='function')return;
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KC={music:'#ffc21a',book:'#ff7a1a',pod:'#e0281a'},MON=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const ICB=`<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style="display:block"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" fill="#111"/><text x="12" y="16.2" text-anchor="middle" font-family="Space Mono,monospace" font-weight="700" font-size="7" fill="#111">15</text></svg>`;
const ICF=`<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style="display:block"><path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z" fill="#111"/><text x="12" y="16.2" text-anchor="middle" font-family="Space Mono,monospace" font-weight="700" font-size="7" fill="#111">30</text></svg>`;
const kindOf=p=>!p||p.fav?'music':luKindOf(p.n,p.songs);
const clock=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=String(s%60).padStart(2,'0');return h?`${h}:${String(m).padStart(2,'0')}:${x}`:`${m}:${x}`};
const day=dt=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(dt||'');return m?MON[+m[2]-1]+' '+(+m[3]):''};
let PST={};const pst=()=>lucall('podStatus').then(r=>{PST=r||{}}).catch(()=>{});pst();setInterval(pst,60000);
const newOf=p=>{const s=(LUSTORE.get('lu_pod_subs',[])||[]).find(x=>String(x.name).toLowerCase()===String(p.n).toLowerCase());const q=s&&PST[s.feed];return q&&q.last|0};

const _mr=mxRender;mxRender=function(){_mr.apply(this,arguments);try{dress()}catch(e){console.warn('unfold',e)}};
function dress(){const w=mxEl&&mxEl.querySelector('.mxw');if(!w||MODE!=='lu')return;const S=[...w.querySelectorAll(':scope>.mxs0')],pl=PLS[P.pl],k=kindOf(pl),spoken=k==='book'||k==='pod';
 // ---- the list on the left ----
 const L=S[1];if(L&&pl&&spoken){const h=L.querySelector('.mxh1');h.style.background=KC[k];h.textContent=(k==='book'?'AUDIOBOOK':'PODCAST')+' · '+short(pl.n,20)+' · '+pl.songs.length;
  L.querySelectorAll('.mxrow').forEach(r=>{const i=+String(r.dataset.act).split(':')[1],s=pl.songs[i];if(!s)return;const sp=r.querySelector('span');
   if(window.luDone&&luDone(s.src))sp.insertAdjacentHTML('afterbegin','<em class="mxok">✓</em> ');if(k==='pod'&&s.dt)r.insertAdjacentHTML('beforeend',`<i class="mxdt">${day(s.dt)}</i>`)});
  L.querySelector('.mxlist').insertAdjacentHTML('beforeend','<div class="mxover"><span data-act="sp:over">↺ START OVER</span></div>')}
 // ---- the player ----
 const N=S[3];if(N&&pl&&spoken&&P.has){const s=song(),kk=N.querySelector('.mxk');if(kk)kk.textContent=k==='book'?`AUDIOBOOK · CHAPTER ${P.idx+1} OF ${pl.songs.length}`:`PODCAST${s.dt?' · '+day(s.dt):''} · ${P.idx+1} OF ${pl.songs.length}`;
  const b=N.querySelectorAll('.mxctl b');if(b[0]){b[0].innerHTML=ICB;b[0].title='back 15 seconds (hold: previous)'}if(b[2]){b[2].innerHTML=ICF;b[2].title='forward 30 seconds (hold: next)'}
  const pg=N.querySelector('.mxprog');if(pg&&!N.querySelector('.mxtm'))pg.insertAdjacentHTML('afterend','<div class="mxtm"><span id="mxt0"></span><span id="mxt1"></span></div>')}
 // ---- the library on the right ----
 const R=S[5];if(!R)return;
 R.querySelectorAll('.mxtile').forEach(t=>{const i=+String(t.dataset.act).split(':')[1],p=PLS[i];if(!p||p.fav)return;const kk=kindOf(p);t.style.boxShadow=`inset 0 0 0 2px #111,inset 0 0 0 6px ${KC[kk]}`+(t.classList.contains('on')?',0 0 0 3px #111':'');
  let badge='';if(kk==='book'&&window.luResumeLabel){const m=/CH (\d+)/.exec(luResumeLabel(p)||'');if(m)badge=`▶ CH ${m[1]}`}else if(kk==='pod'){const n=newOf(p);if(n)badge=`${n} NEW`}
  if(badge)t.insertAdjacentHTML('beforeend',`<em class="mxbdg" style="background:${kk==='pod'?'#e0281a':'#111'};color:${kk==='pod'?'#fff':'#ffc21a'}">${badge}</em>`)});
 const del=F_LIB.classList.contains('delmode'),pills=R.querySelector('.mxpills');if(pills)pills.insertAdjacentHTML('beforeend',`<span data-act="sp:del" class="mxrm">${del?'✓ DONE':'✕ REMOVE'}</span>`);
 if(del)R.querySelector('.mxlib')&&R.querySelector('.mxlib').classList.add('mxdel');
 const note=R.querySelector('.mxnote');if(note)note.outerHTML=`<div class="mxnote mxam"><div class="mxh2">ADD MUSIC</div><div class="mxamw">
  <b data-act="am:songs" style="background:#ffc21a"><i>♫</i><span>PICK SONGS<small>from this PC</small></span></b>
  <b data-act="am:folder" style="background:#ffc21a"><i>▤</i><span>PICK A FOLDER<small>becomes a playlist</small></span></b>
  <b data-act="am:free" style="background:#2f6be8;color:#fff"><i>⬇</i><span>FREE MUSIC<small>search · 56 genres · preview</small></span></b>
  <b data-act="am:find" style="background:#e0281a;color:#fff"><i>❡</i><span>BOOKS &amp; PODCASTS<small>${subsLine()}</small></span></b>
  <div class="mxdl" id="mxdl"><span id="mxdls"></span><u><i id="mxdlp"></i></u></div></div></div>`;
 dlStrip();if(document.querySelector('#plink.on'))mark()}
function subsLine(){const L=LUSTORE.get('lu_pod_subs',[])||[];let n=0;L.forEach(s=>{const q=PST[s.feed];n+=q&&q.last|0});return n?`${n} new episode${n===1?'':'s'}`:L.length?`${L.length} show${L.length===1?'':'s'} subscribed`:'audiobooks · podcasts'}
// the download strip under the four buttons follows the one on the cube's Add Music face
function dlStrip(){const st=document.getElementById('amst'),pg=document.getElementById('ampg'),box=document.getElementById('mxdl');if(!box)return;const busy=!!(pg&&st);
 box.classList.toggle('on',busy);if(busy){document.getElementById('mxdls').textContent=st.textContent;document.getElementById('mxdlp').style.width=pg.style.width}}
// time played / length under the progress bar, and the strip, kept fresh
setInterval(()=>{if(!mxEl||MODE!=='lu')return;const a=document.getElementById('mxt0'),b=document.getElementById('mxt1');if(a&&b){a.textContent=clock(AU.currentTime);b.textContent=isFinite(AU.duration)?clock(AU.duration):''}dlStrip()},500);
// the four buttons go through the cube's own actions (mxClick hands them to act), and REMOVE / START OVER redraw
const _act=act;act=function(a){const r=_act.apply(this,arguments);const s=String(a);if(mxEl&&MXS===2&&(s==='sp:del'||s==='sp:over'||/^pl:/.test(s)))setTimeout(()=>mxRender(),80);return r};

// ---- the finders, over the left and middle of the window ----
const PL=document.getElementById('plink');
function mark(){if(!PL)return;const on=!!(mxEl&&MXS===2&&MODE==='lu')&&PL.classList.contains('on');PL.classList.toggle('mx',on);
 document.querySelectorAll('.mxam [data-act="am:free"],.mxam [data-act="am:find"]').forEach(b=>b.classList.toggle('on',on&&PL.classList.contains('on')&&!!PL.querySelector(b.dataset.act==='am:free'?'.lkw.music':'.lkw.books')))}
function fit(){if(!PL||!PL.classList.contains('mx')||!PL.classList.contains('on'))return;const w=mxEl&&mxEl.querySelector('.mxw'),lk=PL.querySelector('.lkw');if(!w||!lk)return;
 const r=w.getBoundingClientRect(),k=r.width/MXW;Object.assign(lk.style,{left:r.left+2*k+'px',top:r.top+28*k+'px',width:(MXW-226)*k+'px',height:(MXH-32)*k+'px'})}
(function loop(){fit();requestAnimationFrame(loop)})();
if(window.luFinder){const _o=luFinder.open;luFinder.open=function(){const r=_o.apply(this,arguments);mark();split();fit();return r};
 const _c=luFinder.close;luFinder.close=function(){const r=_c.apply(this,arguments);if(PL){PL.classList.remove('mx');const lk=PL.querySelector('.lkw');if(lk)lk.removeAttribute('style')}mark();return r}}
// the window folding back (or shattering) closes a finder that was open over it
setInterval(()=>{if(PL&&PL.classList.contains('mx')&&(!mxEl||MXS!==2))luFinder.close()},300);
// two columns when it's open over the window: results on the left; picks, the genre grid and your subscriptions on the right
function split(){if(!PL||!PL.classList.contains('mx'))return;const bd=PL.querySelector('.bd'),list=PL.querySelector('#lkl');if(!bd||!list||bd.querySelector('.mxside')||PL.querySelector('.vh'))return;
 const side=document.createElement('div');side.className='mxside';const take=[...list.children].filter(el=>el.matches('.picks,.lkgrid,.subs')||(el.tagName==='H5'&&el.nextElementSibling&&el.nextElementSibling.matches('.picks,.lkgrid')));
 // Free Music with a search on: the picks and the genre grid stay beside the results
 if(!take.length&&luFinder.sheet==='music'&&luFinder.side){side.innerHTML=luFinder.side();
  side.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>luFinder.find(b.dataset.q));side.querySelectorAll('[data-pack]').forEach(b=>b.onclick=()=>luFinder.pack(+b.dataset.pack))}
 else{if(!take.length)return;take.forEach(el=>side.append(el))}
const cols=document.createElement('div');cols.className='mxcols';list.before(cols);cols.append(list,side);
 bd.querySelectorAll('.mxside h5').forEach(h=>h.classList.add('mxh5'))
 if(!list.querySelector('.lr,.ld,.lkback,.note'))list.insertAdjacentHTML('afterbegin','<div class="ld">SEARCH, OR PICK A VIBE ON THE RIGHT →</div>')}
if(PL)new MutationObserver(()=>{if(PL.classList.contains('mx'))split();mark()}).observe(PL,{childList:true});
// a genre tile or a subscription on the right still works (they were wired before they moved)
})();

// ===================== more than one screen =====================
// The desktop cube is one see-through layer over every screen, so "the middle" is the seam between them. The finders,
// the little questions and the new-episode strip go on the screen you clicked on (else the cube's, else the wheel's).
(function(){
let PT=null;addEventListener('pointerdown',e=>{PT=[e.clientX,e.clientY]},true);
// (in a normal window, the window is the one screen)
function scr(){const L=DISPLAYS&&DISPLAYS.length?DISPLAYS:[{x:0,y:0,w:innerWidth,h:innerHeight}];
 const i=!DISPLAYS?0:SCR_I!=null?SCR_I:PT?dispAt(PT[0],PT[1]):cubeOn?dispAt(cpos[0],cpos[1]):Math.min(dockD,L.length-1);return L[i]||L[0]}
// the finder window can be dragged by its title bar; it stays where you put it (on that screen) until Lu Cube closes
let OFF={x:0,y:0},SCR_I=null,DRAG=null;
addEventListener('pointerdown',e=>{const t=e.target.closest&&e.target.closest('#plink.on:not(.mx) .tbar');if(!t||e.target.closest('[data-x]')||e.button>0)return;
 e.preventDefault();const lk=t.closest('.lkw'),r=lk.getBoundingClientRect();DRAG={x:e.clientX,y:e.clientY,ox:OFF.x,oy:OFF.y,w:r.width,h:r.height};lk.classList.add('drag');window.mxDrag=true},true);
addEventListener('pointermove',e=>{if(!DRAG)return;OFF.x=DRAG.ox+e.clientX-DRAG.x;OFF.y=DRAG.oy+e.clientY-DRAG.y});
addEventListener('pointerup',e=>{if(!DRAG)return;DRAG=null;window.mxDrag=false;const lk=document.querySelector('#plink .lkw');if(lk)lk.classList.remove('drag');
 // dropped on another screen: it belongs to that one now
 if(DISPLAYS&&DISPLAYS.length&&lk){const r=lk.getBoundingClientRect(),i=dispAt(r.left+r.width/2,r.top+20),L=DISPLAYS,d0=scr(),d1=L[i];if(d1&&d1!==d0){OFF.x+=(d0.x+d0.w/2)-(d1.x+d1.w/2);OFF.y+=(d0.y+d0.h/2)-(d1.y+d1.h/2);SCR_I=i}}});
let key='';
function place(){const d=scr();const k=[d.x,d.y,d.w,d.h].join(',');
 const lk=document.querySelector('#plink:not(.mx) .lkw'),ins=document.querySelectorAll('#pname .in,#pdel .in'),tb=document.getElementById('ptoast');
 key=k;const cx=d.x+d.w/2,cy=d.y+d.h/2;
 if(lk){const w=Math.min(880,d.w*.94),h=Math.min(700,d.h*.9);
  // keep its title bar on the screen
  OFF.x=Math.max(d.x-cx+w/2-w+120,Math.min(d.x+d.w-cx-w/2+w-120,OFF.x));OFF.y=Math.max(d.y-cy+h/2,Math.min(d.y+d.h-cy+h/2-40,OFF.y));
  Object.assign(lk.style,{left:cx+OFF.x+'px',top:cy+OFF.y+'px',width:w+'px',height:h+'px'})}
 ins.forEach(x=>Object.assign(x.style,{left:cx+'px',top:cy+'px'}));
 if(tb)Object.assign(tb.style,{left:(d.x+d.w-358)+'px',right:'auto',top:(d.y+18)+'px'})}
(function loop(){try{place()}catch(e){}requestAnimationFrame(loop)})();
})();
