// ===================== LU CUBE · PHONE: the opening (9 s, tap to skip) =====================
// The unfolded cube folds up like origami (the white square swings up twice into the lid), pulses and floods the
// screen yellow, glides to the corner of the E, LISTEN TO THE UNIVERSE rises out of an invisible line and sinks
// back, leaving L, U and the cube to come together in the middle, and the logo flies into the app's header.
// Everything is drawn from one clock (render(t)), so every phone shows the same frame at the same moment, and the
// design mock runs this very file.
(function(){
const S=84,T=9,EXIT=8.4,WORDS='LISTEN TO THE UNIVERSE',UI=WORDS.indexOf('UNIVERSE');
const $=id=>document.getElementById(id);
const cl=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),P=(t,s,d)=>cl((t-s)/d),lerp=(a,b,u)=>a+(b-a)*u;
const io=u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2,out=u=>1-Math.pow(1-u,3),inn=u=>u*u*u;
const LINES='<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="17" x2="19" y2="17"/></svg>';
const ov=document.createElement('div');ov.id='lintro';
ov.innerHTML=`<div id="liFlood"><i></i></div><div id="liTxt"></div>
<div id="liVeil"></div><div id="liMover"><div class="li-scene"><div class="li-cube" id="liCube">
<div class="lf lf-base" style="background:#ff7a1a"><i><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.8" fill="#fff"/></svg></i></div>
<div class="lf lf-top" style="background:#ffc21a"><i><svg viewBox="0 0 24 24"><polygon points="7,4 7,20 20,12" fill="#111"/></svg></i></div>
<div class="lf lf-left" style="background:#2f6be8"><i><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg></i></div>
<div class="lf lf-right" style="background:#cfd6df"><i><svg viewBox="0 0 24 24" fill="#111"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg></i></div>
<div class="lf lf-front" style="background:#e0281a"><i>${LINES}</i><i class="bk">${LINES}</i>
<div class="lf lf-lid" style="background:#fff"><i><svg viewBox="0 0 24 24" fill="#111"><rect x="4" y="15" width="3" height="5"/><rect x="9" y="11" width="3" height="9"/><rect x="14" y="7" width="3" height="13"/><rect x="19" y="3" width="3" height="17"/></svg></i></div></div>
</div></div></div><div id="liMeas"></div><div class="li-skip">TAP TO SKIP</div>`;
document.body.append(ov);document.body.classList.add('lintro-on','lintro-hide');window.LU_INTRO_ON=true;
const q=s=>ov.querySelector(s),txt=$('liTxt'),meas=$('liMeas'),icons=[...ov.querySelectorAll('.lf>i')];
const fL=q('.lf-left'),fR=q('.lf-right'),fT=q('.lf-top'),fF=q('.lf-front'),fLid=q('.lf-lid'),cube=$('liCube'),mover=$('liMover');
let PW=innerWidth,PH=innerHeight,FS=30,L=[],SL=[],TX=0,TY=0,TH=0,PAD=0,FIN=null,ready=false;
// the words, measured once in the real font: every letter's place on the line.
// Each letter sits in its own little window whose bottom edge IS the invisible line, and slides up and down inside
// it: plain cropping, which every phone draws the same way.
function build(){PW=innerWidth;PH=innerHeight;meas.innerHTML=[...WORDS].map(c=>`<span>${c===' '?'&nbsp;':c}</span>`).join('');
 meas.style.fontSize='30px';const w=meas.getBoundingClientRect().width;FS=Math.min(34,30*(PW-40-58)/w);meas.style.fontSize=FS+'px';
 const r=meas.getBoundingClientRect();TH=r.height;PAD=Math.ceil(TH*.3);TX=(PW-r.width)/2-26;TY=PH*.5-TH/2;let x=TX;
 L=[...meas.children].map((s,i)=>{const b=s.getBoundingClientRect(),o={c:WORDS[i],x,w:b.width};x+=b.width;return o});
 txt.innerHTML='';SL=L.map(l=>{if(l.c===' ')return null;const slot=document.createElement('b');slot.className='li-slot';
  slot.style.width=(l.w+4)+'px';slot.style.height=(TH+PAD)+'px';const sp=document.createElement('span');sp.textContent=l.c;sp.style.fontSize=FS+'px';sp.style.top=PAD+'px';
  slot.append(sp);txt.append(slot);return{slot,sp}});ready=true}
// where the logo lands: the app's own header
function header(){const t=$('ptitle');if(!t)return null;const sp=t.querySelector('span'),sv=t.querySelector('svg');if(!sp||!sv)return null;
 const a=sp.getBoundingClientRect(),b=sv.getBoundingClientRect();if(!a.width)return null;
 return{lu:{x:a.left,y:a.top,w:a.width,h:a.height},cube:{x:b.left+b.width/2,y:b.top+b.height/2,w:b.width}}}
function render(t){if(!ready)return;
 // 1. fade in behind a veil (never by fading the 3D cube), fold like origami, camera turns to the logo angle
 const ap=out(P(t,0,.6));$('liVeil').style.opacity=1-ap;
 const f=(s,d)=>io(P(t,s,d||.75));
 fL.style.transform=`translateX(-84px) rotateY(${90*f(.6)}deg)`;fR.style.transform=`translateX(84px) rotateY(${-90*f(.8)}deg)`;
 fT.style.transform=`translateY(-84px) rotateX(${-90*f(1.0)}deg)`;fF.style.transform=`translateY(84px) rotateX(${90*f(1.2)}deg)`;
 fLid.style.transform=`translateY(84px) rotateX(${90*f(1.75,.65)}deg)`;
 const c=io(P(t,.6,1.8));cube.style.transform=`rotateX(${-30*c}deg) rotateY(${45*c}deg) rotateX(${90*c}deg)`;
 const io2=1-P(t,2.34,.08);icons.forEach(i=>i.style.opacity=io2);   // the symbols go the moment the lid shuts
 const pul=s=>{const u=P(t,s,.3);return u>0&&u<1?1+.2*Math.sin(u*Math.PI):1};
 let cx=PW/2,cy=PH*.4,cs=(.85+.15*ap)*pul(2.4);
 // 2. the pulse at 2.4 floods the screen yellow
 // (a circle that only scales: the graphics chip does it, no repainting the whole screen each frame)
 const fd=$('liFlood').firstChild,FR=Math.hypot(PW,PH)*1.1;fd.style.cssText=`left:${PW/2-FR}px;top:${PH*.4-FR}px;width:${FR*2}px;height:${FR*2}px;transform:scale(${Math.max(.0001,out(P(t,2.42,.6)))})`;
 // 3. the cube glides to the top corner of the last E, at its true size beside the words
 const E=L[L.length-1],cw=FS*.46,ex0=E.x+E.w+cw*.75+4,ey0=TY+cw*.12;
 const g=io(P(t,2.9,.9));cx=lerp(PW/2,ex0,g);cy=lerp(PH*.4,ey0,g)-Math.sin(Math.PI*g)*30;cs=lerp(cs,cw/(S*1.42),g);
 // 4. the words rise together through the line; 5. a tiny pulse sends all but L and U back down together.
 // Before 3.8 s (and once sunk) the words are switched off entirely, so nothing can show while the cube folds.
 const up=out(P(t,3.8,.7)),dn=inn(P(t,5.45,.5)),on=t>=3.8;
 L.forEach((l,i)=>{const s=SL[i];if(!s)return;const keep=i===0||i===UI,d=keep?0:dn;
  s.slot.style.visibility=on&&d<1?'visible':'hidden';s.slot.style.overflow='hidden';s.sp.style.color='#111';
  s.slot.style.transform=`translate(${l.x}px,${TY-PAD}px)`;s.sp.style.transform=`translateY(${TH*1.2*(1-up)+TH*1.2*d}px)`});
 if(t>=5.3&&t<5.6)cs*=1+.12*Math.sin(Math.PI*P(t,5.3,.3));
 // 6. from 6.3 the L, U and cube come together straight into the centre, growing into the logo (and then hold still)
 const fs=Math.min(PW*.34,140),k=fs/FS,gr=io(P(t,6.3,1.3)),K=lerp(1,k,gr),Lc=L[0],Uc=L[UI];
 const fcw=fs*.46,Wl=(Lc.w+Uc.w)*k+fcw*1.17,LxT=(PW-Wl)/2,LyT=PH*.42-TH*k/2,fcx=LxT+(Lc.w+Uc.w)*k+fcw*.62,fcy=LyT+fcw*.42;
 const place=(i,x,y,sc,col)=>{const s=SL[i];s.slot.style.overflow='visible';s.slot.style.visibility='visible';s.sp.style.transform='none';
  s.slot.style.transform=`translate(${x}px,${y-PAD*sc}px) scale(${sc})`;if(col)s.sp.style.color=col};
 if(t>=6.3){place(0,lerp(Lc.x,LxT,gr),lerp(TY,LyT,gr),K);place(UI,lerp(Uc.x,LxT+Lc.w*k,gr),lerp(TY,LyT,gr),K);
  cx=lerp(ex0,fcx,gr);cy=lerp(ey0,fcy,gr);cs=lerp(cw,fcw,gr)/(S*1.42)}
 // 7. into the app: the yellow fades and the logo flies to the header, turning white
 const xe=io(P(t,EXIT,.55));
 if(t>=EXIT){FIN=FIN||header()||{lu:{x:16,y:20,w:24,h:22},cube:{x:51,y:26,w:17}};const hk=FIN.lu.h/TH,col=xe>.5?'#f2f4f7':'#111';
  place(0,lerp(LxT,FIN.lu.x,xe),lerp(LyT,FIN.lu.y,xe),lerp(k,hk,xe),col);place(UI,lerp(LxT+Lc.w*k,FIN.lu.x+FIN.lu.w*.5,xe),lerp(LyT,FIN.lu.y,xe),lerp(k,hk,xe),col);
  cx=lerp(fcx,FIN.cube.x,xe);cy=lerp(fcy,FIN.cube.y,xe);cs=lerp(fcw/(S*1.42),FIN.cube.w/(S*1.42),xe)}
 $('liFlood').style.opacity=1-xe;
 // the app is drawn once behind the solid yellow just before the reveal, so the fade itself has nothing new to paint
 if(t>=7.9&&document.body.classList.contains('lintro-hide')){document.body.classList.remove('lintro-hide');window.dispatchEvent(new Event('luintroreveal'))}ov.style.background=t>=EXIT?'transparent':'';q('.li-skip').style.opacity=t>=EXIT?0:1;
 mover.style.transform=`translate(${cx}px,${cy}px) scale(${cs})`}
window.luIntroRender=t=>render(t);
// wait for the real Anton font before measuring anything (up to 3 s, behind the dark start), then run the clock
const fontReady=()=>Promise.race([document.fonts.load('400 30px Anton').then(()=>document.fonts.ready),new Promise(r=>setTimeout(r,3000))]).catch(()=>{});
if(window.LU_INTRO_MANUAL){fontReady().then(()=>{build();render(window.LU_INTRO_T||0)});return}   // the design mock drives the clock itself
let t0=0,skip=0,gone=false,clock=0,lastN=0;
function frame(n){if(gone)return;if(!t0){t0=n;lastN=n}clock+=Math.min(1/30,(n-lastN)/1000);lastN=n;let t=clock+skip;
 if(t>=T){gone=true;render(T);document.body.classList.remove('lintro-hide');ov.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'}).onfinish=()=>{ov.remove();document.body.classList.remove('lintro-on');window.LU_INTRO_ON=false;window.dispatchEvent(new Event('luintroend'))};return}
 render(t);requestAnimationFrame(frame)}
ov.addEventListener('pointerdown',()=>{if(!t0)return;const t=clock+skip;if(t<EXIT)skip+=EXIT-t});
window.luIntroSkip=()=>{skip=99};
fontReady().then(()=>{build();requestAnimationFrame(frame)});
})();
