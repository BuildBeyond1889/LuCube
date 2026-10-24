package com.buildbeyond.lucube;

import android.content.Context;

import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * What Android Auto shows: Your music (playlists → songs) and Radio (favourites, countries → stations).
 * The app writes it to browse.json whenever your library or the station list changes.
 */
final class LuTree {
    private static JSONObject cache;
    private static long cacheTime = -1;

    static final class Expanded { List<MediaItem> items; int index; }

    static File file(Context c) { return new File(c.getFilesDir(), "browse.json"); }

    private static JSONObject data(Context c) {
        File f = file(c);
        if (!f.exists()) return new JSONObject();
        if (cache != null && f.lastModified() == cacheTime) return cache;
        try (FileInputStream in = new FileInputStream(f)) {
            byte[] b = new byte[(int) f.length()];
            int n = 0;
            while (n < b.length) { int r = in.read(b, n, b.length - n); if (r < 0) break; n += r; }
            cache = new JSONObject(new String(b, 0, n, StandardCharsets.UTF_8));
            cacheTime = f.lastModified();
        } catch (Exception e) { cache = new JSONObject(); }
        return cache;
    }

    static MediaItem folder(String id, String title) {
        return new MediaItem.Builder().setMediaId(id).setMediaMetadata(new MediaMetadata.Builder().setTitle(title)
                .setIsBrowsable(true).setIsPlayable(false).setMediaType(MediaMetadata.MEDIA_TYPE_FOLDER_MIXED).build()).build();
    }

    static MediaItem root() { return folder("root", "Lu Cube"); }

    private static JSONArray lists(Context c) { JSONArray a = data(c).optJSONArray("lists"); return a != null ? a : new JSONArray(); }

    private static JSONObject list(Context c, String id) {
        JSONArray a = lists(c);
        for (int i = 0; i < a.length(); i++) { JSONObject o = a.optJSONObject(i); if (o != null && id.equals(o.optString("id"))) return o; }
        return null;
    }

    private static MediaItem song(JSONObject list, int k) {
        JSONObject s = list.optJSONArray("items").optJSONObject(k);
        boolean live = s.optBoolean("live", false);
        return LuPlayerService.item("S|" + list.optString("id") + "|" + k, s.optString("u"), s.optString("t"), s.optString("a"), list.optString("title"), null, live);
    }

    static List<MediaItem> children(Context c, String parent) {
        List<MediaItem> out = new ArrayList<>();
        JSONArray a = lists(c);
        if ("root".equals(parent)) {
            boolean lu = false, radio = false;
            for (int i = 0; i < a.length(); i++) { String g = a.optJSONObject(i).optString("group"); lu |= g.equals("lu"); radio |= g.equals("radio"); }
            if (lu) out.add(folder("lu", "Your music"));
            if (radio) out.add(folder("radio", "Radio"));
            return out;
        }
        if ("lu".equals(parent) || "radio".equals(parent)) {
            for (int i = 0; i < a.length(); i++) { JSONObject o = a.optJSONObject(i); if (parent.equals(o.optString("group"))) out.add(folder(o.optString("id"), o.optString("title"))); }
            return out;
        }
        JSONObject l = list(c, parent);
        if (l != null) { JSONArray items = l.optJSONArray("items"); for (int k = 0; items != null && k < items.length(); k++) out.add(song(l, k)); }
        return out;
    }

    static MediaItem find(Context c, String mediaId) {
        if (mediaId == null) return null;
        if (mediaId.equals("root")) return root();
        if (mediaId.equals("lu")) return folder("lu", "Your music");
        if (mediaId.equals("radio")) return folder("radio", "Radio");
        if (mediaId.startsWith("S|")) {
            int last = mediaId.lastIndexOf('|');
            JSONObject l = list(c, mediaId.substring(2, last));
            try { return l != null ? song(l, Integer.parseInt(mediaId.substring(last + 1))) : null; } catch (Exception e) { return null; }
        }
        JSONObject l = list(c, mediaId);
        return l != null ? folder(mediaId, l.optString("title")) : null;
    }

    static Expanded expand(Context c, String mediaId) {
        if (mediaId == null || !mediaId.startsWith("S|")) return null;
        int last = mediaId.lastIndexOf('|');
        JSONObject l = list(c, mediaId.substring(2, last));
        if (l == null) return null;
        Expanded e = new Expanded();
        e.items = new ArrayList<>();
        JSONArray items = l.optJSONArray("items");
        for (int k = 0; items != null && k < items.length(); k++) e.items.add(song(l, k));
        try { e.index = Integer.parseInt(mediaId.substring(last + 1)); } catch (Exception x) { e.index = 0; }
        return e;
    }
}
