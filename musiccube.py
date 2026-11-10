"""Lu Cube (Music Cube): plays the Music folder next to this file. No accounts. Radio mode (live stations from
radio-browser.info) needs internet; everything else works offline.

Each folder inside Music is a playlist (Get Classical Music.bat adds playlist.json with titles and lengths, plus
cover.jpg; folders you make yourself just use the file names). A song.lrc next to song.mp3 gives synced lyrics.
Works from any drive letter. Opens in its own Edge window; closing the window stops it.
"""
import http.client
import json
import mimetypes
import os
import random
import re
import socket
import ssl
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

for _e, _t in ((".woff2", "font/woff2"), (".flac", "audio/flac"), (".m4a", "audio/mp4"), (".opus", "audio/ogg"), (".oga", "audio/ogg"), (".lrc", "text/plain")):
    mimetypes.add_type(_t, _e)
ROOT = os.path.dirname(os.path.abspath(__file__))
WEB, MUSIC = os.path.join(ROOT, "web"), os.path.join(ROOT, "Music")
STATE = os.path.join(ROOT, "state.json")
AUDIO = (".mp3", ".flac", ".ogg", ".oga", ".opus", ".m4a", ".aac", ".wav")
COVERS = ("cover.jpg", "cover.png", "folder.jpg", "folder.png", "front.jpg")


def nice(stem):
    return re.sub(r"^\d+[\s._-]+", "", stem).replace("_", " ").strip() or stem


def tidy(title, artist):
    """'Ludwig_van_Beethoven_-_Symphony_No._5_-_I._Allegro_con_brio' -> ('I. Allegro con brio', 'Ludwig van Beethoven')."""
    t = re.sub(r"\s+", " ", (title or "").replace("_", " ")).strip()
    a = re.sub(r"\s+", " ", (artist or "").replace("_", " ")).strip()
    parts = [x.strip() for x in t.split(" - ") if x.strip()]
    if len(parts) >= 2:
        a = a or parts[0]
        t = parts[-1]
    return t, a


def tracks_in(folder, rel):
    pj = os.path.join(folder, "playlist.json")
    files = sorted(f for f in os.listdir(folder) if f.lower().endswith(AUDIO))
    info = {}
    if os.path.exists(pj):
        try:
            info = {t["file"]: t for t in json.load(open(pj, encoding="utf-8"))}
        except (OSError, ValueError, KeyError):
            info = {}
    order = [f for f in info if f in files] + [f for f in files if f not in info]
    out = []
    for f in order:
        t, stem = info.get(f, {}), os.path.splitext(f)[0]
        lrc = stem + ".lrc"
        pn = parse_name(stem) if not t.get("title") else None
        pc = pn or parse_name(stem)
        tt, ta = tidy(t.get("title") or (pn[3] or pn[1] if pn else nice(stem)), t.get("artist") or (pc[0] if pc else ""))
        dm = re.match(r"^(\d{4}-\d{2}-\d{2}) - (.+)$", stem)
        if dm and not dm.group(1).startswith("0000") and not t.get("title"):
            tt, ta = dm.group(2), ""
        out.append({"t": tt, "a": ta, "d": t.get("length") or 0, **({"dt": dm.group(1)} if dm and not dm.group(1).startswith("0000") else {}),
                    "src": "/media/" + urllib.parse.quote(rel + f), "lrc": "/media/" + urllib.parse.quote(rel + lrc) if os.path.exists(os.path.join(folder, lrc)) else ""})
    return out


def pretty(s):
    """'StringQuartetNo.1InAMajor' -> 'String Quartet No. 1 In A Major'."""
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", s)
    s = re.sub(r"(?<=[A-Z])(?=[A-Z][a-z])", " ", s)
    s = re.sub(r"\.(?=\d)", ". ", s)
    s = re.sub(r"(?<=[A-Za-z])(?=\d)", " ", s)
    s = re.sub(r"\s+", " ", s.replace("_", " ")).strip()
    s = re.sub(r"\bVan\b", "van", s)
    s = re.sub(r"\bBwv\b\.?", "BWV", s)
    s = re.sub(r"\bIn ([A-G])( Flat| Sharp)? (Major|Minor)\b", lambda m: f"in {m.group(1)}{(m.group(2) or '').lower().replace(' flat', '-flat').replace(' sharp', '-sharp')} {m.group(3).lower()}", s)
    s = re.sub(r"\bIn ([A-G])( Flat| Sharp)?\b", lambda m: f"in {m.group(1)}{(m.group(2) or '').lower().replace(' flat', '-flat').replace(' sharp', '-sharp')}", s)
    return {"Antonn Dvorak": "Antonín Dvořák", "Antonin Dvorak": "Antonín Dvořák"}.get(s, s)


def parse_name(stem):
    """Musopen-style names: Composer-Work-NN-Movement, Composer-NN-Work-Movement, or Composer-Work."""
    p = stem.split("-")
    if len(p) >= 3 and p[2].isdigit():
        return pretty(p[0]), pretty(p[1]), int(p[2]), " – ".join(pretty(x) for x in p[3:])
    if len(p) >= 3 and p[1].isdigit():
        return pretty(p[0]), pretty(p[2]), int(p[1]), " – ".join(pretty(x) for x in p[3:])
    if len(p) == 2:
        return pretty(p[0]), pretty(p[1]), 0, ""
    return None


def split_collection(name, folder, rel, tracks, cover):
    """A big folder of many composers (like the Musopen collection) becomes one playlist per work. Files stay where they are."""
    groups, order = {}, []
    for t in tracks:
        stem = os.path.splitext(urllib.parse.unquote(t["src"]).rsplit("/", 1)[-1])[0]
        got = parse_name(stem) or ("", "More pieces", 0, "")  # an odd file name no longer stops the whole split
        comp, work, n, mov = got
        if not comp:
            t = dict(t, t=nice(stem))
        key = (comp, work) if n or not comp else (comp, "Overtures & Pieces")
        if key not in groups:
            groups[key] = []
            order.append(key)
        t = dict(t, t=t["t"] if not comp else (mov or work if n else work), a=comp or t.get("a", ""), _n=n)
        groups[key].append(t)
    out = []
    for comp, work in sorted(order, key=lambda k: ((k[0].split() or ["~"])[-1], k[1])):
        tr = sorted(groups[(comp, work)], key=lambda t: (t["_n"], t["t"]))
        for t in tr:
            t.pop("_n", None)
        out.append({"name": f"{comp.split()[-1]} · {work}" if comp else work, "cover": cover, "tracks": tr, "from": name})
    return out


def library():
    os.makedirs(MUSIC, exist_ok=True)
    out = []
    for d in sorted(os.listdir(MUSIC), key=str.lower):
        p = os.path.join(MUSIC, d)
        if not os.path.isdir(p):
            continue
        tr = tracks_in(p, d + "/")
        if not tr:
            continue
        cov = next((c for c in COVERS if os.path.exists(os.path.join(p, c))), None)
        if not cov:
            cov = next((f for f in sorted(os.listdir(p)) if f.lower().endswith((".jpg", ".jpeg", ".png"))), None)
        cover = "/media/" + urllib.parse.quote(d + "/" + cov) if cov else ""
        # only a big mixed-composer collection (like Musopen) gets split; any other folder stays one playlist, however long
        named = [parse_name(os.path.splitext(urllib.parse.unquote(t["src"]).rsplit("/", 1)[-1])[0]) for t in tr]
        comps = {n[0] for n in named if n and n[0]}
        mixed = len(tr) > 25 and len(comps) >= 2 and sum(1 for n in named if n and n[0]) >= len(tr) * 0.6
        parts = split_collection(d, p, d + "/", tr, cover) if mixed else None
        if parts and len(parts) > 1:
            out.extend(parts)
        else:
            out.append({"name": d, "cover": cover, "tracks": tr, **({"kind": "book"} if is_book(p, [f for f in os.listdir(p) if f.lower().endswith(AUDIO)]) else {})})
    loose = tracks_in(MUSIC, "")
    if loose:
        out.append({"name": "Loose songs", "cover": "", "tracks": loose})
    return out


# ---------------- listening: Add Music, the finders, audiobooks and podcasts (the same as the Android app) ----------------
# The page's Add Music face and its two finders (web/listen/) talk to these:
#   /api/listen        the page's own notes (where you are in each book, what kind each playlist is, hidden ones, ...)
#   /api/fetch?u=      reads a page from the internet for the finders (the Internet Archive, Openverse, podcast feeds)
#   /api/dl            downloads one file into Music\<playlist>\ ; /api/dlprog says how far along it is
#   /api/import        a song you picked on this PC, copied into Music\<playlist>\
#   /api/added, /api/removeAdded   the playlists Lu Cube made itself (only those are ever deleted)
#   /api/pods/...      podcast subscriptions: new episodes download by themselves while Lu Cube is open
DATA = os.path.join(ROOT, "data")
LISTEN = os.path.join(DATA, "listen.json")
ADDED = os.path.join(DATA, "added.json")
PODS = os.path.join(DATA, "pods.json")
LLOCK, PLOCK = threading.Lock(), threading.Lock()
DLP = {}   # dest -> [got, total] while a download runs
EPISODE = re.compile(r"^\d{4}-\d{2}-\d{2} - .+\.(mp3|m4a|aac|ogg|opus)$", re.I)
UA = {"User-Agent": "LuCube/1.0 (PC)"}


def jload(f, d):
    try:
        with open(f, encoding="utf-8") as r:
            return json.load(r)
    except (OSError, ValueError):
        return d


def jsave(f, obj):
    os.makedirs(os.path.dirname(f), exist_ok=True)
    with open(f + ".tmp", "w", encoding="utf-8") as w:
        json.dump(obj, w)
    os.replace(f + ".tmp", f)


def fclean(s, n=90):
    """the same file-name rule as the page and the phone: no path characters, single spaces"""
    s = re.sub(r"\s+", " ", re.sub(r'[\\/:*?"<>|\r\n\t]+', " ", str(s or ""))).strip()[:n].strip(" .")
    return s or "track"


def music_path(dest):
    """'Playlist/01 - Song.mp3' -> a path inside Music, or None. Every part is cleaned, so nothing can climb out."""
    parts = [fclean(x) for x in str(dest or "").replace("\\", "/").split("/") if x.strip() and x.strip() not in (".", "..")]
    if len(parts) < 2:
        return None, None
    f = os.path.realpath(os.path.join(MUSIC, *parts))
    if not f.startswith(os.path.realpath(MUSIC) + os.sep):
        return None, None
    return f, parts[0]


def mark_added(name):
    with LLOCK:
        L = jload(ADDED, [])
        if not any(x.lower() == name.lower() for x in L):
            L.append(name)
            jsave(ADDED, L)


def net_open(url, timeout=30):
    if not re.match(r"^https?://", url or ""):
        raise ValueError("not a web address")
    ctx = ssl.create_default_context()
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout, context=ctx)


def download(url, out, prog=None):
    tmp = out + ".part"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    try:
        with net_open(url, 60) as r, open(tmp, "wb") as w:
            total = int(r.headers.get("Content-Length") or 0)
            got = 0
            if prog is not None:
                prog[:] = [0, total]
            while True:
                b = r.read(1 << 16)
                if not b:
                    break
                w.write(b)
                got += len(b)
                if prog is not None:
                    prog[0] = got
        os.replace(tmp, out)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


# ---------- podcasts ----------
def pod_date(s):
    import email.utils
    s = (s or "").strip()
    try:
        return email.utils.parsedate_to_datetime(s)
    except (TypeError, ValueError, IndexError):
        pass
    try:
        import datetime
        return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def pod_feed(url, mx=30):
    import xml.etree.ElementTree as ET
    with net_open(url, 30) as r:
        root = ET.fromstring(r.read(20 << 20))
    out = []
    for it in root.iter("item"):
        en = it.find("enclosure")
        u = en.get("url", "") if en is not None else ""
        ty = (en.get("type", "") if en is not None else "").lower()
        if not u or not ("audio" in ty or re.search(r"\.(mp3|m4a|aac|ogg|opus)$", u.split("?")[0].split("#")[0], re.I)):
            continue
        g = lambda t: (it.findtext(t) or "").strip()
        out.append({"title": g("title") or "Episode", "guid": g("guid") or u, "url": u, "date": pod_date(g("pubDate"))})
        if len(out) >= mx:
            break
    return out


def pod_ext(u):
    u = u.split("?")[0].split("#")[0].lower()
    return next((e for e in (".mp3", ".m4a", ".aac", ".ogg", ".opus") if u.endswith(e)), ".mp3")


def pod_check(only=None):
    """new episodes of every starred show (or one): the newest 10 kept, the first check takes just the newest"""
    with PLOCK:
        P = jload(PODS, {})
        shows, total = [], 0
        for s in P.get("subs", []):
            feed, name = s.get("feed", ""), fclean(s.get("name") or "Podcast", 60)
            if not feed or (only and only != feed):
                continue
            row, got = {"feed": feed, "name": name}, 0
            try:
                eps = pod_feed(feed)
                seen = P.setdefault("seen", {}).get(feed)
                first = seen is None
                seen = list(seen or [])
                want = []
                for e in eps:
                    if e["guid"] in seen:
                        continue
                    if first and len(want) >= 1 or len(want) >= 5:
                        seen.append(e["guid"])
                        continue
                    want.append(e)
                d = os.path.join(MUSIC, name)
                if want:
                    mark_added(name)
                    cov = os.path.join(d, "cover.jpg")
                    if s.get("art") and not os.path.exists(cov):
                        try:
                            download(s["art"], cov)
                        except (OSError, ValueError):
                            pass
                for e in want:
                    out = os.path.join(d, (e["date"].strftime("%Y-%m-%d") if e["date"] else "0000-00-00") + " - " + fclean(e["title"]) + pod_ext(e["url"]))
                    if not os.path.exists(out):
                        download(e["url"], out)
                        got += 1
                    seen.append(e["guid"])
                if first:
                    seen += [e["guid"] for e in eps if e["guid"] not in seen]
                P["seen"][feed] = seen[-400:]
                if os.path.isdir(d):  # a show keeps its 10 newest episodes (other files in the folder are left alone)
                    for f in sorted((f for f in os.listdir(d) if EPISODE.match(f)), key=str.lower, reverse=True)[10:]:
                        try:
                            os.remove(os.path.join(d, f))
                        except OSError:
                            pass
                P.setdefault("checked", {})[feed] = int(time.time() * 1000)
                P.setdefault("last", {})[feed] = got
            except Exception as ex:  # one show that can't be reached doesn't stop the others
                row["error"] = str(ex)[:120]
            row["new"] = got
            total += got
            shows.append(row)
            if got:
                P.setdefault("news", []).append({"show": name, "n": got, "at": int(time.time() * 1000)})
        jsave(PODS, P)
        return {"shows": shows, "total": total}


def pod_loop():
    """while Lu Cube is open: a check soon after it starts, then every 3 hours"""
    time.sleep(30)
    while True:
        if jload(PODS, {}).get("subs"):
            try:
                pod_check()
            except Exception:
                pass
        time.sleep(3 * 3600)


def listen_get(h, path, q):
    arg = lambda k: (q.get(k) or [""])[0]
    if path == "/api/listen":
        return h.send_json(jload(LISTEN, {}))
    if path == "/api/fetch":
        try:
            with net_open(arg("u"), 30) as r:
                b = r.read(12 << 20)
            h.send_response(200)
            h.send_header("Content-Type", "text/plain; charset=utf-8")
            h.send_header("Content-Length", str(len(b)))
            h.end_headers()
            return h.wfile.write(b)
        except Exception as e:
            return h.send_error(502, str(e)[:100])
    if path == "/api/dlprog":
        g = DLP.get(arg("dest"))
        return h.send_json({"got": g[0], "total": g[1]} if g else {})
    if path == "/api/added":
        return h.send_json({"playlists": [x for x in jload(ADDED, []) if os.path.isdir(os.path.join(MUSIC, x))]})
    if path == "/api/pods/status":
        P = jload(PODS, {})
        return h.send_json({s["feed"]: {"checked": P.get("checked", {}).get(s["feed"], 0), "last": P.get("last", {}).get(s["feed"], 0)} for s in P.get("subs", []) if s.get("feed")})
    if path == "/api/pods/news":
        with PLOCK:
            P = jload(PODS, {})
            news = P.pop("news", [])
            jsave(PODS, P)
        return h.send_json({"news": news})
    h.send_error(404)


def listen_post(h, path, q, body):
    arg = lambda k: (q.get(k) or [""])[0]
    if path == "/api/import":  # one picked song, the bytes are the body
        f, pl = music_path(arg("dest"))
        if not f:
            return h.send_error(400)
        os.makedirs(os.path.dirname(f), exist_ok=True)
        with open(f + ".part", "wb") as w:
            w.write(body)
        os.replace(f + ".part", f)
        mark_added(pl)
        return h.send_json({"ok": True})
    try:
        d = json.loads(body or b"{}")
    except ValueError:
        return h.send_error(400)
    if path == "/api/listen":  # the page's notes, a few keys at a time
        with LLOCK:
            L = jload(LISTEN, {})
            for k, v in (d or {}).items():
                if isinstance(k, str) and k.startswith("lu_"):
                    if v is None:
                        L.pop(k, None)
                    else:
                        L[k] = v
            jsave(LISTEN, L)
        return h.send_json({"ok": True})
    if path == "/api/dl":
        f, pl = music_path(d.get("dest"))
        if not f:
            return h.send_error(400)
        key = d.get("dest")
        DLP[key] = [0, 0]
        try:
            download(d.get("url", ""), f, DLP[key])
            mark_added(pl)
            return h.send_json({"ok": True})
        except Exception as e:
            return h.send_error(502, str(e)[:100])
        finally:
            DLP.pop(key, None)
    if path == "/api/removeAdded":  # only a playlist Lu Cube downloaded itself is deleted
        import shutil
        name = str(d.get("playlist") or "")
        with LLOCK:
            L = jload(ADDED, [])
            hit = next((x for x in L if x.lower() == name.lower()), None)
            if hit:
                p = os.path.realpath(os.path.join(MUSIC, hit))
                if p.startswith(os.path.realpath(MUSIC) + os.sep) and os.path.isdir(p):
                    shutil.rmtree(p, ignore_errors=True)
                jsave(ADDED, [x for x in L if x != hit])
        return h.send_json({"ok": bool(hit)})
    if path == "/api/pods/subs":
        with PLOCK:
            P = jload(PODS, {})
            P["subs"] = [{"feed": str(s.get("feed")), "name": str(s.get("name") or "Podcast"), "art": str(s.get("art") or "")} for s in d.get("subs", []) if isinstance(s, dict) and s.get("feed")][:200]
            jsave(PODS, P)
        return h.send_json({"ok": True})
    if path == "/api/pods/check":
        return h.send_json(pod_check(d.get("feed") or None))
    h.send_error(404)


# ---------------- radio: live stations from radio-browser.info, played through this server ----------------
# The station list (top ~30 per country) is fetched once and kept for a week in data/radio/world.json.
# Streams go through /api/radio/play so the cube's visualiser can hear them and so we can read the song titles
# that many stations send along with the audio (ICY metadata).
RADIO_DIR = os.path.join(ROOT, "data", "radio")
WORLD = os.path.join(RADIO_DIR, "world.json")
UA = "LuCube/1.0"
RB_FALLBACK = ("de1.api.radio-browser.info", "de2.api.radio-browser.info", "fi1.api.radio-browser.info", "nl1.api.radio-browser.info")
RB_HOSTS, TITLES, RBUILD = [], {}, {"busy": False, "error": ""}
OK_CODECS = {"MP3", "AAC", "AAC+", "OGG", "OPUS"}
PER_COUNTRY = 30
CNAMES = {"the united states of america": "United States", "the united kingdom of great britain and northern ireland": "United Kingdom",
          "the russian federation": "Russia", "russian federation": "Russia", "the republic of korea": "South Korea", "republic of korea": "South Korea",
          "korea, republic of": "South Korea", "the democratic people's republic of korea": "North Korea", "the netherlands": "Netherlands",
          "iran (islamic republic of)": "Iran", "islamic republic of iran": "Iran", "bolivia (plurinational state of)": "Bolivia",
          "venezuela (bolivarian republic of)": "Venezuela", "viet nam": "Vietnam", "taiwan, republic of china": "Taiwan",
          "taiwan, province of china": "Taiwan", "türkiye": "Turkey", "the philippines": "Philippines", "the democratic republic of the congo": "DR Congo",
          "united republic of tanzania": "Tanzania", "the united republic of tanzania": "Tanzania", "syrian arab republic": "Syria",
          "the syrian arab republic": "Syria", "lao people's democratic republic": "Laos", "the lao people's democratic republic": "Laos",
          "republic of moldova": "Moldova", "the republic of moldova": "Moldova", "the united arab emirates": "United Arab Emirates",
          "the dominican republic": "Dominican Republic", "the czech republic": "Czechia", "the bahamas": "Bahamas", "the gambia": "Gambia",
          "the sudan": "Sudan", "the niger": "Niger", "the comoros": "Comoros", "the congo": "Congo", "the plurinational state of bolivia": "Bolivia",
          "the bolivarian republic of venezuela": "Venezuela", "the islamic republic of iran": "Iran", "palestine, state of": "Palestine",
          "state of palestine": "Palestine", "north macedonia": "North Macedonia", "brunei darussalam": "Brunei", "cabo verde": "Cape Verde",
          "côte d'ivoire": "Ivory Coast", "the central african republic": "Central African Republic", "micronesia (federated states of)": "Micronesia"}


def cnice(n):
    n = (n or "").strip()
    return CNAMES.get(n.lower()) or (n[4:] if n.lower().startswith("the ") else n)


def rb_hosts():
    """radio-browser.info asks apps to pick one of its mirrors from the DNS list."""
    global RB_HOSTS
    if RB_HOSTS:
        return RB_HOSTS
    hs = []
    try:
        for ip in {a[4][0] for a in socket.getaddrinfo("all.api.radio-browser.info", 443, proto=socket.IPPROTO_TCP)}:
            try:
                hs.append(socket.gethostbyaddr(ip)[0])
            except OSError:
                pass
    except OSError:
        pass
    random.shuffle(hs)
    RB_HOSTS = hs + [h for h in RB_FALLBACK if h not in hs]
    return RB_HOSTS


def rb(path, **q):
    last = None
    for h in rb_hosts():
        try:
            req = urllib.request.Request(f"https://{h}{path}?{urllib.parse.urlencode(q)}", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8", "replace"))
        except (OSError, ValueError) as e:
            last = e
    raise OSError(f"can't reach the station directory ({last})")


def num(x):
    try:
        v = float(x)
        return round(v, 3) if v == v else None
    except (TypeError, ValueError):
        return None


def trim(s):
    """Keep what the cube needs from a radio-browser station; drop streams a browser can't play."""
    u = (s.get("url_resolved") or s.get("url") or "").strip()
    codec = (s.get("codec") or "").upper()
    if not u.startswith(("http://", "https://")) or s.get("hls") in (1, "1", True) or codec not in OK_CODECS:
        return None
    name = re.sub(r"\s+", " ", (s.get("name") or "")).strip()[:60]
    if not name:
        return None
    tags = [t.strip() for t in (s.get("tags") or "").split(",") if t.strip()][:5]
    la, lo = num(s.get("geo_lat")), num(s.get("geo_long"))
    if la is not None and lo is not None and (abs(la) > 90 or abs(lo) > 180 or (la == 0 and lo == 0)):
        la = lo = None
    return {"id": s.get("stationuuid", ""), "n": name, "u": u, "t": tags, "st": re.sub(r"\s+", " ", (s.get("state") or "")).strip()[:40],
            "br": int(num(s.get("bitrate")) or 0), "c": codec, "la": la, "lo": lo, "cc": (s.get("countrycode") or "").upper(),
            "v": int(num(s.get("clickcount")) or 0)}


def build_world():
    """One big request for the most-played stations, then a small one for each country that list missed."""
    RBUILD.update(busy=True, error="")
    try:
        names, counts, by = {}, {}, {}
        for c in rb("/json/countries"):
            cc = (c.get("iso_3166_1") or c.get("iso_3166_1_alpha_2") or "").upper()
            if len(cc) == 2 and cnice(c.get("name")):  # a few directory entries have no name; leave them out
                names[cc] = cnice(c.get("name"))
                counts[cc] = counts.get(cc, 0) + int(num(c.get("stationcount")) or 0)

        def add(rows):
            for s in rows:
                t = trim(s)
                if t and t["cc"] in names:
                    by.setdefault(t["cc"], []).append(t)

        add(rb("/json/stations/search", hidebroken="true", order="clickcount", reverse="true", limit="15000"))
        save_world(names, by, True)  # good enough to start listening; the gaps fill in below
        for cc, n in sorted(counts.items(), key=lambda x: -x[1]):
            if n and len(by.get(cc, [])) < 8:
                try:
                    add(rb("/json/stations/search", countrycode=cc, hidebroken="true", order="clickcount", reverse="true", limit="80"))
                except OSError:
                    pass
        save_world(names, by, False)
    except (OSError, ValueError) as e:
        RBUILD["error"] = str(e)[:160]
    finally:
        RBUILD["busy"] = False


def save_world(names, by, partial):
    """Write the station list; partial=True while the smaller countries are still being filled in."""
    out = []
    for cc, rows in by.items():
        seen, keep = set(), []
        for t in sorted(rows, key=lambda x: -x["v"]):
            k = re.sub(r"[^a-z0-9]", "", t["n"].lower())
            if k in seen or t["u"] in seen:
                continue
            seen.update((k, t["u"]))
            keep.append(t)
            if len(keep) >= PER_COUNTRY:
                break
        geo = [(t["la"], t["lo"]) for t in rows if t["la"] is not None]
        lat = sorted(g[0] for g in geo)[len(geo) // 2] if geo else None
        lon = sorted(g[1] for g in geo)[len(geo) // 2] if geo else None
        keep = [{k: v for k, v in t.items() if k not in ("cc", "v")} for t in keep]
        out.append({"cc": cc, "n": names[cc], "lat": lat, "lon": lon, "st": keep})
    out.sort(key=lambda c: c["n"].lower())
    os.makedirs(RADIO_DIR, exist_ok=True)
    with open(WORLD + ".tmp", "w", encoding="utf-8") as w:
        json.dump({"at": time.time(), "partial": partial, "countries": out}, w, ensure_ascii=False)
    os.replace(WORLD + ".tmp", WORLD)


def world_json():
    """The cached list (rebuilt in the background once it's a week old), or {"building": true} the first time."""
    fresh = os.path.isfile(WORLD) and time.time() - os.path.getmtime(WORLD) < 7 * 86400
    if fresh and not RBUILD["busy"]:
        try:  # a list left half-built (the app closed mid-download) gets finished
            with open(WORLD, "rb") as f:
                fresh = b'"partial": true' not in f.read(200)
        except OSError:
            fresh = False
    if not fresh and not RBUILD["busy"]:
        threading.Thread(target=build_world, daemon=True).start()
        RBUILD["busy"] = True
    if os.path.isfile(WORLD):
        with open(WORLD, "rb") as f:
            return f.read()
    return json.dumps({"building": True, "error": "" if RBUILD["busy"] else RBUILD["error"]}).encode()


def rb_search(q):
    rows, seen = [], set()
    for key in ("name", "state", "tag"):
        try:
            for s in rb("/json/stations/search", **{key: q}, hidebroken="true", order="clickcount", reverse="true", limit="25"):
                t = trim(s)
                if t and t["u"] not in seen:
                    seen.add(t["u"])
                    rows.append(t)
        except OSError:
            pass
    return rows[:40]


def rb_click(sid):
    """radio-browser.info counts plays this way; it keeps popular stations near the top for everyone."""
    if re.fullmatch(r"[0-9a-fA-F-]{36}", sid or ""):
        try:
            rb(f"/json/url/{sid}")
        except OSError:
            pass


class ICYResponse(http.client.HTTPResponse):
    """Old Shoutcast servers answer 'ICY 200 OK' instead of 'HTTP/1.0 200 OK'."""
    def _read_status(self):
        line = str(self.fp.readline(65537), "iso-8859-1")
        if not line:
            raise http.client.RemoteDisconnected("the station closed the connection")
        if line.startswith("ICY"):
            line = "HTTP/1.0" + line[3:]
        try:
            version, status, reason = line.split(None, 2)
        except ValueError:
            try:
                version, status = line.split(None, 1)
                reason = ""
            except ValueError:
                raise http.client.BadStatusLine(line)
        if not version.startswith("HTTP/"):
            raise http.client.BadStatusLine(line)
        return version, int(status), reason


def open_stream(url, depth=0, verify=True):
    p = urllib.parse.urlsplit(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        raise OSError("not a stream address")
    path = (p.path or "/") + ("?" + p.query if p.query else "")
    if p.scheme == "https":
        ctx = ssl.create_default_context() if verify else ssl._create_unverified_context()
        conn = http.client.HTTPSConnection(p.hostname, p.port or 443, timeout=15, context=ctx)
    else:
        conn = http.client.HTTPConnection(p.hostname, p.port or 80, timeout=15)
    conn.response_class = ICYResponse
    try:
        conn.request("GET", path, headers={"User-Agent": UA, "Icy-MetaData": "1", "Accept": "*/*"})
        r = conn.getresponse()
    except ssl.SSLError:
        conn.close()
        if verify:  # some stations have broken certificates; it's only audio
            return open_stream(url, depth, False)
        raise
    if r.status in (301, 302, 303, 307, 308) and depth < 5 and r.getheader("Location"):
        loc = urllib.parse.urljoin(url, r.getheader("Location"))
        conn.close()
        return open_stream(loc, depth + 1, verify)
    if r.status != 200:
        conn.close()
        raise OSError(f"the station answered {r.status}")
    return conn, r


def audio_type(ct, url):
    ct = (ct or "").split(";")[0].strip().lower()
    if "aac" in ct:
        return "audio/aac"
    if "ogg" in ct or "opus" in ct:
        return "audio/ogg"
    if "mpeg" in ct or "mp3" in ct:
        return "audio/mpeg"
    return {"aac": "audio/aac", "ogg": "audio/ogg", "opus": "audio/ogg"}.get(url.rsplit(".", 1)[-1].lower(), "audio/mpeg")


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send_json(self, obj):
        b = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if self.headers.get("Host", "").split(":")[0] not in ("127.0.0.1", "localhost"):
            return self.send_error(403)
        path = urllib.parse.unquote(self.path.split("?", 1)[0])
        if path in ("/", "/index.html"):
            return self.page()
        if path.startswith("/fonts/") and re.fullmatch(r"/fonts/[\w.-]+\.woff2", path):
            return self.file(os.path.join(WEB, path.lstrip("/")))
        if path == "/favicon.ico":
            self.send_response(204)
            return self.end_headers()
        if path == "/api/state":
            try:
                return self.send_json(json.load(open(STATE, encoding="utf-8")))
            except (OSError, ValueError):
                return self.send_json({})
        if path == "/api/libsig":  # changes whenever songs are added, removed or renamed, so the page can refresh itself
            n, size, newest = 0, 0, 0.0
            for dp, dn, fn in os.walk(MUSIC):
                newest = max(newest, os.path.getmtime(dp))
                for f in fn:
                    try:
                        st = os.stat(os.path.join(dp, f))
                    except OSError:
                        continue
                    n, size, newest = n + 1, size + st.st_size, max(newest, st.st_mtime)
            b = f"{n}-{size}-{int(newest)}".encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            return self.wfile.write(b)
        if path.startswith("/api/radio/"):
            return self.radio(path, urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else ""))
        if path.startswith("/listen/") and re.fullmatch(r"/listen/[\w.-]+\.(js|css)", path):
            return self.file(os.path.join(WEB, path.lstrip("/")))
        if path in ("/api/listen", "/api/fetch", "/api/dlprog", "/api/added") or path.startswith("/api/pods/"):
            return listen_get(self, path, urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else ""))
        if path == "/api/library":
            return self.send_json({"playlists": library(), "music": MUSIC})
        if path.startswith("/media/"):
            f = os.path.realpath(os.path.join(MUSIC, path[len("/media/"):]))
            if not f.startswith(os.path.realpath(MUSIC) + os.sep):
                return self.send_error(403)
            return self.file(f)
        self.send_error(404)

    def do_POST(self):
        """Saves favourites and volume (state.json next to this script)."""
        if self.headers.get("Host", "").split(":")[0] not in ("127.0.0.1", "localhost"):
            return self.send_error(403)
        lp = urllib.parse.unquote(self.path.split("?", 1)[0])
        if lp in ("/api/listen", "/api/import", "/api/dl", "/api/removeAdded") or lp.startswith("/api/pods/"):
            n = int(self.headers.get("Content-Length") or 0)
            if n > (2 << 30):
                return self.send_error(413)
            body = self.rfile.read(n) if n else b""
            return listen_post(self, lp, urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else ""), body)
        if self.path != "/api/state":
            return self.send_error(403)
        try:
            n = min(int(self.headers.get("Content-Length", 0)), 1 << 20)
            d = json.loads(self.rfile.read(n) or b"{}")
            st = {"favs": [x for x in d.get("favs", []) if isinstance(x, str)][:5000], "vol": max(0.0, min(1.0, float(d.get("vol", 1)))), "shuf": bool(d.get("shuf")),
                  "xf": max(0, min(10, int(d.get("xf") or 0)))}
            try:  # keep the weather town set by "Set Weather Town.bat"
                old = json.load(open(STATE, encoding="utf-8"))
                if isinstance(old.get("place"), dict):
                    st["place"] = old["place"]
                for k in ("radio", "mode"):  # kept unless the page sends newer ones
                    if k in old:
                        st[k] = old[k]
            except (OSError, ValueError):
                pass
            for k in ("last", "ui"):  # where you left off, and where the cube/sun were
                if isinstance(d.get(k), dict) and len(json.dumps(d[k])) < 4000:
                    st[k] = d[k]
            if isinstance(d.get("radio"), dict) and len(json.dumps(d["radio"])) < 400000:  # passport, wake-up, saved stations
                st["radio"] = d["radio"]
            if d.get("mode") in ("lu", "radio"):
                st["mode"] = d["mode"]
            with open(STATE + ".tmp", "w", encoding="utf-8") as w:
                json.dump(st, w)
            os.replace(STATE + ".tmp", STATE)
            self.send_json({"ok": True})
        except (ValueError, OSError, TypeError):
            self.send_error(400)

    def radio(self, path, q):
        arg = lambda k: (q.get(k) or [""])[0]
        if path == "/api/radio/world":
            b = world_json()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            return self.wfile.write(b)
        if path == "/api/radio/search":
            return self.send_json({"results": rb_search(arg("q")[:60]) if arg("q").strip() else []})
        if path == "/api/radio/title":
            t = TITLES.get(arg("u"))
            return self.send_json({"t": t[0] if t and time.time() - t[1] < 900 else ""})
        if path == "/api/radio/play":
            return self.stream(arg("u"), arg("i"))
        self.send_error(404)

    def stream(self, url, sid):
        """Relay a live station to the page, lifting out the song titles the station mixes into the stream."""
        try:
            conn, r = open_stream(url)
        except (OSError, http.client.HTTPException, ValueError) as e:
            return self.send_error(502, str(e)[:120])
        try:
            mi = int(r.getheader("icy-metaint") or 0)
        except ValueError:
            mi = 0
        self.send_response(200)
        self.send_header("Content-Type", audio_type(r.getheader("Content-Type"), url))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        threading.Thread(target=rb_click, args=(sid,), daemon=True).start()
        try:
            while True:
                if mi:
                    buf = r.read(mi)
                    if not buf:
                        break
                    self.wfile.write(buf)
                    ln = r.read(1)
                    if not ln:
                        break
                    if ln[0]:
                        meta = r.read(ln[0] * 16)
                        m = re.search(rb"StreamTitle='(.*?)';", meta, re.S)
                        if m:
                            TITLES[url] = (m.group(1).decode("utf-8", "replace").strip(), time.time())
                else:
                    buf = r.read1(16384)
                    if not buf:
                        break
                    self.wfile.write(buf)
        except (OSError, http.client.HTTPException, ValueError):
            pass  # you changed station (or the station dropped): hang up
        finally:
            conn.close()

    def page(self):
        """the cube's page, with the PC's listening layer (Add Music, the finders, audiobooks and podcasts) added in"""
        html = open(os.path.join(WEB, "index.html"), encoding="utf-8").read()
        L = os.path.join(WEB, "listen")
        if os.path.isdir(L):
            html = html.replace("</head>", '<link rel="stylesheet" href="/listen/listen.css"><link rel="stylesheet" href="/listen/pc.css"><script src="/listen/pc.js"></script>\n</head>', 1)
            i = html.rindex("</body>")
            html = html[:i] + "".join(f'<script src="/listen/{n}"></script>' for n in ("addmusic.js", "finder.js", "spoken.js", "pc-late.js")) + "\n" + html[i:]
        b = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def file(self, f):
        """Serve a file, with byte ranges so you can seek inside long recordings."""
        if not os.path.isfile(f):
            return self.send_error(404)
        size = os.path.getsize(f)
        ctype = mimetypes.guess_type(f)[0] or ("audio/flac" if f.lower().endswith(".flac") else "application/octet-stream")
        if f.lower().endswith(".lrc"):
            ctype = "text/plain; charset=utf-8"
        start, end = 0, size - 1
        m = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if m and size:
            if m.group(1):
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else size - 1
            else:
                start = max(0, size - int(m.group(2)))
            end = min(end, size - 1)
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        try:
            with open(f, "rb") as r:
                r.seek(start)
                left = end - start + 1
                while left > 0:
                    chunk = r.read(min(1 << 16, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (ConnectionError, OSError):
            pass


def edge():
    for p in (os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
              os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")):
        if os.path.exists(p):
            return p
    return None


US = {"AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "ON": "Ontario", "QC": "Quebec", "BC": "British Columbia", "AB": "Alberta", "NS": "Nova Scotia", "MB": "Manitoba"}


def set_town(text):
    """'Westfield, NY' -> looks the town up (Open-Meteo's free place search) and saves it for the weather look."""
    name, _, region = (x.strip() for x in text.partition(","))
    region = US.get(region.upper(), region)
    q = urllib.parse.urlencode({"name": name, "count": 20, "language": "en", "format": "json"})
    try:
        with urllib.request.urlopen("https://geocoding-api.open-meteo.com/v1/search?" + q, timeout=15) as r:
            hits = json.load(r).get("results") or []
    except (OSError, ValueError):
        print("Couldn't reach the town lookup. Check your internet and try again.")
        return
    if region:
        hits = [h for h in hits if region.lower() in (h.get("admin1", "") + " " + h.get("country", "") + " " + h.get("country_code", "")).lower()] or hits
    if not hits:
        print("Couldn't find that town. Try 'Town, ST' like 'Buffalo, NY'.")
        return
    h = hits[0]
    try:
        st = json.load(open(STATE, encoding="utf-8"))
    except (OSError, ValueError):
        st = {}
    st["place"] = {"name": h["name"], "region": h.get("admin1", ""), "lat": h["latitude"], "lon": h["longitude"]}
    with open(STATE, "w", encoding="utf-8") as w:
        json.dump(st, w)
    print(f"Weather set to {h['name']}, {h.get('admin1', '')} ({h.get('country', '')}). Restart Lu Cube to see it.")


# ---------- Phone Sync: the Lu Cube phone app copies your songs and swaps passport stamps over Wi-Fi ----------
SYNC_PORT = 8766


def sync_code():
    f = os.path.join(ROOT, "data", "phone_code.txt")
    try:
        c = open(f, encoding="utf-8").read().strip()
        if re.fullmatch(r"\d{4}", c):
            return c
    except OSError:
        pass
    c = f"{random.randint(0, 9999):04d}"
    os.makedirs(os.path.dirname(f), exist_ok=True)
    with open(f, "w", encoding="utf-8") as w:
        w.write(c)
    return c


def _book_names():
    """the audiobooks Get Audiobooks.bat downloads, by folder name"""
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("lu_books", os.path.join(os.path.dirname(os.path.abspath(__file__)), "get_audiobooks.py"))
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        return {m.clean(b).lower() for b in m.BOOKS}
    except Exception:
        return set()


BOOK_NAMES = None


def is_book(dp, songs):
    """an audiobook folder: marked by Get Audiobooks, one of its titles, or mostly chapters"""
    global BOOK_NAMES
    if BOOK_NAMES is None:
        BOOK_NAMES = _book_names()
    if os.path.exists(os.path.join(dp, ".audiobook")) or os.path.exists(os.path.join(dp, "AUDIOBOOK.txt")):
        return True
    if os.path.basename(dp).lower() in BOOK_NAMES:
        return True
    ch = sum(1 for f in songs if re.search(r"chapter|kapitel|chapitre|capitulo|\bch\.? ?\d", f, re.I))
    return len(songs) >= 5 and ch >= len(songs) / 2



def copy_music(dest):
    """Make Lu Cube Stick.bat: copy your music to the stick, leaving the audiobooks behind. Only new or changed files."""
    import shutil
    n = skipped = 0
    for name in sorted(os.listdir(MUSIC), key=str.lower):
        src = os.path.join(MUSIC, name)
        if os.path.isdir(src):
            files = [f for _, _, fs in os.walk(src) for f in fs]
            if is_book(src, files):
                skipped += 1
                print("  skipping audiobook:", name)
                continue
            print("  " + name)
        for root, _, fs in (os.walk(src) if os.path.isdir(src) else [(MUSIC, None, [name])]):
            for f in fs:
                a = os.path.join(root, f)
                b = os.path.join(dest, os.path.relpath(a, MUSIC))
                try:
                    if os.path.exists(b) and os.path.getsize(b) == os.path.getsize(a):
                        continue
                    os.makedirs(os.path.dirname(b), exist_ok=True)
                    shutil.copyfile(a, b)   # data only: USB sticks reject some Windows file attributes
                    n += 1
                except OSError as e:
                    print("    couldn't copy", f, "-", e)
    print(f"Copied {n} file(s). Left {skipped} audiobook folder(s) on this computer.")

def sync_files(books=False):
    """what Phone Sync copies: your music, audiobooks and podcasts (with covers). (books=True is from when audiobooks
    stayed on the PC: nothing is listed as one to take off the phone any more.)"""
    out = []
    if books:
        return out
    for dp, dn, fn in os.walk(MUSIC):
        dn.sort(key=str.lower)
        songs = [f for f in sorted(fn, key=str.lower) if f.lower().endswith(AUDIO)]
        for f in songs:
            full = os.path.join(dp, f)
            out.append({"p": os.path.relpath(full, MUSIC).replace(os.sep, "/"), "s": os.path.getsize(full)})
        # the folder's cover goes too (the same picture the PC shows), so the phone's playlist has it
        if songs:
            cov = next((c for c in COVERS if os.path.exists(os.path.join(dp, c))), None) or \
                next((f for f in sorted(fn, key=str.lower) if f.lower().endswith((".jpg", ".jpeg", ".png"))), None)
            if cov:
                full = os.path.join(dp, cov)
                out.append({"p": os.path.relpath(full, MUSIC).replace(os.sep, "/"), "s": os.path.getsize(full), "img": 1})
    return out


def sync_listen(theirs):
    """Audiobooks and podcasts, both ways: where you are in each chapter / episode, which one each book or show is on,
    what kind each playlist is, and your podcast subscriptions. Files are named the same on both sides ('Folder/file'),
    so that's the key; the newer spot wins."""
    if not isinstance(theirs, dict):
        return {}
    key = lambda src: urllib.parse.unquote(src[len("/media/"):]).lower() if isinstance(src, str) and src.startswith("/media/") else None
    with LLOCK:
        L = jload(LISTEN, {})
        pos, res = L.get("lu_pos") or {}, L.get("lu_resume") or {}
        mine = {key(k): (k, v) for k, v in pos.items() if key(k) and isinstance(v, dict)}
        src_of = {k: k2 for k, (k2, v) in mine.items()}
        for k, v in (theirs.get("pos") or {}).items():
            if not isinstance(v, dict):
                continue
            k = k.lower()
            have = mine.get(k)
            if have is None or (v.get("at") or 0) > (have[1].get("at") or 0):
                src = src_of.get(k) or "/media/" + urllib.parse.quote(k)
                if have is None:  # a file the PC has under a different case: find its real name
                    for root, _, fs in os.walk(MUSIC):
                        for f in fs:
                            rel = os.path.relpath(os.path.join(root, f), MUSIC).replace(os.sep, "/")
                            if rel.lower() == k:
                                src = "/media/" + urllib.parse.quote(rel)
                pos[src] = v
                mine[k] = (src, v)
                src_of[k] = src
        at = lambda k: (mine.get(k, (None, {}))[1] or {}).get("at") or 0
        for pl, k in (theirs.get("resume") or {}).items():
            k, mk = str(k).lower(), key(res.get(pl.lower(), ""))
            if not mk or at(k) >= at(mk):
                if k in src_of:
                    res[pl.lower()] = src_of[k]
        kinds = L.get("lu_kinds") or {}
        kinds.update({str(n).lower(): v for n, v in (theirs.get("kinds") or {}).items() if v in ("music", "book", "pod")})
        subs = list(L.get("lu_pod_subs") or [])
        have = {x.get("feed") for x in subs if isinstance(x, dict)}
        for x in theirs.get("subs") or []:
            if isinstance(x, dict) and x.get("feed") and x["feed"] not in have:
                subs.append({"feed": x["feed"], "name": x.get("name") or "Podcast", "art": x.get("art") or ""})
                have.add(x["feed"])
        L.update({"lu_pos": pos, "lu_resume": res, "lu_kinds": kinds, "lu_pod_subs": subs})
        jsave(LISTEN, L)
    with PLOCK:
        P = jload(PODS, {})
        P["subs"] = subs
        jsave(PODS, P)
    return {"pos": {key(k): v for k, v in pos.items() if key(k)}, "resume": {pl: key(src) for pl, src in res.items() if key(src)}, "kinds": kinds, "subs": subs}


def sync_merge(mine):
    """Everything from both sides: every stamp, every favourite, every caught song (and, from sync_listen, your place
    in every audiobook and podcast)."""
    try:
        st = json.load(open(STATE, encoding="utf-8"))
    except (OSError, ValueError):
        st = {}
    r = st.setdefault("radio", {})
    pas = r.get("pass") if isinstance(r.get("pass"), dict) else {}
    for k, v in (mine.get("pass") or {}).items():
        if not isinstance(v, dict):
            continue
        if k not in pas:
            pas[k] = v
        else:
            cs = pas[k].setdefault("cities", [])
            for c in v.get("cities") or []:
                if c not in cs and len(cs) < 40:
                    cs.append(c)
    r["pass"] = pas
    # the PC plays stations through its relay (/api/radio/play?u=…&i=…); the phone plays the stream address itself
    ids = {}
    try:
        for c in json.load(open(WORLD, encoding="utf-8")).get("countries", []):
            for t in c.get("st", []):
                ids[t["u"]] = t.get("id", "")
    except (OSError, ValueError, KeyError):
        pass
    raw = lambda x: urllib.parse.parse_qs(urllib.parse.urlparse(x).query).get("u", [x])[0] if x.startswith("/api/radio/play") else x
    relay = lambda u: "/api/radio/play?u=" + urllib.parse.quote(u, safe="!*'()") + "&i=" + urllib.parse.quote(ids.get(u, ""), safe="!*'()")
    favs = [x for x in r.get("favs") or [] if isinstance(x, str)]
    have = {raw(x) for x in favs}
    for u in mine.get("rfavs") or []:
        if isinstance(u, str) and u.startswith("http") and u not in have:
            favs.append(relay(u))
            have.add(u)
    r["favs"] = favs
    caught = r.get("caught") if isinstance(r.get("caught"), list) else []
    caught += [c for c in st.pop("caught", []) or [] if isinstance(c, dict)]  # older syncs kept them at the top
    seen = {(c.get("t"), c.get("at")) for c in caught if isinstance(c, dict)}
    for c in mine.get("caught") or []:
        if isinstance(c, dict) and (c.get("t"), c.get("at")) not in seen:
            caught.append(c)
            seen.add((c.get("t"), c.get("at")))
    r["caught"] = sorted(caught, key=lambda c: c.get("at") or 0)[-200:]
    with open(STATE + ".tmp", "w", encoding="utf-8") as w:
        json.dump(st, w)
    os.replace(STATE + ".tmp", STATE)
    return {"pass": pas, "rfavs": [raw(x) for x in favs], "caught": r["caught"], **({"listen": sync_listen(mine["listen"])} if mine.get("listen") else {})}


class SyncH(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def reply(self, obj, code=200):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def ok(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if (q.get("c") or [""])[0] != CODE:
            self.reply({"ok": False, "error": "That code doesn't match the one on your PC."}, 403)
            return None, None
        return u.path, q

    def do_GET(self):
        path, q = self.ok()
        if path is None:
            return
        if path == "/sync/hello":
            files = sync_files()
            print(f"  phone connected from {self.client_address[0]}", flush=True)
            return self.reply({"ok": True, "name": socket.gethostname(), "songs": len([x for x in files if not x.get("img")])})
        if path == "/sync/library":
            return self.reply({"files": sync_files(), "books": [f["p"] for f in sync_files(True)]})
        if path == "/sync/file":
            f = os.path.realpath(os.path.join(MUSIC, (q.get("p") or [""])[0]))
            if not f.startswith(os.path.realpath(MUSIC) + os.sep) or not os.path.isfile(f):
                return self.reply({"error": "no such song"}, 404)
            print("  sending", os.path.relpath(f, MUSIC), flush=True)
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(f)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(os.path.getsize(f)))
            self.end_headers()
            with open(f, "rb") as r:
                while True:
                    b = r.read(1 << 16)
                    if not b:
                        break
                    self.wfile.write(b)
            return
        self.reply({"error": "unknown"}, 404)

    def do_POST(self):
        path, q = self.ok()
        if path is None:
            return
        n = int(self.headers.get("Content-Length") or 0)
        try:
            mine = json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            mine = {}
        if path == "/sync/state":
            print("  passport, favourites, caught songs" + (", audiobooks and podcasts" if mine.get("listen") else "") + " merged", flush=True)
            return self.reply(sync_merge(mine))
        self.reply({"error": "unknown"}, 404)


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.168.0.1", 80))
        return s.getsockname()[0]
    except OSError:
        return socket.gethostbyname(socket.gethostname())
    finally:
        s.close()


def phone_sync():
    global CODE
    CODE = sync_code()
    srv = ThreadingHTTPServer(("0.0.0.0", SYNC_PORT), SyncH)
    print("\n  LU CUBE  PHONE SYNC\n")
    print(f"  On your phone: Lu Cube > settings (gear) > Sync with your PC")
    print(f"     address:  {lan_ip()}:{SYNC_PORT}")
    print(f"     code:     {CODE}\n")
    print(f"  {len(sync_files())} songs ready. Same Wi-Fi as the phone. Close this window when you're done.\n", flush=True)
    srv.serve_forever()


CODE = ""


def take_stick_stuff():
    """A stick made on your main PC carries your stuff (mystuff.json): favourites, saved stations, caught songs,
    passport stamps, wake-up alarm, weather town and settings. Fold it into this computer's state.json once."""
    f = os.path.join(ROOT, "mystuff.json")
    if not os.path.exists(f):
        return
    try:
        new = json.load(open(f, encoding="utf-8"))
        try:
            st = json.load(open(STATE, encoding="utf-8"))
        except (OSError, ValueError):
            st = {}

        def union(a, b, key=lambda x: json.dumps(x, sort_keys=True)):
            seen, out = set(), []
            for x in (b or []) + (a or []):  # the stick's order first, then anything only this computer had
                k = key(x)
                if k not in seen:
                    seen.add(k)
                    out.append(x)
            return out

        st["favs"] = union(st.get("favs"), new.get("favs"))
        for k in ("vol", "shuf", "xf", "place", "mode"):
            if k in new:
                st[k] = new[k]
        if not st.get("last") and new.get("last"):
            st["last"] = new["last"]
        r, nr = st.get("radio") if isinstance(st.get("radio"), dict) else {}, new.get("radio") or {}
        if nr:
            r["favs"] = union(r.get("favs"), nr.get("favs"))
            r["caught"] = sorted(union(r.get("caught"), nr.get("caught"), key=lambda c: (c.get("t"), c.get("at"))), key=lambda c: c.get("at") or 0)
            r["finfo"] = {**(r.get("finfo") or {}), **(nr.get("finfo") or {})}
            ps = dict(r.get("pass") or {})
            for n, v in (nr.get("pass") or {}).items():
                old = ps.get(n)
                ps[n] = v if not old else {**v, "d": old.get("d") or v.get("d"), "cities": union(old.get("cities"), v.get("cities"))}
            r["pass"] = ps
            for k in ("al", "tier", "gi"):
                if k in nr:
                    r[k] = nr[k]
            if not r.get("last") and nr.get("last"):
                r["last"] = nr["last"]
            st["radio"] = r
        with open(STATE + ".tmp", "w", encoding="utf-8") as w:
            json.dump(st, w)
        os.replace(STATE + ".tmp", STATE)
        os.replace(f, os.path.join(ROOT, "mystuff.applied.json"))
    except (OSError, ValueError, TypeError, AttributeError):
        pass


def main():
    if "--phone-sync" in sys.argv:
        return phone_sync()
    if "--copy-music" in sys.argv:
        return copy_music(sys.argv[sys.argv.index("--copy-music") + 1])
    if "--set-town" in sys.argv:
        return set_town(" ".join(sys.argv[sys.argv.index("--set-town") + 1:]))
    take_stick_stuff()
    srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
    url = f"http://127.0.0.1:{srv.server_address[1]}/"
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    threading.Thread(target=pod_loop, daemon=True).start()
    if "--no-window" in sys.argv:
        print(url, flush=True)
        threading.Event().wait()
    e = edge()
    if not e:
        import webbrowser
        webbrowser.open(url)
        threading.Event().wait()
    prof = os.path.join(ROOT, "data", "edge")
    os.makedirs(prof, exist_ok=True)
    w = subprocess.Popen([e, "--app=" + url, "--user-data-dir=" + prof, "--no-first-run", "--window-size=1280,800", "--autoplay-policy=no-user-gesture-required"])
    w.wait()  # the window closed: stop
    srv.shutdown()


if __name__ == "__main__":
    main()
