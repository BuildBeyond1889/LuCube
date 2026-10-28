r"""Lu Cube: pulls public-domain LibriVox audiobooks from the Internet Archive.
Each book gets its own folder in Music\<Book Title>\ with its chapters (001 - ....mp3, in order)
and cover.jpg, which Lu Cube shows on the album face. Safe to re-run: finished files are skipped."""
import json, os, re, sys, urllib.parse, urllib.request

MUSIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Music")
BOOKS = [
 # novels & epics
 "Robinson Crusoe", "War and Peace", "Pride and Prejudice", "Moby Dick", "Don Quixote", "Les Miserables",
 "Crime and Punishment", "The Brothers Karamazov", "Anna Karenina", "Great Expectations", "A Tale of Two Cities",
 "Jane Eyre", "Wuthering Heights", "Frankenstein", "Dracula", "The Count of Monte Cristo", "The Three Musketeers",
 "Treasure Island", "Huckleberry Finn", "Tom Sawyer", "The Odyssey", "The Iliad", "The Divine Comedy", "Paradise Lost",
 "Ulysses", "Middlemarch", "Emma", "Sense and Sensibility", "The Picture of Dorian Gray", "Heart of Darkness",
 "The Scarlet Letter", "Little Women", "Gulliver's Travels", "The Time Machine", "The War of the Worlds",
 "Twenty Thousand Leagues Under the Sea", "Around the World in Eighty Days", "The Adventures of Sherlock Holmes",
 "Alice's Adventures in Wonderland", "The Call of the Wild", "Walden", "Meditations", "The Art of War",
 "The Republic", "The Prince", "Beowulf", "The Canterbury Tales", "Leaves of Grass", "Bleak House", "Oliver Twist",
 # religious & sacred texts (English)
 "Bible King James Version", "Quran", "Bhagavad Gita", "Tao Te Ching", "Dhammapada", "Upanishads",
 "Analects of Confucius", "Book of Mormon", "Epic of Gilgamesh", "Egyptian Book of the Dead",
]

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "LuCube-audiobooks/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def clean(s):
    return re.sub(r'[<>:"/\\|?*]', "", s).strip().rstrip(".")[:90] or "Untitled"

def find(title):
    q = f'collection:(librivoxaudio) AND title:({title}) AND mediatype:(audio)'
    url = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(
        {"q": q, "fl[]": ["identifier", "title"], "sort[]": "downloads desc", "rows": 1, "output": "json"}, doseq=True)
    docs = json.loads(get(url))["response"]["docs"]
    return docs[0] if docs else None

def tracknum(f):
    t = str(f.get("track", "")).split("/")[0]
    m = re.match(r"\d+", t) or re.search(r"_(\d+)_", f["name"]) or re.search(r"(\d+)", f["name"])
    return int(m.group(1) if m.lastindex else m.group(0)) if m else 9999

def fetch_book(title):
    hit = find(title)
    if not hit:
        print("  not found on LibriVox:", title); return
    ident = hit["identifier"]
    meta = json.loads(get(f"https://archive.org/metadata/{ident}"))
    files = meta.get("files", [])
    folder = os.path.join(MUSIC, clean(title))
    os.makedirs(folder, exist_ok=True)
    open(os.path.join(folder, ".audiobook"), "w").write("LibriVox audiobook: Lu Cube keeps it on the PC when it syncs a phone\n")
    # chapters: the 64kbps mp3s (fall back to any mp3), in track order
    mp3 = [f for f in files if f.get("format") == "64Kbps MP3"] or [f for f in files if f["name"].lower().endswith(".mp3")]
    mp3.sort(key=lambda f: (tracknum(f), f["name"]))
    # cover: the biggest jpg that isn't a thumbnail
    jpgs = [f for f in files if f["name"].lower().endswith((".jpg", ".jpeg")) and "thumb" not in f["name"].lower()]
    jpgs.sort(key=lambda f: -int(f.get("size", 0) or 0))
    base = f"https://archive.org/download/{ident}/"
    if jpgs and not os.path.exists(os.path.join(folder, "cover.jpg")):
        try: open(os.path.join(folder, "cover.jpg"), "wb").write(get(base + urllib.parse.quote(jpgs[0]["name"])))
        except Exception as e: print("  no cover:", e)
    print(f"  {len(mp3)} chapters  ({ident})")
    for i, f in enumerate(mp3, 1):
        name = f.get("title") or os.path.splitext(f["name"])[0]
        out = os.path.join(folder, f"{i:03d} - {clean(name)}.mp3")
        if os.path.exists(out) and os.path.getsize(out) > 0: continue
        try:
            data = get(base + urllib.parse.quote(f["name"]))
            open(out + ".part", "wb").write(data); os.replace(out + ".part", out)
            print(f"    {i}/{len(mp3)}", end="\r")
        except Exception as e:
            print(f"    chapter {i} failed ({e}), re-run later to finish")

if __name__ == "__main__":
    pick = sys.argv[1:] or BOOKS
    print(f"Downloading {len(pick)} audiobooks into {MUSIC}\n(public domain, from LibriVox via the Internet Archive; this takes a long time)\n")
    for b in pick:
        print(b)
        try: fetch_book(b)
        except Exception as e: print("  skipped:", e)
    print("\nDone. Open Lu Cube; each book is its own playlist with its cover.")
