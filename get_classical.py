"""Music Cube: downloads public-domain classical recordings from the Internet Archive into Music\\, one folder per album.

Only items whose licence is public domain (CC0 or the Public Domain Mark) are taken, and every folder gets a
CREDITS.txt saying where it came from. Safe to stop with Ctrl+C and run again: finished files are skipped.
Usage: get_classical.py [GB to download, default 2] [mp3|flac] [classical|lofi]
Lofi takes Creative Commons albums (fine for personal listening) and never soundtrack covers or remixes of copyrighted music.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
MUSIC = os.path.join(ROOT, "Music")
UA = {"User-Agent": "MusicCube/1.0 (personal offline player)"}
PD = re.compile(r"publicdomain|/zero/", re.I)
# audiobooks (LibriVox and similar) are public domain too, but they aren't music: never take them
CC = re.compile(r"creativecommons\.org/(licenses|publicdomain)/", re.I)
# lofi covers of film, anime and game music aren't licensed even when uploaded under CC: never take them
COVERS = re.compile(r"ghibli|hisaishi|totoro|spirited away|howl|mononoke|anime|soundtrack|\bost\b|\bcover(s)?\b|nintendo|zelda|pokemon|minecraft|disney|pixar|naruto|one piece|final fantasy|lofi girl", re.I)
NOT_MUSIC = re.compile(r"librivox|audiobook|audio_book|spoken|poetry|lecture|podcast|sermon|radio drama|oldtimeradio|audio_religion", re.I)


def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return r.read()
        except Exception:
            if k == tries - 1:
                raise
            time.sleep(4 * (k + 1))


def fetch_to(url, dst):
    """Stream a file to disk in chunks (so Ctrl+C stops at once), showing progress; .part until it's complete."""
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r, open(dst + ".part", "wb") as w:
        total, got = int(r.headers.get("Content-Length") or 0), 0
        while True:
            chunk = r.read(1 << 16)
            if not chunk:
                break
            w.write(chunk)
            got += len(chunk)
            if total:
                print(f"\r       {got / 1e6:6.1f} / {total / 1e6:.1f} MB", end="", flush=True)
    print("\r" + " " * 40 + "\r", end="")
    os.replace(dst + ".part", dst)


def search(kind, rows=500):
    if kind == "lofi":
        q = ('(subject:(lofi) OR subject:("lo-fi") OR subject:("lo fi") OR subject:(chillhop) OR subject:("chill hop") OR subject:("lofi hip hop") OR subject:("chillout")) '
             'AND mediatype:(audio) AND licenseurl:(*creativecommons.org*) '
             'AND NOT collection:(librivoxaudio) AND NOT subject:(librivox) AND NOT subject:(audiobook)')
    else:
        q = ('(musopen OR subject:("classical music") OR subject:(symphony) OR subject:(concerto) OR subject:(sonata) OR subject:(orchestra) '
             'OR subject:(piano) OR subject:(opera) OR subject:(baroque)) AND mediatype:(audio) AND (licenseurl:(*publicdomain*) OR licenseurl:(*zero*)) '
             'AND NOT collection:(librivoxaudio) AND NOT collection:(audio_bookspoetry) AND NOT subject:(librivox) AND NOT subject:(audiobook)')
    url = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(
        [("q", q), ("fl[]", "identifier"), ("fl[]", "title"), ("sort[]", "downloads desc"), ("rows", rows), ("output", "json")])
    return json.loads(get(url))["response"]["docs"]


def safe(s, n=80):
    s = re.sub(r'[\\/:*?"<>|\r\n\t]+', " ", str(s or "")).strip(" .")
    return (s[:n].strip(" .") or "untitled")


def secs(v):
    try:
        if ":" in str(v):
            p = [float(x) for x in str(v).split(":")]
            return int(p[-1] + 60 * p[-2] + (3600 * p[-3] if len(p) > 2 else 0))
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def main():
    gb = float(sys.argv[1]) if len(sys.argv) > 1 else 2
    kind = (sys.argv[3] if len(sys.argv) > 3 else "classical").lower()
    want = (sys.argv[2] if len(sys.argv) > 2 else "mp3").lower()
    budget, used = gb * 1e9, 0
    os.makedirs(MUSIC, exist_ok=True)
    print(f"Looking for {'Creative Commons lofi albums' if kind == 'lofi' else 'public-domain classical recordings'} (up to about {gb:g} GB, {want.upper()})...")
    docs = search(kind)
    print(f"Found {len(docs)} candidate albums.\n")
    for d in docs:
        if used >= budget:
            break
        ident = d["identifier"]
        try:
            meta = json.loads(get("https://archive.org/metadata/" + urllib.parse.quote(ident)))
        except Exception as e:
            print("  skip", ident, "-", e)
            continue
        md = meta.get("metadata", {})
        lic = md.get("licenseurl", "")
        if not (CC.search(lic) if kind == "lofi" else PD.search(lic)):  # checked again on the item itself, not just the search hit
            continue
        tags = " ".join(str(x) for k in ("collection", "subject", "title", "description") for x in (md.get(k) if isinstance(md.get(k), list) else [md.get(k) or ""]))
        who = (md.get("creator") if isinstance(md.get("creator"), str) else " ".join(md.get("creator") or [])) or ""
        if not who.strip() or re.search(r"various|unknown|anonymous", who, re.I) or re.search(r"\b(mix|compilation|best of|greatest|top \d+|playlist)\b", str(md.get("title", "")), re.I):
            # uncredited mixes are usually copied from commercial CDs: the pieces are public domain, the recordings often aren't
            print("  skip (no performer credited, licence can't be trusted):", md.get("title", ident))
            continue
        if NOT_MUSIC.search(tags) or "librivox" in ident.lower() or any("librivox" in str(f.get("format", "")).lower() for f in meta.get("files", [])):
            print("  skip (not music):", md.get("title", ident))
            continue
        files = meta.get("files", [])
        fmts = {"flac": ["Flac", "24bit Flac"], "mp3": ["VBR MP3", "MP3", "128Kbps MP3", "64Kbps MP3"]}[want if want in ("mp3", "flac") else "mp3"]
        tracks = [f for f in files if f.get("format") in fmts] or [f for f in files if f.get("format") == "Ogg Vorbis"]
        if not tracks:
            continue
        tracks.sort(key=lambda f: (str(f.get("track", "")).zfill(4), f["name"]))
        title = md.get("title") if isinstance(md.get("title"), str) else ident
        creator = md.get("creator") if isinstance(md.get("creator"), str) else ", ".join(md.get("creator") or []) or "Unknown"
        if kind == "lofi" and COVERS.search(tags):
            print("  skip (covers or soundtrack music):", md.get("title", ident))
            continue
        folder = os.path.join(MUSIC, ("Lofi - " if kind == "lofi" else "") + safe(title))
        print(f"[{used / 1e9:5.2f} GB] {title}  ({len(tracks)} tracks)")
        out = []
        for f in tracks:
            if used >= budget:
                break
            name = safe(os.path.basename(f["name"]), 120)
            dst = os.path.join(folder, name)
            size = int(f.get("size") or 0)
            if not (os.path.exists(dst) and (not size or os.path.getsize(dst) == size)):
                try:
                    os.makedirs(folder, exist_ok=True)  # only once something is actually arriving
                    fetch_to(f"https://archive.org/download/{urllib.parse.quote(ident)}/{urllib.parse.quote(f['name'])}", dst)
                    print("     +", name)
                except KeyboardInterrupt:
                    raise
                except Exception as e:
                    print("     ! couldn't get", name, "-", e)
                    continue
            used += os.path.getsize(dst)
            out.append({"file": name, "title": f.get("title") or os.path.splitext(name)[0], "artist": f.get("artist") or f.get("creator") or creator,
                        "length": secs(f.get("length"))})
        if not out:
            if os.path.isdir(folder) and not os.listdir(folder):
                os.rmdir(folder)
            continue
        art = next((f for f in files if f.get("format") in ("JPEG", "PNG", "JPEG Thumb")), None) or next((f for f in files if f.get("format") == "Item Tile"), None)
        if art and not os.path.exists(os.path.join(folder, "cover.jpg")):
            try:
                open(os.path.join(folder, "cover.jpg"), "wb").write(get(f"https://archive.org/download/{urllib.parse.quote(ident)}/{urllib.parse.quote(art['name'])}"))
            except Exception:
                pass
        json.dump(out, open(os.path.join(folder, "playlist.json"), "w", encoding="utf-8"), indent=1)
        open(os.path.join(folder, "CREDITS.txt"), "w", encoding="utf-8").write(
            f"{title}\n{creator}\nLicence: {lic}\nSource: https://archive.org/details/{ident}\nDownloaded by Music Cube for personal listening.\n")
    print(f"\nDone. About {used / 1e9:.2f} GB in {MUSIC}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped. Run it again any time to carry on.")
