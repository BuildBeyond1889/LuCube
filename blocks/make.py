"""Puts Lu Blocks together: game.html with the how-rings-work walkthrough (rings.html) folded in.

    python3 blocks/make.py            -> blocks/lu-blocks.html (the page itself, as published)
The Android app's build (phone/build_www.py) wraps that page as www/blocks.html with the app's own fonts.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))


def read(n):
    with open(os.path.join(HERE, n), encoding="utf-8") as f:
        return f.read()


def must(s, a, b):
    if a not in s:
        raise SystemExit(f"make.py: couldn't find {a[:60]!r}")
    return s.replace(a, b)


def rings_parts():
    r = read("rings.html")
    css = re.search(r"<style>(.*?)</style>", r, re.S).group(1)
    body = r[r.index("</style>") + len("</style>"):r.index("<script>")]
    js = r[r.index("<script>") + len("<script>"):r.rindex("</script>")]
    # styles: the page root and body become the sealed layer itself
    css = must(css, ":root{", ":host{")
    css = must(css, "body{", ".rd{min-height:100%;")
    css = must(css, ".sq{width:20px;height:20px;border:2px solid var(--ink);flex:none}", ".sq{width:20px;height:20px;border:2px solid var(--ink);flex:none;padding:0}button.sq{cursor:pointer}")
    body = must(body, '<span class="sq r"></span>', '<button class="sq r" id="rdClose" title="Close" aria-label="Close"></button>')
    # script: everything is looked up inside the layer, and it can be closed again
    js = js.strip()
    js = must(js, "(() => {\n'use strict';", "window.initRings = function (R, host, onDone) {\n'use strict';\nconst CLEAN = [];")
    js = js[:js.rstrip().rindex("})();")] + "R.getElementById('rdClose').onclick = onDone;\nreturn () => { timers.forEach(clearTimeout); CLEAN.forEach((f) => f()); };\n};\n"
    js = js.replace("document.getElementById(", "R.getElementById(").replace("document.querySelectorAll(", "R.querySelectorAll(").replace("document.querySelector(", "R.querySelector(")
    js = js.replace("document.documentElement.style.setProperty(", "host.style.setProperty(")
    js = must(js, "addEventListener('resize', size);", "addEventListener('resize', size); CLEAN.push(() => removeEventListener('resize', size));")
    js = must(js, "addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(step + 1); if (e.key === 'ArrowLeft') go(step - 1); });",
              "const keys = (e) => { if (e.key === 'ArrowRight') go(step + 1); if (e.key === 'ArrowLeft') go(step - 1); if (e.key === 'Escape') onDone(); };\naddEventListener('keydown', keys); CLEAN.push(() => removeEventListener('keydown', keys));")
    js = must(js, "nx.textContent = step === STEPS.length - 1 ? 'Start over' : 'Next';", "nx.textContent = step === STEPS.length - 1 ? \"Let's play\" : 'Next';")
    js = must(js, "R.getElementById('next').onclick = () => go(step === STEPS.length - 1 ? 0 : step + 1);", "R.getElementById('next').onclick = () => { if (step === STEPS.length - 1) onDone(); else go(step + 1); };")
    return css, body, js


def build():
    g = read("game.html")
    css, body, js = rings_parts()
    tpl = f'<template id="ringsTpl"><style>{css}</style><div class="rd">{body}</div></template>\n<script>\n{js}</script>'
    return must(g, "<!--RINGS-->", tpl)


if __name__ == "__main__":
    out = build()
    with open(os.path.join(HERE, "lu-blocks.html"), "w", encoding="utf-8") as f:
        f.write(out)
    print("blocks/lu-blocks.html", len(out) // 1024, "KB")
