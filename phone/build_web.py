"""Builds the iPhone / iPad web app (docs/app/, served by GitHub Pages) from the PC cube (../web/index.html).

  docs/app/index.html  the phone layout (same as the Android app), for iPhone
  docs/app/ipad.html   the full PC cube (wheel, unfold window, Pong, depth visualiser), for iPad
Both use src/web.js in place of the Android app's native.js: songs are added from Files and kept in the browser,
the radio list comes straight from radio-browser.info. Install: Safari -> Share -> Add to Home Screen.
"""
import hashlib
import json
import os
import re
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
WEB = os.path.join(ROOT, "web")
SRC = os.path.join(HERE, "src")
OUT = os.path.join(ROOT, "docs", "app")
IMG = os.path.join(ROOT, "docs", "img")


def read(*p):
    with open(os.path.join(*p), encoding="utf-8") as f:
        return f.read()


def swap(text, old, new, where="web/index.html"):
    if old not in text:
        raise SystemExit(f"build_web: couldn't find {old[:70]!r} in {where}")
    return text.replace(old, new)


# the browser layer, with the Android layer's country names
web = read(SRC, "web.js")
cn = re.search(r"^const CN=.*$", read(SRC, "native.js"), re.M).group(0)
web = re.sub(r"^const CN=.*$", lambda m: cn, web, count=1, flags=re.M)

HEAD = """<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Lu Cube">
<meta name="theme-color" content="#2f6be8">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" type="image/png" href="icon-192.png">
"""
NOTE_CSS = """#lunote{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 10px);transform:translateX(-50%);z-index:99;display:none;background:#111;color:#ffc21a;
 font:700 10px 'Space Mono',monospace;letter-spacing:.1em;padding:7px 14px;border:2px solid #ffc21a;white-space:nowrap}"""


def base(pick_layout):
    html = read(WEB, "index.html")
    # no Web Audio graph: a browser goes silent when it routes another site's radio stream through one,
    # so the visualiser dances on its own. No two-player handover either (iPhone plays one sound at a time).
    html = swap(html, "function audioGraph(){if(AC)return;", "function audioGraph(){AC=1;return;")
    html = swap(html, "function nextIsMovement(){", "function nextIsMovement(){return false;")
    # radio streams go straight to the player, no relay
    html = swap(html, "const src='/api/radio/play?u='+encodeURIComponent(x.u)+'&i='+encodeURIComponent(x.id||'');", "const src=x.u;")
    html = re.sub(r'<meta name="viewport"[^>]*>', '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">', html, count=1)
    html = re.sub(r"<title>[^<]*</title>", "<title>Lu Cube</title>", html, count=1)
    html = swap(html, "</head>", "<script>" + pick_layout + "</script>\n" + HEAD + "<style>\n" + NOTE_CSS + "\n__CSS__\n</style>\n<script>\n" + web + "\n</script>\n</head>")
    return html


# ---------- iPhone: the phone layout ----------
TO_IPAD = "if(Math.min(screen.width,screen.height)>=700&&!/[?&]phone/.test(location.search))location.replace('ipad.html'+location.search);"
phone = read(SRC, "phone.js")
P = "phone/src/phone.js"
phone = swap(phone, "${ok?'Put songs in a folder on your phone (Music, Download…): each folder becomes a playlist. Or sync them from Lu Cube on your PC in ⚙ settings.'",
             "${ok?'Tap ＋ ADD SONGS and pick songs from Files (iCloud Drive, On My iPhone, Downloads…). Each album becomes a playlist; they stay in the app.'", P)
phone = swap(phone, "${ok?'↻ LOOK AGAIN':'ALLOW ACCESS'}", "＋ ADD SONGS", P)
phone = swap(phone, '<b data-m="remote">◎</b>', "", P)
i, j = phone.index(" <h4>SYNC WITH YOUR PC</h4>"), phone.index(" <h4>WEATHER TOWN</h4>")
phone = phone[:i] + """ <h4>YOUR SONGS</h4><p>Pick songs from Files: iCloud Drive, On My iPhone, Downloads, a USB drive. They're copied into Lu Cube, so they play offline. Each album becomes a playlist.</p><p><span class="btn" id="padd">＋ ADD SONGS</span> <span class="btn" id="pclr">REMOVE ALL SONGS</span></p>
 <h4>WAKE-UP</h4><p>Set the time on the radio's Wake-up face. It rings while Lu Cube is open (leave it on the charger with the screen on). ☀ Sunrise wakes you to a station somewhere it's morning right now.</p>
 <i hidden id="psync"></i><i hidden id="prem"></i><i hidden id="palm"></i><input hidden id="paddr"><input hidden id="pcode">
""" + phone[j:]
i, j = phone.index(" <h4>ANDROID AUTO</h4>"), phone.index(" <h4>ABOUT</h4>")
phone = phone[:i] + phone[j:]
phone = swap(phone, "Lu Cube for Android ${E(VERS)}", "Lu Cube for iPhone &amp; iPad · web app", P)
phone = swap(phone, "$('pupd').onclick=()=>{if(UPD.n>MYB)doUpdate();else checkUpdate(true)};$('pupd').textContent=UPD.n>MYB?'⬇ UPDATE TO BUILD '+UPD.n:'CHECK FOR AN UPDATE';",
             "$('pupd').onclick=()=>window.luWebUpdate();$('pupd').textContent='↻ GET THE LATEST VERSION';$('padd').onclick=()=>window.luAddSongs();"
             "$('pclr').onclick=()=>{const b=$('pclr');if(b.dataset.sure){window.luClearSongs()}else{b.dataset.sure=1;b.textContent='TAP AGAIN TO REMOVE THEM'}};", P)
pcss = read(SRC, "phone.css") + "\n" + read(SRC, "intro.css")
html = base(TO_IPAD).replace("__CSS__", pcss)
k = html.rindex("</body>")
html = html[:k] + "<script>\n" + phone + "\n</script>\n<script>\n" + read(SRC, "intro.js") + "\n</script>\n" + html[k:]
iphone = html

# ---------- iPad: the full PC cube ----------
TO_PHONE = "if(Math.min(screen.width,screen.height)<700)location.replace('./'+location.search);"
IPAD_CSS = """.intro{top:calc(env(safe-area-inset-top) + 14px)!important}.intro h1,#h1{display:none!important}.intro p{margin:0!important}
.find{top:calc(env(safe-area-inset-top) + 40px)!important}
#swp{position:fixed;right:calc(env(safe-area-inset-right) + 18px);bottom:calc(env(safe-area-inset-bottom) + 18px);top:auto;margin:0;padding:10px 16px;font-size:11px;z-index:21}
:root{--sat:env(safe-area-inset-top)}
#lucube{left:auto!important;right:calc(env(safe-area-inset-right) + 18px);bottom:calc(env(safe-area-inset-bottom) + 66px)!important;background:#ffc21a!important;color:#111!important;display:none}
.lupill{position:fixed;left:calc(env(safe-area-inset-left) + 18px);bottom:calc(env(safe-area-inset-bottom) + 18px);z-index:20;background:#111;color:#fff;border-radius:99px;
 padding:9px 16px;font:700 11px 'Space Mono',monospace;letter-spacing:.08em;cursor:pointer;-webkit-tap-highlight-color:transparent}.lupill:active{background:#ffc21a;color:#111}
html .keys{padding-left:190px;padding-right:230px}
html,body{overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}"""
IPAD_JS = """<script>(function(){
 window.MXFULL=true;   // the orange square unfolds the cube into the whole screen
 // no songs yet: the Lu cube shows how to add some, instead of failing to draw (which left it invisible)
 const _lr=luRenderFaces,_lt=luTickFaces,_ac=act;
 luRenderFaces=function(){if(PLS.length)return _lr();
  F_NOW.style.background='var(--y)';F_NOW.innerHTML=TB('LU CUBE // YOUR MUSIC')+`<div style="padding:18px 16px"><div class="big" style="font-size:44px">NO SONGS<br>YET</div><div style="font:700 9px/1.7 'Space Mono';margin-top:10px">Tap ＋ ADD SONGS and pick songs from Files (iCloud Drive, On My iPad, Downloads). Each album becomes a playlist; they stay in the app.</div><div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill" data-act="lu:add">＋ ADD SONGS</span><span class="pill" style="background:var(--b);color:#fff" data-act="lu:radio">📻 THE RADIO</span></div></div>`;
  [F_COVER,F_PL,F_LIB,F_LYR,F_VIZ].forEach((f,k)=>{f.style.background=k%2?'var(--g)':'var(--b)';f.innerHTML=TB(['COVER','PLAYLIST','LIBRARY','LYRICS','VISUALISER'][k])+`<div style="position:absolute;inset:20px 0 0;display:grid;place-items:center;font:400 34px Anton;color:${k%2?'#111':'#fff'}">＋ SONGS</div>`})};
 luTickFaces=function(){if(PLS.length)return _lt()};
 act=function(a){if(a==='lu:add'){window.luAddSongs();return}if(a==='lu:radio'){switchMode();return}return _ac.apply(this,arguments)};const pill=(id,t,f)=>{const b=document.createElement('div');b.id=id;b.className='lupill';b.textContent=t;b.onclick=f;document.body.append(b);return b};
 pill('luadd','＋ ADD SONGS',()=>window.luAddSongs());
 const cb=pill('lucube','▣ SHOW THE CUBE',()=>out(true));
 const k=document.querySelector('.keys');if(k)k.textContent='SWIPE the cube to turn it · TAP its buttons · DRAG a corner to resize · ORANGE square unfolds it · RED square puts it away';
 // a touchscreen has no mouse to find the wheel with: the cube comes out, big, in the middle
 function out(force){if(!PLS.length&&MODE!=='lu')return;csz=Math.max(csz,Math.min(1.6,Math.min(innerWidth,innerHeight)/470));toCube(innerWidth*.5,innerHeight*.5)}
 let first=true,bounced=false;
 setInterval(()=>{if(!LUREADY)return;
  // no songs yet: the radio fills the cube instead of an empty one
  if(MODE==='lu'&&!PLS.length){if(!bounced){bounced=true;switchMode(true)}
   const li=document.getElementById('libinfo');if(li)li.textContent='No songs yet: tap ＋ ADD SONGS to bring songs in from Files. Until then, the radio.';}
  if(MODE==='lu'&&PLS.length)bounced=false;
  if(first&&PLS.length&&!cubeOn){first=false;out()}
  cb.style.display=!cubeOn&&!window.mxEl?'block':'none'},300)
 // turning the iPad: the cube stays in the middle at a size that fits
 addEventListener('resize',()=>setTimeout(()=>{if(cubeOn&&!window.mxEl){csz=Math.min(csz,Math.min(1.6,Math.min(innerWidth,innerHeight)/470));cpos=[innerWidth*.5,innerHeight*.5]}},120));
})();</script>"""
ipad = base(TO_PHONE).replace("__CSS__", IPAD_CSS)
ipad = swap(ipad, "songs. Hover the right edge to open the wheel; drag it out for the cube.`", "songs. Tap the wheel in the corner for your playlists.`")
ipad = swap(ipad, "`Your Music folder is empty: ${L.music}. Run Get Classical Music.bat, or drop folders of songs in there.`", "`No songs yet: ${L.music}.`")
k = ipad.rindex("</body>")
ipad = ipad[:k] + IPAD_JS + "\n" + ipad[k:]

# ---------- write it out ----------
if os.path.isdir(OUT):
    shutil.rmtree(OUT)
shutil.copytree(os.path.join(WEB, "fonts"), os.path.join(OUT, "fonts"))
for name, text in (("index.html", iphone), ("ipad.html", ipad)):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(text)
shutil.copy(os.path.join(IMG, "apple-touch.png"), os.path.join(OUT, "icon-180.png"))
shutil.copy(os.path.join(IMG, "icon-512.png"), os.path.join(OUT, "icon-512.png"))
try:
    from PIL import Image
    Image.open(os.path.join(IMG, "icon-512.png")).resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, "icon-192.png"))
except Exception:
    shutil.copy(os.path.join(IMG, "icon-512.png"), os.path.join(OUT, "icon-192.png"))
manifest = {"name": "Lu Cube", "short_name": "Lu Cube", "description": "Your music and 50,000 world radio stations on a cube.",
            "start_url": "./", "scope": "./", "display": "standalone", "orientation": "any",
            "background_color": "#2f6be8", "theme_color": "#2f6be8",
            "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                      {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]}
with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=1)
files = ["./", "index.html", "ipad.html", "manifest.json", "icon-180.png", "icon-192.png", "icon-512.png"] + ["fonts/" + n for n in sorted(os.listdir(os.path.join(OUT, "fonts")))]
ver = hashlib.sha1((iphone + ipad).encode()).hexdigest()[:10]
sw = read(SRC, "sw.js").replace("__VER__", ver).replace("__FILES__", json.dumps(files))
with open(os.path.join(OUT, "sw.js"), "w", encoding="utf-8") as f:
    f.write(sw)
print("docs/app: index.html", len(iphone) // 1024, "KB · ipad.html", len(ipad) // 1024, "KB")
