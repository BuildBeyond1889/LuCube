// ===================== LU CUBE · PHONE: the opening =====================
// The unfolded cube folds itself up like origami (the white square swings up twice to become the lid),
// hops over like a loading dot, the screen floods yellow, LISTEN TO THE UNIVERSE rises, then collapses to LU,
// and the logo flies into the app's header. About four seconds; tap anywhere to skip.
(function(){
const S=84,H=S/2;   // face size
const NS='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
const ov=document.createElement('div');ov.id='lintro';
const icon={
 play:'<svg viewBox="0 0 24 24"><polygon points="7,4 7,20 20,12" fill="#111"/></svg>',
 list:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
 cover:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.8" fill="#fff"/></svg>',
 grid:'<svg viewBox="0 0 24 24" fill="#111"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg>',
 lyr:'<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="17" x2="19" y2="17"/></svg>',
 bars:'<svg viewBox="0 0 24 24" fill="#111"><rect x="4" y="15" width="3" height="5"/><rect x="9" y="11" width="3" height="9"/><rect x="14" y="7" width="3" height="13"/><rect x="19" y="3" width="3" height="17"/></svg>'};
const face=(cls,bg,ic,inner)=>`<div class="lf ${cls}" style="background:${bg}"><i>${icon[ic]}</i>${inner||''}</div>`;
const WORDS='LISTEN TO THE UNIVERSE';
ov.innerHTML=`<div class="li-flood" id="liFlood"></div>
 <div class="li-mover" id="liMover"><div class="li-hop" id="liHop"><div class="li-scene"><div class="li-cube" id="liCube">
  ${face('lf-base','#ff7a1a','cover')}
  ${face('lf-top','#ffc21a','play')}
  ${face('lf-left','#2f6be8','list')}
  ${face('lf-right','#cfd6df','grid')}
  ${face('lf-front','#e0281a','lyr',face('lf-lid','#ffffff','bars'))}
 </div></div></div></div>
 <div class="li-text" id="liText">${[...WORDS].map((c,i)=>`<span data-i="${i}">${c===' '?'&nbsp;':c}</span>`).join('')}</div>
 <div class="li-final" id="liFinal" aria-hidden="true"><span id="liFL">L</span><span id="liFU">U</span><i id="liFC"></i></div>
 <div class="li-skip">TAP TO SKIP</div>`;
document.body.append(ov);document.body.classList.add('lintro-on');
const q=s=>ov.querySelector(s),cube=$('liCube'),mover=$('liMover'),hop=$('liHop'),flood=$('liFlood'),text=$('liText');
const spans=[...text.children],L=spans[0],U=spans[WORDS.indexOf('UNIVERSE')];
const W=innerWidth,HH=innerHeight;
let done=false,anims=[];
const A=(el,kf,opt)=>{const a=el.animate(kf,Object.assign({fill:'forwards',easing:'cubic-bezier(.65,0,.35,1)'},opt));anims.push(a);return a};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// where things end up: the words centred across the screen, then the LU logo (big, like the yellow poster)
function layout(){
 let fs=48;text.style.fontSize=fs+'px';const tw=text.scrollWidth;fs=Math.min(48,fs*(W-40-62)/tw);text.style.fontSize=fs+'px';
 const fin=$('liFinal');fin.style.fontSize=Math.min(W*.36,170)+'px';
 return{fs}}
async function run(){
 try{await Promise.race([document.fonts.load('400 40px Anton'),wait(500)])}catch(e){}
 if(done)return;layout();
 // the camera starts square-on to the flat net and ends at the logo's angle
 const G0='rotateX(0deg) rotateY(0deg) rotateX(0deg)',G1='rotateX(-30deg) rotateY(45deg) rotateX(90deg)';
 cube.style.transform=G0;
 A(q('.li-scene'),[{opacity:0,transform:'scale(.7)'},{opacity:1,transform:'scale(1)'}],{duration:320,easing:'cubic-bezier(.2,.8,.2,1)'});
 await wait(380);if(done)return;
 // origami: the walls fold up off the floor one after another, then the lid swings over
 const fold=(sel,from,to,delay,dur)=>A(q(sel),[{transform:from},{transform:to}],{duration:dur||420,delay,easing:'cubic-bezier(.5,0,.25,1)'});
 fold('.lf-left','translateX(-84px) rotateY(0deg)','translateX(-84px) rotateY(90deg)',0);
 fold('.lf-right','translateX(84px) rotateY(0deg)','translateX(84px) rotateY(-90deg)',90);
 fold('.lf-top','translateY(-84px) rotateX(0deg)','translateY(-84px) rotateX(-90deg)',180);
 fold('.lf-front','translateY(84px) rotateX(0deg)','translateY(84px) rotateX(90deg)',270);
 fold('.lf-lid','translateY(84px) rotateX(0deg)','translateY(84px) rotateX(90deg)',600,380);
 A(cube,[{transform:G0},{transform:G1}],{duration:1050,delay:60,easing:'cubic-bezier(.55,0,.3,1)'});
 await wait(1080);if(done)return;
 // the words' line, and the cube's spot at its far right end (a little raised, like an exponent)
 const tr=text.getBoundingClientRect(),tFs=parseFloat(text.style.fontSize);
 const textTop=HH*.5-tr.height/2,targetScale=Math.max(.32,tFs*1.05/(S*1.42));
 const cx0=W/2,cy0=HH*.42,cx1=W/2+tr.width/2+S*1.42*targetScale*.5-8,cy1=textTop+S*1.42*targetScale*.32;
 // two hops, like the old loading-screen dot: up, land, squash, up again
 const xs=[cx0,cx0+(cx1-cx0)*.55,cx1],ys=[cy0,cy0+(cy1-cy0)*.55,cy1],sc=[1,1-(1-targetScale)*.55,targetScale];
 mover.style.transform=`translate(${cx0}px,${cy0}px) scale(1)`;
 ov.querySelectorAll('.lf>i').forEach(i=>A(i,[{opacity:1},{opacity:0}],{duration:420,easing:'ease-out'}));  // the landed cube is the plain logo cube
 for(let h=0;h<2;h++){
  A(mover,[{transform:`translate(${xs[h]}px,${ys[h]}px) scale(${sc[h]})`},{transform:`translate(${xs[h+1]}px,${ys[h+1]}px) scale(${sc[h+1]})`}],{duration:380,easing:'cubic-bezier(.3,.1,.4,1)'});
  A(hop,[{transform:'translateY(0) scale(1,1)'},{transform:'translateY(0) scale(1.12,.86)',offset:.08},{transform:`translateY(${-(70-h*24)}px) scale(.94,1.08)`,offset:.45},{transform:'translateY(0) scale(1,1)',offset:.86},{transform:'translateY(0) scale(1.14,.84)',offset:.93},{transform:'translateY(0) scale(1,1)'}],{duration:380,easing:'linear'});
  if(h===0){setTimeout(()=>{if(done)return;flood.style.setProperty('--x',xs[1]+'px');flood.style.setProperty('--y',ys[1]+'px');
   A(flood,[{clipPath:`circle(0px at ${xs[1]}px ${ys[1]}px)`},{clipPath:`circle(${Math.hypot(W,HH)}px at ${xs[1]}px ${ys[1]}px)`}],{duration:560,easing:'cubic-bezier(.3,0,.2,1)'});
   A(text,[{transform:`translate(-50%,${HH*.6}px)`,opacity:0},{transform:'translate(-50%,-50%)',opacity:1}],{duration:620,easing:'cubic-bezier(.2,.9,.25,1)'})},300)}
  await wait(400);if(done)return}
 // one pulse
 A(hop,[{transform:'scale(1)'},{transform:'scale(1.22)'},{transform:'scale(1)'}],{duration:300,easing:'cubic-bezier(.3,0,.3,1)'});
 await wait(420);if(done)return;
 // the words collapse into LU, and the cube settles in as the exponent
 const fin=$('liFinal'),fL=$('liFL').getBoundingClientRect(),fU=$('liFU').getBoundingClientRect(),fC=$('liFC').getBoundingClientRect();
 const flip=(el,to,dur)=>{const r=el.getBoundingClientRect(),k=to.height/r.height;return A(el,[{transform:'translate(0,0) scale(1)'},{transform:`translate(${to.left-r.left}px,${to.top-r.top}px) scale(${k})`}],{duration:dur,easing:'cubic-bezier(.6,0,.2,1)'})};
 spans.forEach(s=>{if(s===L||s===U)return;const d=Math.abs(+s.dataset.i-WORDS.indexOf('UNIVERSE')/1.6)*12;
  A(s,[{transform:'scale(1)',opacity:1},{transform:'scale(.2) translateY(30%)',opacity:0}],{duration:360,delay:d*.6,easing:'cubic-bezier(.5,0,.75,0)'})});
 L.style.transformOrigin=U.style.transformOrigin='0 0';flip(L,fL,620);flip(U,fU,620);
 const mr=mover.getBoundingClientRect(),cs=fC.width/(S*1.42);
 A(mover,[{transform:mover.style.transform},{transform:`translate(${fC.left+fC.width/2}px,${fC.top+fC.height/2}px) scale(${cs})`}],{duration:620,easing:'cubic-bezier(.6,0,.2,1)',composite:'replace'});
 await wait(1050);if(done)return;
 finish(false)}
// into the app: the yellow falls away and the logo flies up into the header
async function finish(fast){if(finish.go)return;finish.go=1;done=true;
 const title=document.getElementById('ptitle'),bar=title&&title.getBoundingClientRect();
 if(!fast&&bar&&bar.width){const sp=title.querySelector('span'),sv=title.querySelector('svg'),sr=sp.getBoundingClientRect(),vr=sv.getBoundingClientRect();
  // each piece flies from wherever it is now (its transform's own scale and shift) to its spot in the header
  const fly=(el,to)=>{const r=el.getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(el).transform),s0=m.a||1,x0=r.left-m.e,y0=r.top-m.f,K=to.height/(r.height/s0);
   el.animate([{transform:`translate(${m.e}px,${m.f}px) scale(${s0})`,color:'#111111'},{transform:`translate(${to.left-x0}px,${to.top-y0}px) scale(${K})`,color:'#f2f4f7'}],{duration:520,fill:'forwards',easing:'cubic-bezier(.6,0,.2,1)'})};
  if(L.getBoundingClientRect().width){fly(L,{left:sr.left,top:sr.top,height:sr.height});fly(U,{left:sr.left+sr.width*.5,top:sr.top,height:sr.height})}
  const mm=new DOMMatrix(getComputedStyle(mover).transform);
  mover.animate([{transform:`translate(${mm.e}px,${mm.f}px) scale(${mm.a})`},{transform:`translate(${vr.left+vr.width/2}px,${vr.top+vr.height/2}px) scale(${vr.width/(S*1.42)})`}],{duration:520,fill:'forwards',easing:'cubic-bezier(.6,0,.2,1)'});
  flood.animate([{opacity:1},{opacity:0}],{duration:460,fill:'forwards',easing:'ease-in'});
  ov.style.background='transparent';
  await wait(540)}
 ov.animate([{opacity:1},{opacity:0}],{duration:fast?220:180,fill:'forwards'}).onfinish=()=>{ov.remove();document.body.classList.remove('lintro-on')}}
ov.addEventListener('pointerdown',()=>finish(true));
window.luIntroSkip=()=>finish(true);
run();
})();
