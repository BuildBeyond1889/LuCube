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
# the phone's media player stands in for the browser's <audio>
html = swap(html, "let AU=new Audio(),AU2=new Audio();", "let AU=new NativeAudio(true),AU2=new NativeAudio(false);")
# no Web Audio graph (the visualiser dances on its own) and no gapless/crossfade handover between two players
html = swap(html, "function audioGraph(){if(AC)return;", "function audioGraph(){AC=1;return;")
html = swap(html, "function nextIsMovement(){", "function nextIsMovement(){return false;")
# radio streams go straight to the phone's player, no relay
html = swap(html, "const src='/api/radio/play?u='+encodeURIComponent(x.u)+'&i='+encodeURIComponent(x.id||'');", "const src=x.u;")
# the wake-up alarm is the phone's own alarm (it rings with the app closed)
html = swap(html, "setInterval(()=>{if(!AL.on||!AL.src||!WORLD)return;", "setInterval(()=>{if(window.LUNATIVE||!AL.on||!AL.src||!WORLD)return;")
html = re.sub(r'<meta name="viewport"[^>]*>', '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">', html, count=1)
html = swap(html, "</head>", "<style>\n" + read(SRC, "phone.css") + "\n" + read(SRC, "intro.css") + "\n</style>\n<script>\n" + read(SRC, "native.js") + "\n</script>\n</head>")
i = html.rindex("</body>")
html = html[:i] + "<script>\n" + read(SRC, "phone.js") + "\n</script>\n<script>\n" + read(SRC, "intro.js") + "\n</script>\n" + html[i:]

if os.path.isdir(WWW):
    shutil.rmtree(WWW)
shutil.copytree(os.path.join(WEB, "fonts"), os.path.join(WWW, "fonts"))
with open(os.path.join(WWW, "index.html"), "w", encoding="utf-8") as f:
    f.write(html)
print("www/index.html", len(html) // 1024, "KB")
