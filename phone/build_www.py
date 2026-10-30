"""Builds the phone's web page (www/) from the PC cube (../web/index.html) plus the phone layer in src/."""
import os
import re
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "..", "web")
WWW = os.path.join(HERE, "www")
SRC = os.path.join(HERE, "src")


def read(*p):
    with open(os.path.join(*p), encoding="utf-8") as f:
        return f.read()


def swap(html, old, new, count=1):
    n = html.count(old)
    if n < count:
        raise SystemExit(f"build_www: couldn't find {old[:70]!r} in web/index.html")
    return html.replace(old, new)


html = read(WEB, "index.html")
# phones: the title bars keep the original small corner squares (the PC has the full-height ones)
html = swap(html, "\n/* the three squares stand the full height of the bar: from the top edge down to the black line under it */\n.tb i.tl{width:20px;height:20px;flex:none}.tb{gap:3px;padding-left:3px}.tb b{max-width:calc(100% - 82px)}\n.tb i.tl>s{width:20px;height:20px;margin:-10px 0 0 -10px}", "")
for col in ("#e0281a", "#ffc21a", "#ff7a1a"):
    html = swap(html, f'<rect x="1" y="1" width="14" height="14" fill="{col}" stroke="#111" stroke-width="2"/>', f'<rect x="1.5" y="1.5" width="13" height="13" fill="{col}" stroke="#111" stroke-width="3"/>')
# the phone's media player stands in for the browser's <audio>
html = swap(html, "let AU=new Audio(),AU2=new Audio();", "let AU=new NativeAudio(true),AU2=new NativeAudio(false);")
# no Web Audio graph (the visualiser dances on its own) and no gapless/crossfade handover between two players
html = swap(html, "function audioGraph(){if(AC)return;", "function audioGraph(){AC=1;return;")
html = swap(html, "function nextIsMovement(){", "function nextIsMovement(){return false;")
# radio streams go straight to the phone's player, no relay
html = swap(html, "const src='/api/radio/play?u='+encodeURIComponent(x.u)+'&i='+encodeURIComponent(x.id||'');", "const src=x.u;")
# Lu Blocks: a button on the lyrics face, next to BACK TO PLAYER (Android only for now)
html = swap(html, """<div style="position:absolute;left:10px;bottom:10px"><span class="pill" data-act="go:NOW PLAYING">${s.lines?'SYNCED':'NO .LRC'} · BACK TO PLAYER</span></div>""",
            """<div style="position:absolute;left:10px;right:10px;bottom:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span class="pill" data-act="go:NOW PLAYING">${s.lines?'SYNCED':'NO .LRC'} · BACK TO PLAYER</span><span class="pill" data-act="blocks" style="background:var(--y);color:#111">▦ LU BLOCKS</span></div>""")
# the wake-up alarm is the phone's own alarm (it rings with the app closed)
html = swap(html, "setInterval(()=>{if(!AL.on||!AL.src||!WORLD)return;", "setInterval(()=>{if(window.LUNATIVE||!AL.on||!AL.src||!WORLD)return;")
html = re.sub(r'<meta name="viewport"[^>]*>', '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">', html, count=1)
html = swap(html, "</head>", "<style>\n" + read(SRC, "phone.css") + "\n" + read(SRC, "intro.css") + "\n</style>\n<script>\n" + read(SRC, "native.js") + "\n</script>\n</head>")
i = html.rindex("</body>")
html = html[:i] + "<script>\n" + read(SRC, "phone.js") + "\n</script>\n<script>\n" + read(SRC, "intro.js") + "\n</script>\n<script>\n" + read(SRC, "blocks-host.js") + "\n</script>\n" + html[i:]

if os.path.isdir(WWW):
    shutil.rmtree(WWW)
shutil.copytree(os.path.join(WEB, "fonts"), os.path.join(WWW, "fonts"))
with open(os.path.join(WWW, "index.html"), "w", encoding="utf-8") as f:
    f.write(html)

# the game itself, with the app's own fonts (no internet needed)
import importlib.util
spec = importlib.util.spec_from_file_location("blocks_make", os.path.join(HERE, "..", "blocks", "make.py"))
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)
game = re.sub(r'<link rel="(?:preconnect|stylesheet)"[^>]*>\n?', "", bm.build())
fonts = "".join(re.findall(r"@font-face\{[^}]*\}", read(WEB, "index.html")))
head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">'
        '<style>' + fonts + ':root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}'
        'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>')
with open(os.path.join(WWW, "blocks.html"), "w", encoding="utf-8") as f:
    f.write(head + game + "</body></html>")
print("www/blocks.html", len(game) // 1024, "KB")
print("www/index.html", len(html) // 1024, "KB")
