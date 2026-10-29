"""Runs the PC's Lu Cube server for the tap tests: a throwaway folder with a tiny music library,
and the radio directory answered from tests/fixtures instead of radio-browser.info.

    python3 tests/pc_server.py PORT
"""
import importlib.util
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
FX = os.path.join(HERE, "fixtures")
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8820

root = tempfile.mkdtemp(prefix="lucube-test-")
shutil.copy(os.path.join(REPO, "musiccube.py"), root)
shutil.copytree(os.path.join(REPO, "web"), os.path.join(root, "web"))
for album, n in (("Test Album", 4), ("Second Album", 3)):  # a small library for Lu mode
    d = os.path.join(root, "Music", album)
    os.makedirs(d)
    for i in range(1, n + 1):
        shutil.copy(os.path.join(FX, "song.mp3"), os.path.join(d, f"{i:02d} Track {i}.mp3"))

spec = importlib.util.spec_from_file_location("musiccube", os.path.join(root, "musiccube.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def fake_rb(path, **q):
    if "countries" in path:
        return json.load(open(os.path.join(FX, "countries.json"), encoding="utf-8"))
    if q.get("countrycode"):
        return []
    return json.load(open(os.path.join(FX, "stations.json"), encoding="utf-8"))


m.rb = fake_rb
m.build_world()
srv = m.ThreadingHTTPServer(("127.0.0.1", port), m.H)
print(f"Lu Cube test server on http://127.0.0.1:{port}/  ({root})", flush=True)
srv.serve_forever()
