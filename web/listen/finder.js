// ===================== LU CUBE · PHONE: the two finders on the Add Music face (the same sources as Lu Link) =====================
//   FREE MUSIC (blue)        search the Internet Archive + Openverse, quick chips, SURPRISE, a BROWSE grid of genres,
//                            and the one-tap LU PICKS (classical). Albums open into their tracks.
//   BOOKS & PODCASTS (red)   AUDIOBOOKS: LibriVox (public domain), a STARTER SHELF, genre chips; a book opens into chapters.
//                            PODCASTS: the public podcast directory; ★ a show and its new episodes download by themselves
//                            (LuPods.java: when the app opens, and every few hours on Wi-Fi with the app closed).
// Tap a row to hear it (a small player at the bottom; the cube's music pauses and comes back). GET downloads it.
// Results load more as you scroll. Downloads go one at a time into a playlist named after the book / show / album.
(function(){
const LN=window.LUNATIVE,AM=window.luAddMusic,LS=window.LUSTORE,N=window.lucall;if(!AM)return;
const $=id=>document.getElementById(id),E=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// some sources send names already HTML-escaped ("Angus &amp; Friends"): turn those back into plain text first
const UN=s=>{if(s==null)return s;s=String(s);if(!/&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(s))return s;const t=document.createElement('textarea');t.innerHTML=s;return t.value};
const vib=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
const IA='https://archive.org/advancedsearch.php?',OV='https://api.openverse.org/v1/audio/?',POD='https://itunes.apple.com/search?';
const lic=u=>{u=String(u||'').toLowerCase();return /publicdomain|\/zero\//.test(u)?'PUBLIC DOMAIN':/by-nc/.test(u)?'CC BY-NC':/by-sa/.test(u)?'CC BY-SA':/creativecommons.*\/by\//.test(u)?'CC BY':/creativecommons/.test(u)?'CREATIVE COMMONS':''};
const ovlic=c=>({cc0:'CC0',pdm:'PUBLIC DOMAIN',by:'CC BY','by-sa':'CC BY-SA','by-nc':'CC BY-NC','by-nd':'CC BY-ND','by-nc-sa':'CC BY-NC-SA','by-nc-nd':'CC BY-NC-ND'}[String(c||'').toLowerCase()]||'CREATIVE COMMONS');
const one=v=>Array.isArray(v)?(v[0]||''):(v||'');
const ext=u=>{const m=/\.(mp3|m4a|aac|ogg|opus|flac|wav)(?:$|\?)/i.exec(String(u).split('#')[0]);return m?'.'+m[1].toLowerCase():'.mp3'};
const mins=d=>{if(!d)return'';if(/:/.test(d))return String(d).replace(/^0(\d):/,'$1:');const s=+d;return s>0?(s>=3600?Math.floor(s/3600)+'h '+Math.round(s%3600/60)+'m':Math.round(s/60)+' min'):''};
const ago=t=>{if(!t)return'not checked yet';const m=Math.round((Date.now()-t)/60000);return m<1?'checked just now':m<60?`checked ${m} min ago`:m<1440?`checked ${Math.round(m/60)} h ago`:`checked ${Math.round(m/1440)} d ago`};

// ---------- Lu Link's lists ----------
const CHIPS=['lofi','piano','boom bap','jazz','ambient','classical','soul','funk','chillhop','instrumental'];
const BROWSE=['lofi','piano','boom bap','jazz','ambient','classical','soul','funk','hip hop','chillhop','instrumental','downtempo','electronic','synthwave','house','techno','drum and bass','trip hop','blues','folk','acoustic','rock','indie','metal','punk','reggae','dub','afrobeat','latin','bossa nova','samba','gospel','r&b','disco','vaporwave','experimental','drone','meditation','nature sounds','field recording','soundtrack','cinematic','orchestral','choral','country','bluegrass','swing','big band','ska','idm','breakbeat','garage','grime','trap','phonk','world'];
const BOOKG=[['Sci-Fi','science fiction OR sci-fi'],['Fantasy','fantasy OR fairy OR mythology OR legend'],['Horror','horror OR ghost OR supernatural OR gothic OR weird'],['Mystery','mystery OR detective OR crime OR murder OR sherlock'],['Romance','romance OR love'],['Adventure','adventure OR exploration OR pirate OR treasure'],['Historical','historical OR history'],['Humor','humor OR humorous OR comic OR satire OR wit'],['Poetry','poetry OR poems OR verse'],['Children','children OR juvenile OR fairy tales OR nursery'],['Short Stories','short stories OR short story'],['Philosophy','philosophy OR philosophical'],['War','war OR military OR battle OR soldier'],['Religion','religion OR bible OR spiritual OR sermon'],['Science','science OR nature OR biology OR astronomy'],['Drama','drama OR play OR plays OR tragedy OR shakespeare'],['Classics','classic OR classics OR literature'],['Travel','travel OR voyage OR journey']];
const PODG=['Comedy','News','True Crime','Technology','Business','Science','History','Sports','Health','Society','Music','Education','Arts','TV & Film'];
const BARC=['var(--r)','var(--o)','var(--y)','var(--b)'];

// ---------- state ----------
let SHEET='music',TAB=LS.get('lu_find_tab','books')==='podcasts'?'podcasts':'books',VIEW=null,MSG='';
const S={music:{q:'',items:[],page:0,more:false,busy:false},books:{q:'',g:'',items:[],page:0,more:false,busy:false},podcasts:{q:'',items:[],all:[],more:false,busy:false}};
const cur=()=>SHEET==='music'?'music':TAB;
const st={};   // row key -> 'queued' | 'nn%' | 'done' | 'part' | 'fail'
const BAD={};  // row keys that couldn't play

// ---------- searches (a page at a time) ----------
async function pMusic(q,page){
 const [ia,ov]=await Promise.allSettled([
  AM.getJSON(IA+new URLSearchParams([['q',`mediatype:(audio) AND (${q}) AND NOT collection:(librivoxaudio) AND NOT collection:(podcasts) AND NOT access-restricted-item:true`],['fl[]','identifier'],['fl[]','title'],['fl[]','creator'],['fl[]','licenseurl'],['sort[]','downloads desc'],['rows','20'],['page',String(page)],['output','json']])),
  page<=10?AM.getJSON(OV+new URLSearchParams({q,page_size:'20',page:String(page)})):Promise.resolve({results:[]})]);
 const A=ia.status==='fulfilled'?((ia.value.response||{}).docs||[]).map(d=>({k:'a:'+d.identifier,kind:'album',id:d.identifier,t:UN(one(d.title))||d.identifier,by:UN(one(d.creator))||'Internet Archive',lic:lic(one(d.licenseurl))||'SEE ITEM',src:'ARCHIVE'})):[];
 const B=ov.status==='fulfilled'?(ov.value.results||[]).map(r=>{const u=r.url||((r.alt_files||[])[0]||{}).url||'';return u?{k:'o:'+(r.id||u),kind:'track',u,t:UN(r.title)||'Untitled',by:UN(r.creator)||'',lic:ovlic(r.license),src:String(r.source||r.provider||'openverse').replace(/_audio$/,'').replace(/_/g,' ').toUpperCase(),dur:r.duration?Math.round(r.duration/1000):0}:null}).filter(Boolean):[];
 if(ia.status==='rejected'&&ov.status==='rejected')throw new Error('offline');
 const out=[];for(let i=0;i<Math.max(A.length,B.length);i++){if(A[i])out.push(A[i]);if(B[i])out.push(B[i])}
 return{items:out,more:A.length===20||B.length===20}}
async function pBooks(q,g,page){const gx=(BOOKG.find(x=>x[0]===g)||[])[1],qq=['collection:(librivoxaudio)',gx?`(${gx})`:'',q?`(title:(${q}) OR creator:(${q}))`:''].filter(Boolean).join(' AND ');
 const j=await AM.getJSON(IA+new URLSearchParams([['q',qq],['fl[]','identifier'],['fl[]','title'],['fl[]','creator'],['fl[]','runtime'],['sort[]','downloads desc'],['rows','30'],['page',String(page)],['output','json']]));
 const r=j.response||{},docs=r.docs||[];
 return{items:docs.map(d=>({k:'b:'+d.identifier,kind:'book',id:d.identifier,t:UN(one(d.title))||d.identifier,by:UN(one(d.creator))||'LibriVox',run:one(d.runtime)})),more:page*30<(+r.numFound||0)}}
async function pPods(q){const j=await AM.getJSON(POD+new URLSearchParams({media:'podcast',entity:'podcast',limit:'200',term:q}));
 return(j.results||[]).filter(r=>r.feedUrl).map(r=>({k:'p:'+r.feedUrl,kind:'show',feed:r.feedUrl,t:r.collectionName||r.trackName,by:r.artistName||'',art:r.artworkUrl600||r.artworkUrl100||'',n:r.trackCount||0,genre:r.primaryGenreName||''}))}

async function search(reset){const T=cur(),s=S[T];if(s.busy)return;if(reset){s.items=[];s.page=0;s.more=false;s.all=[];VIEW=null}
 if((T==='music'||T==='podcasts')&&!s.q.trim()){draw();return}
 s.busy=true;MSG='';draw();
 try{if(T==='podcasts'){if(!s.all.length)s.all=await pPods(s.q.trim());s.items=s.all.slice(0,s.items.length+25);s.more=s.items.length<s.all.length;if(!s.all.length)MSG='NOTHING FOUND · TRY OTHER WORDS'}
  else{s.page++;const r=T==='music'?await pMusic(s.q.trim(),s.page):await pBooks(s.q.trim(),s.g,s.page);const seen=new Set(s.items.map(x=>x.k));s.items=s.items.concat(r.items.filter(x=>!seen.has(x.k)));s.more=r.more&&r.items.length>0;if(!s.items.length)MSG='NOTHING FOUND · TRY OTHER WORDS'}}
 catch(e){MSG='CAN\'T REACH IT · CHECK THE INTERNET'}
 s.busy=false;draw()}

// ---------- inside a book / album / show ----------
async function openView(r){VIEW={r,items:[],busy:true,err:''};stopPreview(true);draw();
 try{if(r.kind==='show'){const x=new DOMParser().parseFromString(await AM.getText(r.feed),'text/xml'),items=[...x.getElementsByTagName('item')];
   const tag=(el,n)=>{const e=el.getElementsByTagName(n)[0];return e?e.textContent.trim():''};
   VIEW.items=items.map(it=>{const en=it.getElementsByTagName('enclosure')[0],u=en&&en.getAttribute('url');if(!u)return null;const ty=(en.getAttribute('type')||'').toLowerCase();
    if(!/audio/.test(ty)&&!/\.(mp3|m4a|aac|ogg|opus)(\?|$)/i.test(u.split('#')[0]))return null;const d=new Date(tag(it,'pubDate'));
    return{k:'e:'+r.feed+':'+(tag(it,'guid')||u),kind:'ep',u,t:tag(it,'title')||'Episode',date:isNaN(d)?'':d.toISOString().slice(0,10),dur:tag(it,'itunes:duration')}}).filter(Boolean);
   if(!r.art){const im=x.getElementsByTagName('itunes:image')[0];if(im)r.art=im.getAttribute('href')||''}}
  else VIEW.items=(await AM.itemFiles(r.id,r.kind==='book')).map((f,i)=>({k:r.k+'#'+i,kind:r.kind==='book'?'chap':'atrack',u:f.u,t:f.title||f.name.replace(/\.[^.]+$/,''),dur:f.len,name:f.name,n:i+1}));
  if(!VIEW.items.length)VIEW.err=r.kind==='show'?'THIS SHOW HAS NO EPISODES TO DOWNLOAD':'NOTHING TO PLAY IN THIS ONE'}
 catch(e){VIEW.err='CAN\'T OPEN IT · CHECK THE INTERNET'}
 VIEW.busy=false;draw()}

// ---------- the download queue (one job at a time; carries on with the panel closed) ----------
const JOBS=[];let RUN=null,PROG='',CURF=null;
// the phone reports how far into the current file it is: the bar and the row's % move inside a file too
if(LN)LN.addListener('dlprogress',e=>{if(!CURF||!RUN||e.dest!==CURF.dest||!(e.total>0))return;const f=(CURF.i+e.got/e.total)/CURF.n;AM.progress(f);st[RUN.k]=Math.round(f*100)+'%';paint()});
const cover=id=>'https://archive.org/services/img/'+encodeURIComponent(id);
const PLK={};   // row key -> playlist it downloads into (so removing a playlist resets its GET buttons)
function enqueue(job){if(st[job.k]&&!/fail|part/.test(st[job.k]))return;if(window.luSetKind&&job.kindTag)luSetKind(job.playlist,job.kindTag);PLK[job.k]=String(job.playlist).toLowerCase();st[job.k]='queued';JOBS.push(job);vib(15);paint();if(!RUN)next()}
async function next(){const job=JOBS.shift();if(!job){RUN=null;PROG='';CURF=null;AM.progress(null);MSG='✓ DOWNLOADS DONE · THEY\'RE ON THE CUBE';AM.status(MSG);try{await window.luRelib()}catch(e){}paint();return}
 RUN=job;const pl=AM.fname(job.playlist).slice(0,60);
 try{let files=job.files;
  if(!files)files=(await AM.itemFiles(job.id,job.kind==='book')).map((f,i,a)=>({u:f.u,dest:String(i+1).padStart(a.length>99?3:2,'0')+' - '+nice(f)}));
  if(!files.length)throw new Error('nothing');
  if(job.cover)try{await LN.downloadFile({url:job.cover,dest:pl+'/cover.jpg'})}catch(e){}
  let got=0;for(let i=0;i<files.length;i++){CURF={dest:pl+'/'+files[i].dest,i,n:files.length};AM.progress(i/files.length);st[job.k]=Math.round(i/files.length*100)+'%';PROG=`${job.label.toUpperCase().slice(0,26)} · ${i+1} OF ${files.length}`+(JOBS.length?` · ${JOBS.length} WAITING`:'');AM.status(PROG);paint();
   for(let t=0;t<3;t++){try{await LN.downloadFile({url:files[i].u,dest:pl+'/'+files[i].dest});got++;break}catch(e){await new Promise(r=>setTimeout(r,1500*(t+1)))}}}
  st[job.k]=got===files.length?'done':got?'part':'fail'}
 catch(e){st[job.k]='fail'}
 paint();next()}
// episode files are named the same way the background downloader names them, so nothing doubles up
// a file's own title when the archive has one (keeping its extension), else its file name
const nice=f=>{const x=(/\.[a-z0-9]+$/i.exec(f.name)||['.mp3'])[0];return f.title?AM.fname(f.title).slice(0,80)+x:AM.fname(f.name)};
const epName=r=>(r.date||'0000-00-00')+' - '+AM.fname(r.t)+ext(r.u);
function get(r){const V=VIEW&&VIEW.r;
 if(r.kind==='book'||r.kind==='album')enqueue({k:r.k,kind:r.kind,id:r.id,label:r.t,playlist:r.t,cover:cover(r.id),kindTag:r.kind==='book'?'book':'music'});
 else if(r.kind==='track')enqueue({k:r.k,label:r.t,playlist:'Found Music',kindTag:'music',files:[{u:r.u,dest:AM.fname((r.by?r.by+' - ':'')+r.t)+ext(r.u)}]});
 else if(r.kind==='ep'&&V)enqueue({k:r.k,label:r.t,playlist:V.t,cover:V.art,kindTag:'pod',files:[{u:r.u,dest:epName(r)}]});
 else if((r.kind==='chap'||r.kind==='atrack')&&V)enqueue({k:r.k,label:r.t,playlist:V.t,cover:cover(V.id),kindTag:r.kind==='chap'?'book':'music',files:[{u:r.u,dest:String(r.n).padStart(VIEW.items.length>99?3:2,'0')+' - '+nice({name:r.name,title:r.t===r.name.replace(/\.[^.]+$/,'')?'':r.t})}]})}

// ---------- listening before you download ----------
const AUP=new Audio();AUP.preload='none';let PV=null,RESUME=false,pvT=0;
function preview(r){if(PV&&PV.k===r.k){if(PV.state==='error')return;if(AUP.paused)AUP.play().catch(()=>{});else AUP.pause();return}
 stopPreview(true);PV={k:r.k,r,state:'loading'};delete BAD[r.k];pvT=0;
 try{if(typeof P!=='undefined'&&P.playing){RESUME=true;act('play')}}catch(e){}
 AUP.src=r.u;AUP.play().catch(()=>{});paintBar()}
function stopPreview(keepResume){try{AUP.pause();AUP.removeAttribute('src');AUP.load()}catch(e){}PV=null;
 if(!keepResume&&RESUME){RESUME=false;try{if(typeof P!=='undefined'&&!P.playing)act('play')}catch(e){}}paintBar()}
const fail=()=>{if(!PV)return;PV.state='error';BAD[PV.k]=1;try{AUP.pause()}catch(e){}paintBar()};
AUP.addEventListener('playing',()=>{if(PV){PV.state='playing';paintBar()}});
AUP.addEventListener('pause',()=>{if(PV&&PV.state!=='error'){PV.state='paused';paintBar()}});
AUP.addEventListener('error',()=>{if(PV&&AUP.getAttribute('src'))fail()});
AUP.addEventListener('ended',()=>{if(PV){PV.state='paused';paintBar()}});
// a stream that never starts (12 s) counts as one that can't play
setInterval(()=>{if(PV&&PV.state==='loading'){if(++pvT>24)fail()}else pvT=0;const g=$('lkpg');if(g&&PV&&isFinite(AUP.duration)&&AUP.duration>0)g.style.width=(AUP.currentTime/AUP.duration*100)+'%'},500);

// ---------- podcast subscriptions ----------
const SUBS=()=>LS.get('lu_pod_subs',[])||[];
let PST={},CHK='';
function setSubs(L){LS.set('lu_pod_subs',L);N('podSubs',{subs:L})}
const isSub=f=>SUBS().some(x=>x.feed===f);
function star(r){const L=SUBS();if(isSub(r.feed)){setSubs(L.filter(x=>x.feed!==r.feed));vib(10);draw();return}
 L.push({feed:r.feed,name:r.t,art:r.art||''});setSubs(L);if(window.luSetKind)luSetKind(r.t,'pod');vib(30);draw();checkSubs(r.feed)}
async function loadStatus(){try{PST=(await N('podStatus'))||{}}catch(e){}}
async function checkSubs(feed,quiet){if(!LN||!LN.podCheck||CHK)return;CHK=feed||'all';if(!quiet){MSG=feed?'GETTING THE NEWEST EPISODE…':'CHECKING ALL YOUR SHOWS…';draw()}
 try{const r=await LN.podCheck(feed?{feed}:{});const n=r.total|0;await loadStatus();
  if(n){toast(n,(r.shows||[]).filter(s=>s.new).map(s=>s.name));try{await window.luRelib()}catch(e){}}
  if(!quiet)MSG=n?`✓ ${n} NEW EPISODE${n===1?'':'S'} DOWNLOADED`:(r.shows||[]).some(s=>s.error)?'SOME SHOWS COULDN\'T BE REACHED':'✓ UP TO DATE'}
 catch(e){if(!quiet)MSG='CAN\'T CHECK RIGHT NOW'}
 CHK='';draw()}

// "3 new episodes" across the top of the screen (tap it to see the podcasts)
const tb=document.createElement('div');tb.id='ptoast';document.body.append(tb);let tbT=0;
function toast(n,names){tb.innerHTML=`<b>▼ ${n} NEW EPISODE${n===1?'':'S'}</b><span>${E(names.slice(0,3).join(' · '))}</span>`;tb.classList.add('on');clearTimeout(tbT);tbT=setTimeout(()=>tb.classList.remove('on'),8000)}
tb.onclick=()=>{tb.classList.remove('on');open('podcasts')};

// ---------- drawing ----------
const box=document.createElement('div');box.id='plink';document.body.append(box);
const SQ=`<i class="sq" style="background:var(--r)" data-x="close" title="close"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.6 2.6l4.8 4.8M7.4 2.6l-4.8 4.8" stroke="#111" stroke-width="1.8"/></svg></i><i class="sq" style="background:var(--y)"></i><i class="sq" style="background:var(--o)"></i>`;
const ICON={book:'❡',album:'▤',track:'♫',ep:'◉',chap:'❡',atrack:'♫',show:'◉'};
function btn(r){const v=st[r.k];if(v==='done')return'<em class="ok">✓ GOT IT</em>';if(v==='part')return'<em>PART · AGAIN</em>';if(v==='fail')return'<em class="no">RETRY</em>';if(v==='queued')return'<em class="wt">WAITING</em>';if(v)return`<em class="on">${v}</em>`;
 if(r.kind==='show')return`<em class="${isSub(r.feed)?'lkstar on':'lkstar'}">★</em>`;return r.kind==='book'||r.kind==='album'?'<em>GET ALL</em>':'<em>GET</em>'}
function sub(r){if(r.kind==='show')return[r.by,r.genre,r.n?r.n+' episodes':''].filter(Boolean).join(' · ');if(r.kind==='ep')return[r.date,mins(r.dur)].filter(Boolean).join(' · ');
 if(r.kind==='chap'||r.kind==='atrack')return['#'+r.n,mins(r.dur)].filter(Boolean).join(' · ');if(r.kind==='book')return[r.by,r.run].filter(Boolean).join(' · ');return[r.by,r.lic,r.src,r.dur?mins(r.dur):''].filter(Boolean).join(' · ')}
const icon=r=>r.art?'':PV&&PV.k===r.k&&PV.state==='playing'?'❚❚':BAD[r.k]?'✕':ICON[r.kind];
function rows(L,tag){return L.map((r,i)=>`<div class="lr${PV&&PV.k===r.k?' pv':''}${BAD[r.k]?' bad':''}" data-l="${tag}" data-i="${i}"><i class="ic k${r.kind}"${r.art?` style="background-image:url('${E(r.art)}')"`:''}>${icon(r)}</i><span><b>${E(r.t)}</b><small>${BAD[r.k]?'✕ CAN\'T PLAY THIS ONE':E(sub(r))}</small></span>${btn(r)}</div>`).join('')}
function packCards(book){const busy=AM.packBusy();return `<div class="picks">${AM.packs.map((p,i)=>[p,i]).filter(([p])=>!!p.book===book).map(([p,i])=>{const on=busy&&busy.i===i,dn=AM.packDone(p.n);
 return `<b class="pick" data-pack="${i}"><i style="background:${BARC[i%4]}">${book?'❡':'♫'}</i><span>${E(p.n)}<small>${E(p.by.replace(/^Audiobook · /,''))}</small></span><em class="${dn&&!on?'ok':on?'on':''}">${on?busy.pct+'%':dn?'▶ PLAY':'GET'}</em></b>`}).join('')}</div>`}
function grid(){return `<div class="lkgrid">${BROWSE.map((g,i)=>`<b data-q="${E(g)}"><span>${E(g)}</span><i>${[5,9,6,12,8,4].map((h,k)=>`<u style="height:${h}px;background:${BARC[(i+k)%4]}"></u>`).join('')}</i></b>`).join('')}</div>`}
function subsBox(){const L=SUBS();if(!L.length)return'';return `<div class="subs"><div class="sh"><b>★ YOUR SUBSCRIPTIONS</b><span class="kb sm" data-x="checkall">↻ CHECK ALL</span></div>${L.map((s,i)=>{const p=PST[s.feed]||{};
 return `<div class="sr" data-sub="${i}"><span><b>${E(s.name)}</b><small>${CHK===s.feed||CHK==='all'?'checking…':ago(p.checked)+(p.last?` · ${p.last} new`:'')}</small></span><i class="kb sm" data-subx="check">↻</i><i class="kb sm" data-subx="del">✕</i></div>`}).join('')}<p class="note">${window.LUPC?'New episodes download by themselves while Lu Cube is open (when it starts, then every 3 hours).':'New episodes download by themselves on Wi-Fi.'} The newest 10 of each show are kept.</p></div>`}
const btnText=r=>{const v=st[r.k];return v==='done'?'✓ GOT IT':v&&v!=='fail'&&v!=='part'?(v==='queued'?'WAITING…':v):r.kind==='book'?'GET THE WHOLE BOOK':'GET ALL'};

function body(){const T=cur(),s=S[T];
 if(VIEW){const r=VIEW.r,show=r.kind==='show';return `<div class="vh"><span class="kb" data-x="back">‹ BACK</span><b>${E(r.t)}</b></div>
  <div class="va">${show?`<span class="kb ${isSub(r.feed)?'on':''}" data-x="star">★ ${isSub(r.feed)?'SUBSCRIBED':'SUBSCRIBE'}</span>${VIEW.items.length?'<span class="kb go" data-x="latest">GET THE LATEST 5</span>':''}`:`<span class="kb go" data-x="getall">${btnText(r)}</span>`}</div>
  ${show&&isSub(r.feed)?'<p class="note">Subscribed: new episodes download by themselves.</p>':''}
  <div class="list" id="lkl">${VIEW.busy?'<div class="ld">OPENING…</div>':VIEW.err?`<div class="ld">${E(VIEW.err)}</div>`:rows(VIEW.items,'v')}</div>`}
 const ph=T==='music'?'search free music… (lofi piano, boom bap…)':T==='books'?'title or author…':'search podcasts by name or topic…';
 const form=`<form class="sb"><input id="lkq" type="search" enterkeyhint="search" placeholder="${ph}" value="${E(s.q)}" autocomplete="off"><button class="kb go" type="submit">SEARCH</button>${T==='music'?'<span class="kb" data-x="surprise" title="surprise me">↻</span>':''}</form>`;
 const chips=T==='music'?(window.LUPC?BROWSE:CHIPS).map(c=>`<b data-q="${E(c)}" class="${s.q===c?'on':''}">${E(c)}</b>`).join(''):T==='books'?BOOKG.map(([g])=>`<b data-g="${E(g)}" class="${s.g===g?'on':''}">${E(g)}</b>`).join(''):PODG.map(g=>`<b data-q="${E(g)}" class="${s.q===g?'on':''}">${E(g)}</b>`).join('');
 let inner='';
 if(T==='music'&&!s.q.trim())inner=`<h5>LU PICKS · ONE TAP</h5>${packCards(false)}<h5>BROWSE · DIG BY VIBE</h5>${grid()}`;
 else{if(T==='books'&&!s.q.trim()&&!s.g)inner=`<h5>STARTER SHELF · ONE TAP</h5>${packCards(true)}<h5>MOST LISTENED</h5>`;
  if(T==='podcasts')inner=subsBox()+(s.q.trim()?'':'<p class="note">Search any podcast, or tap a genre. ★ a show and its new episodes download by themselves.</p>');
  if(T==='music')inner=`<div class="lkback"><b data-x="browse">‹ BROWSE</b><span>${E(s.q.toUpperCase())}</span></div>`;
  inner+=rows(s.items,'s')+(s.busy?'<div class="ld">LOADING…</div>':s.more?'<div class="ld">MORE…</div>':'')}
 return form+`<div class="lkc">${chips}</div><div class="list" id="lkl">${inner}</div>`}
function bar(){if(!PV)return'';const r=PV.r,s=PV.state;return `<div class="lkpv ${s}"><i class="kb" data-x="pvplay">${s==='playing'?'❚❚':s==='error'?'✕':s==='loading'?'…':'▶'}</i><span><b>${E(r.t)}</b><small>${s==='error'?'✕ CAN\'T PLAY THIS ONE':s==='loading'?'LOADING…':'PREVIEW · NOT SAVED YET'}</small><u><i id="lkpg"></i></u></span>${s==='error'?'':'<i class="kb go" data-x="pvget">GET</i>'}<i class="kb" data-x="pvclose">✕</i></div>`}

function draw(){if(!box.classList.contains('on'))return;const old=$('lkl'),sc=old?old.scrollTop:0,key=cur()+(VIEW?VIEW.r.k:''),keep=box.dataset.k===key;
 const title=SHEET==='music'?'FREE MUSIC // SEARCH · BROWSE':'BOOKS &amp; PODCASTS';
 box.innerHTML=`<div class="lkw ${SHEET}"><div class="tbar">${SQ}<b>${title}</b></div>
  ${SHEET==='books'?`<div class="tabs"><b data-tab="books" class="${TAB==='books'?'on':''}">❡ AUDIOBOOKS</b><b data-tab="podcasts" class="${TAB==='podcasts'?'on':''}">◉ PODCASTS</b></div>`:''}
  <div class="bd">${body()}</div><div id="lkbar">${bar()}</div><div class="foot" id="lkst">${E(RUN?PROG:MSG)}</div></div>`;
 box.dataset.k=key;const l=$('lkl');if(l&&keep)l.scrollTop=sc;wire()}
// small changes (progress, which row is playing) without losing your place in the list
function paint(){if(!box.classList.contains('on'))return;const T=cur();box.querySelectorAll('.lr').forEach(el=>{const L=el.dataset.l==='v'?(VIEW?VIEW.items:[]):S[T].items,r=L[+el.dataset.i];if(!r)return;
  const em=el.querySelector('em'),t=document.createElement('div');t.innerHTML=btn(r);if(em&&t.firstChild&&em.outerHTML!==t.firstChild.outerHTML)em.replaceWith(t.firstChild);
  el.classList.toggle('pv',!!(PV&&PV.k===r.k));el.classList.toggle('bad',!!BAD[r.k]);const ic=el.querySelector('.ic');if(ic&&!r.art&&ic.textContent!==icon(r))ic.textContent=icon(r);
  const sm=el.querySelector('small'),tx=BAD[r.k]?'✕ CAN\'T PLAY THIS ONE':sub(r);if(sm&&sm.textContent!==tx)sm.textContent=tx});
 const busy=AM.packBusy();box.querySelectorAll('[data-pack]').forEach(b=>{const i=+b.dataset.pack,p=AM.packs[i],em=b.querySelector('em'),on=busy&&busy.i===i,dn=AM.packDone(p.n);em.className=dn&&!on?'ok':on?'on':'';em.textContent=on?busy.pct+'%':dn?'▶ PLAY':'GET'});
 const ga=box.querySelector('[data-x="getall"]');if(ga&&VIEW)ga.textContent=btnText(VIEW.r);
 const f=$('lkst');if(f)f.textContent=RUN?PROG:MSG}
function paintBar(){const b=$('lkbar');if(b){b.innerHTML=bar();b.querySelectorAll('[data-x]').forEach(x=>x.onclick=e=>{e.stopPropagation();cmd(x.dataset.x)})}paint()}

function cmd(x){const T=cur(),s=S[T];
 if(x==='close')close();else if(x==='back'){VIEW=null;stopPreview(true);draw()}
 else if(x==='browse'){s.q='';s.items=[];s.more=false;VIEW=null;draw()}
 else if(x==='surprise'){s.q=BROWSE[Math.floor(Math.random()*BROWSE.length)];search(true)}
 else if(x==='getall'&&VIEW)get(VIEW.r);
 else if(x==='latest'&&VIEW)VIEW.items.slice(0,5).forEach(get);
 else if(x==='star'&&VIEW)star(VIEW.r);
 else if(x==='checkall')checkSubs();
 else if(x==='pvplay'&&PV){if(PV.state==='error')return;if(AUP.paused)AUP.play().catch(()=>{});else AUP.pause()}
 else if(x==='pvget'&&PV)get(PV.r);
 else if(x==='pvclose')stopPreview()}
function wire(){box.querySelectorAll('[data-x]').forEach(b=>b.onclick=e=>{e.stopPropagation();cmd(b.dataset.x)});
 box.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{TAB=b.dataset.tab;LS.set('lu_find_tab',TAB);VIEW=null;MSG='';stopPreview();draw();if(TAB==='books'&&!S.books.items.length)search(true);if(TAB==='podcasts')loadStatus().then(draw)});
 const f=box.querySelector('form');if(f)f.onsubmit=e=>{e.preventDefault();S[cur()].q=$('lkq').value;$('lkq').blur();search(true)};
 box.querySelectorAll('.lkc [data-q],.lkgrid [data-q]').forEach(b=>b.onclick=()=>{const s=S[cur()];s.q=s.q===b.dataset.q&&b.closest('.lkc')?'':b.dataset.q;search(true)});
 box.querySelectorAll('.lkc [data-g]').forEach(b=>b.onclick=()=>{const s=S.books;s.g=s.g===b.dataset.g?'':b.dataset.g;search(true)});
 box.querySelectorAll('[data-pack]').forEach(b=>b.onclick=()=>{const i=+b.dataset.pack,p=AM.packs[i];if(AM.packDone(p.n)&&!AM.packBusy()){close();AM.land(p.n);return}AM.getPack(i);setTimeout(paint,50)});
 box.querySelectorAll('.lr').forEach(el=>el.onclick=e=>{const L=el.dataset.l==='v'?VIEW.items:S[cur()].items,r=L[+el.dataset.i];if(!r)return;const onBtn=!!e.target.closest('em');
  if(r.kind==='show'){if(onBtn)star(r);else openView(r);return}
  if(onBtn){get(r);return}
  if(r.kind==='book'||r.kind==='album')openView(r);else preview(r)});
 box.querySelectorAll('[data-sub]').forEach(el=>el.onclick=e=>{const s=SUBS()[+el.dataset.sub];if(!s)return;const x=e.target.closest('[data-subx]');
  if(x&&x.dataset.subx==='check')checkSubs(s.feed);else if(x&&x.dataset.subx==='del'){setSubs(SUBS().filter(y=>y.feed!==s.feed));draw()}else openView({k:'p:'+s.feed,kind:'show',feed:s.feed,t:s.name,art:s.art})});
 const l=$('lkl');if(l)l.onscroll=()=>{const s=S[cur()];if(!VIEW&&s.more&&!s.busy&&l.scrollTop+l.clientHeight>l.scrollHeight-400)search(false)}}

let opened=0;
function open(which){opened=performance.now();if(which==='music')SHEET='music';else{SHEET='books';if(which==='podcasts'||which==='books')TAB=which}
 VIEW=null;MSG=RUN?'':MSG;box.classList.add('on');draw();if(cur()==='books'&&!S.books.items.length)search(true);if(cur()==='podcasts')loadStatus().then(draw)}
function close(){box.classList.remove('on');stopPreview()}
// the tap that opened the panel also sends a click a moment later, landing on whatever is now under the finger
// (a downloaded pick would start playing): swallow clicks for the first moment
box.addEventListener('click',e=>{if(performance.now()-opened<450){e.stopPropagation();e.preventDefault();return}if(e.target===box)close()},true);

// ---------- on start: what arrived while the app was closed, then a fresh check (Wi-Fi), and every hour after ----------
const startPods=async()=>{if(!LN)return;N('podSubs',{subs:SUBS()});
 try{const r=await N('podNews'),L=(r&&r.news)||[];if(L.length){const n=L.reduce((a,x)=>a+(x.n|0),0),names=[...new Set(L.map(x=>x.show))];toast(n,names);try{await window.luRelib()}catch(e){}}}catch(e){}
 const go=()=>{if(SUBS().length&&!(window.LUNET&&window.LUNET.type==='cellular'))checkSubs(null,true)};setTimeout(go,4000);setInterval(go,60*60*1000)};
if(window.LU_INTRO_ON)addEventListener('luintroend',startPods,{once:true});else setTimeout(startPods,1500);

// (the PC's unfolded window shows the picks and the genre grid beside the results: it asks for them here)
const side=()=>`<h5>LU PICKS · ONE TAP</h5>${packCards(false)}<h5>BROWSE · DIG BY VIBE</h5>${grid()}`;
function find(q){const s=S[cur()];s.q=q;search(true)}
function pack(i){const p=AM.packs[i];if(!p)return;if(AM.packDone(p.n)&&!AM.packBusy()){close();AM.land(p.n);return}AM.getPack(i);setTimeout(paint,50)}
window.luFinder={toast,side,find,pack,get sheet(){return SHEET==='music'?'music':TAB},forget(name){const n=String(name).toLowerCase();for(const k in PLK)if(PLK[k]===n){delete st[k];delete PLK[k]}paint()},open,close,refresh:paint,get busy(){return !!RUN}};
})();
