// ===================== LU CUBE · ADD MUSIC (the Lu cube's top face, where the lyrics used to be; Android and the PC) =====================
// Three ways in, all ending in a playlist on the cube:
//   ♫ PICK SONGS / ▤ PICK A FOLDER: Android's file picker (Downloads, Drive, a USB stick…); the songs are copied in.
//   ⬇ FREE MUSIC: public-domain classical recordings and LibriVox audiobooks from the Internet Archive, one tap each.
//   Share: any app's Share button → Lu Cube.
// Everything lands in the app's own "Lu Cube/<playlist>" folder, the same place Phone Sync puts songs from the PC.
(function(){
const N=window.lucall,LS=window.LUSTORE,LN=window.LUNATIVE;
const $=id=>document.getElementById(id),E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const vib=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};

// ---------- the free music: only public domain / CC0 recordings, and public-domain LibriVox readings ----------
const PACKS=[
 {n:'Goldberg Variations',by:'Bach · Kimiko Ishizaka, piano',ids:['OpenGoldbergVariations'],lic:'CC0'},
 {n:'Symphonies',by:'Mozart 40 · Mahler 5',ids:['Mozart_Symphony_40','Mahler_Symphony_5'],lic:'Public domain'},
 {n:'Overtures & Showpieces',by:'William Tell · Valkyries · Rondo alla Turca',ids:['WilliamTellOverture_414','RideOfTheValkyries','RondoAllaTurca_201401'],lic:'Public domain'},
 {n:'Sherlock Holmes',by:'Audiobook · Arthur Conan Doyle',book:'The Adventures of Sherlock Holmes'},
 {n:'Alice in Wonderland',by:'Audiobook · Lewis Carroll',book:"Alice's Adventures in Wonderland"},
 {n:'Treasure Island',by:'Audiobook · Robert Louis Stevenson',book:'Treasure Island'},
 {n:'The Time Machine',by:'Audiobook · H. G. Wells',book:'The Time Machine'},
 {n:'Frankenstein',by:'Audiobook · Mary Shelley',book:'Frankenstein'},
 {n:'The Art of War',by:'Audiobook · Sun Tzu',book:'The Art of War'},
];
let VIEW='home',STATUS='',BUSY=null,ARMED=-1;   // BUSY: {i, done, total} while a pack downloads
const DONE=()=>LS.get('lu_packs',{})||{};
const getText=async url=>{if(LN&&LN.httpText){const r=await LN.httpText({url});return r.text}const r=await fetch(url);if(!r.ok)throw new Error(String(r.status));return r.text()};
const getJSON=async url=>JSON.parse(await getText(url));
const tnum=f=>{const m=/^\d+/.exec(String(f.track||''))||/(\d+)/.exec(f.name);return m?parseInt(m[1]||m[0]):9999};
const fname=s=>String(s||'').replace(/[\\/:*?"<>|\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,90)||'track';
// which files of an Internet Archive item to take: its mp3s (the 64 kbps ones for audiobooks), in track order
async function itemFiles(id,book){const m=await getJSON('https://archive.org/metadata/'+encodeURIComponent(id)),files=m.files||[];
 const ok=f=>!/_sample|spectrogram|\bpreview\b/i.test(f.name);
 let pick=book?files.filter(f=>f.format==='64Kbps MP3'&&ok(f)):[];
 if(!pick.length)pick=files.filter(f=>f.format==='VBR MP3'&&ok(f));
 if(!pick.length)pick=files.filter(f=>/\.mp3$/i.test(f.name)&&ok(f));
 if(!pick.length)pick=files.filter(f=>/\.ogg$/i.test(f.name)&&ok(f));
 pick.sort((a,b)=>tnum(a)-tnum(b)||(a.name<b.name?-1:1));
 return pick.map(f=>({u:'https://archive.org/download/'+encodeURIComponent(id)+'/'+f.name.split('/').map(encodeURIComponent).join('/'),name:f.name.split('/').pop(),title:f.title||'',len:f.length||'',size:+f.size||0}))}
async function findBook(title){const q=`collection:(librivoxaudio) AND title:("${title.replace(/"/g,'')}") AND mediatype:(audio)`;
 const j=await getJSON('https://archive.org/advancedsearch.php?'+new URLSearchParams([['q',q],['fl[]','identifier'],['sort[]','downloads desc'],['rows','1'],['output','json']]));
 const d=((j.response||{}).docs||[])[0];if(!d)throw new Error('not found');return d.identifier}

async function getPack(i){const pk=PACKS[i];if(BUSY||!pk)return;
 if(window.LUNET&&window.LUNET.type==='cellular'&&ARMED!==i){ARMED=i;STATUS='ON MOBILE DATA · TAP AGAIN TO DOWNLOAD ANYWAY';draw();return}
 ARMED=-1;BUSY={i,done:0,total:0};if(window.luSetKind)luSetKind(pk.n,pk.book?'book':'music');STATUS='FINDING '+pk.n.toUpperCase()+'…';draw();
 try{const ids=pk.book?[await findBook(pk.book)]:pk.ids;let list=[];for(const id of ids)list=list.concat(await itemFiles(id,!!pk.book));
  if(!list.length)throw new Error('no songs found');
  const w=String(list.length).length<3?2:3,have=(DONE()[pk.n+'#files'])||{};BUSY.total=list.length;
  // the folder's picture (the cube's cover face) first, then the tracks
  try{await LN.downloadFile({url:'https://archive.org/services/img/'+encodeURIComponent(ids[0]),dest:pk.n+'/cover.jpg'})}catch(e){}
  let got=0;for(let k=0;k<list.length;k++){const f=list[k],dest=pk.n+'/'+String(k+1).padStart(w,'0')+' - '+(f.title?fname(f.title).slice(0,80)+((/\.[a-z0-9]+$/i.exec(f.name)||['.mp3'])[0]):fname(f.name));BUSY.done=k;STATUS=`${pk.n.toUpperCase()} · ${k+1} OF ${list.length}`;draw(true);
   if(have[dest]){got++;continue}
   for(let t=0;t<3;t++){try{await LN.downloadFile({url:f.u,dest});have[dest]=1;got++;break}catch(e){await new Promise(r=>setTimeout(r,1500*(t+1)))}}
   if(k%4===3){const d=DONE();d[pk.n+'#files']=have;LS.set('lu_packs',d)}}
  const d=DONE();d[pk.n+'#files']=have;if(got===list.length)d[pk.n]=1;LS.set('lu_packs',d);
  STATUS=got===list.length?`✓ ${pk.n.toUpperCase()} ADDED · ${got} TRACKS`:`${got} OF ${list.length} DOWNLOADED · TAP IT AGAIN TO FINISH`;
  BUSY=null;draw();window.luFinder&&luFinder.refresh();await landOn(pk.n)}
 catch(e){BUSY=null;STATUS='COULDN\'T GET IT · '+(navigator.onLine===false?'NO INTERNET':'TRY AGAIN IN A BIT');draw();window.luFinder&&luFinder.refresh()}}

// ---------- picking and sharing ----------
async function pick(folder){if(!LN||BUSY)return;STATUS='';let r;try{r=await LN.pickMusic({folder})}catch(e){STATUS='NO FILE PICKER ON THIS PHONE';draw();return}
 if(!r||r.cancelled)return;if(!r.count){STATUS=folder?'NO SONGS IN THAT FOLDER':'THOSE AREN\'T SONGS';draw();N('dropPending');return}
 askName(r.count,r.title||'')}
if(LN)LN.addListener('shared',r=>{if(!r||!r.count){STATUS='NOTHING TO ADD IN WHAT WAS SHARED';return}
 const go=()=>{try{if(typeof MODE!=='undefined'&&MODE!=='lu'&&window.luSetMode)window.luSetMode('lu')}catch(e){}askName(r.count,'')};
 if(window.LU_INTRO_ON)addEventListener('luintroend',go,{once:true});else setTimeout(go,300)});
if(LN)LN.addListener('import',e=>{if(!BUSY||BUSY.i!=='pick')return;BUSY.done=e.done;BUSY.total=e.total;STATUS=`COPYING ${Math.min(e.done+1,e.total)} OF ${e.total}`;draw(true)});

// name the playlist: a new name, or one you already added to (tap it)
const box=document.createElement('div');box.id='pname';document.body.append(box);let nameAt=0;
// the tap that opened the sheet also sends a click a moment later: it mustn't land on whatever is under the finger
box.addEventListener('click',e=>{if(performance.now()-nameAt<450){e.stopPropagation();e.preventDefault()}},true);
async function askName(count,title){let mine=[];try{mine=((await N('addedPlaylists')).playlists||[])}catch(e){}
 box.innerHTML=`<div class="in"><div class="hd"><b>ADD ${count} SONG${count===1?'':'S'}</b><i data-x="no">✕</i></div>
  <p>Which playlist do they go in? Each playlist is one on the cube.</p>
  <input id="pnin" maxlength="60" placeholder="PLAYLIST NAME" value="${E(title)}" autocomplete="off">
  ${mine.length?`<h4>OR ADD TO ONE YOU MADE</h4><div class="chips">${mine.slice(0,12).map(n=>`<b data-n="${E(n)}">${E(n)}</b>`).join('')}</div>`:''}
  <div class="row"><span class="btn go" data-x="ok">＋ ADD THEM</span><span class="btn" data-x="no">CANCEL</span></div></div>`;
 box.classList.add('on');const opened=nameAt=performance.now(),inp=$('pnin');setTimeout(()=>{if(!title)inp.focus()},120);
 box.querySelectorAll('.chips b').forEach(b=>b.onclick=()=>{inp.value=b.dataset.n;box.querySelectorAll('.chips b').forEach(x=>x.classList.toggle('on',x===b))});
 inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();done(true)}};
 box.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>done(b.dataset.x==='ok'));
 // the tap that opened it also sends a click a moment later: that one mustn't close it again
 box.onclick=e=>{if(e.target===box&&performance.now()-opened>600)done(false)};
 async function done(ok){const name=inp.value.trim()||title||'Added';inp.blur();box.classList.remove('on');
  if(!ok){N('dropPending');return}
  BUSY={i:'pick',done:0,total:count};STATUS='COPYING…';VIEW='home';draw();goAdd();
  try{if(window.luUnhide)luUnhide(name);const r=await LN.importPending({playlist:name});BUSY=null;STATUS=`✓ ${r.songs} SONG${r.songs===1?'':'S'} IN ${String(r.playlist).toUpperCase()}`;draw();await landOn(r.playlist)}
  catch(e){BUSY=null;STATUS='COULDN\'T COPY THEM · '+String(e&&e.message||'').toUpperCase().slice(0,40);draw()}}}

// the new playlist turns up on the cube (the phone's music library takes a moment), and starts playing
async function landOn(name){for(let t=0;t<6;t++){try{await window.luRelib()}catch(e){}const i=PLS.findIndex(p=>!p.fav&&String(p.n).toLowerCase()===String(name).toLowerCase());
  if(i>=0){vib(30);act('pl:'+i);setTimeout(()=>goFace('NOW PLAYING'),700);return}await new Promise(r=>setTimeout(r,1500))}}
const goAdd=()=>{try{if(front()!=='LYRICS')goFace('LYRICS')}catch(e){}};

// ---------- the face ----------
const PC=!!window.LUPC;
const NOTE=PC?'OR DROP FOLDERS OF SONGS INTO YOUR MUSIC FOLDER':'OR SHARE SONGS TO LU CUBE FROM ANY APP';
let FP=null;   // the finders' download progress, 0..1, or null
function face(){const busy=!!BUSY||FP!=null,pct=BUSY&&BUSY.total?Math.round(BUSY.done/BUSY.total*100):FP!=null?Math.round(FP*100):0;
 const bar=busy?`<div class="ambar"><i id="ampg" style="width:${pct}%"></i></div>`:'';
 const foot=`<div class="amft"><span class="pill" data-act="go:NOW PLAYING">BACK TO PLAYER</span>${PC?'':'<span class="pill" data-act="blocks" style="background:var(--y);color:#111">▦ LU BLOCKS</span>'}</div>`;
 return TB('ADD MUSIC','var(--o)','#111')+`<div class="amw">
  <b class="amb" data-act="am:songs" style="background:var(--y)"><u>♫</u>PICK SONGS<small>${PC?'FROM THIS PC, A USB STICK, A DRIVE…':'FROM DOWNLOADS, DRIVE, A USB STICK…'}</small></b>
  <b class="amb" data-act="am:folder" style="background:#fff"><u>▤</u>PICK A FOLDER<small>THE WHOLE FOLDER BECOMES A PLAYLIST</small></b>
  <b class="amb" data-act="am:free" style="background:var(--b);color:#fff"><u>⬇</u>FREE MUSIC<small>SEARCH · BROWSE GENRES · PREVIEW</small></b>
  <b class="amb" data-act="am:find" style="background:var(--r);color:#fff"><u>❡</u>BOOKS &amp; PODCASTS<small>AUDIOBOOKS · PODCASTS THAT DOWNLOAD THEMSELVES</small></b>
  <div class="amn" id="amst">${E(STATUS||NOTE)}</div>${bar}</div>${foot}`}
// a quick update (progress) without redrawing the whole face
function draw(quick){if(typeof MODE==='undefined'||MODE!=='lu')return;const st=$('amst'),pg=$('ampg');
 if(quick&&st&&pg&&BUSY){st.textContent=STATUS;pg.style.width=(BUSY.total?BUSY.done/BUSY.total*100:0)+'%';window.luFinder&&luFinder.refresh();return}
 try{renderFaces()}catch(e){}}

const _lrf=luRenderFaces;
luRenderFaces=function(){_lrf.apply(this,arguments);F_LYR.style.background='var(--g)';F_LYR.innerHTML=face()};
// the faces may already have been drawn before this file loaded (the library can arrive first): draw them again so this face shows
try{draw()}catch(e){}

const _act=act;act=function(a){const p=String(a).split(':');
 if(p[0]!=='am')return _act.apply(this,arguments);
 if(p[1]==='find'){window.luFinder&&luFinder.open('books');return}
 if(p[1]==='free'){window.luFinder&&luFinder.open('music');return}
 if(p[1]==='songs')pick(false);else if(p[1]==='folder')pick(true);
 else if(p[1]==='home'){VIEW='home';if(!BUSY)STATUS='';draw()}
 else if(p[1]==='get'){const i=+p[2],pk=PACKS[i];if(!pk)return;if(DONE()[pk.n]&&!BUSY){landOn(pk.n);return}getPack(i)}};
window.luAddMusic={progress(f){const was=FP!=null;FP=f==null?null:Math.max(0,Math.min(1,f));const pg=$('ampg');if(pg&&FP!=null&&was){pg.style.width=FP*100+'%';return}draw()},getPack,packBusy:()=>BUSY&&typeof BUSY.i==='number'?{i:BUSY.i,pct:BUSY.total?Math.round(BUSY.done/BUSY.total*100):0}:null,packDone:n=>!!DONE()[n],status(t){STATUS=t;const st=$('amst');if(st&&MODE==='lu')st.textContent=t},land:landOn,fname,getJSON,getText,itemFiles,findBook,open(free){VIEW=free?'free':'home';draw();goAdd()},packs:PACKS};
})();
