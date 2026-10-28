package com.buildbeyond.lucube;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaScannerConnection;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.Size;

import androidx.core.app.NotificationManagerCompat;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/** The bridge between the cube (the web page) and the phone: playback, your songs, the remote, downloads, the alarm. */
@CapacitorPlugin(name = "LuNative", permissions = {
        @Permission(alias = "audio", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "storage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
})
public class LuNativePlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Map<String, String> artCache = new HashMap<>();
    private static final Pattern SKIP = Pattern.compile("(?i)whatsapp|telegram|recordings|notifications|ringtones|alarms|voice|call ?rec");

    interface Task { void run(LuPlayerService s) throws Exception; }

    @Override
    public void load() {
        startService();
        LuPlayerService.listener = new LuPlayerService.Listener() {
            @Override public void onState() { LuPlayerService s = LuPlayerService.instance; if (s != null) notifyListeners("state", state(s, false)); }
            @Override public void onIcy(String title) { JSObject o = new JSObject(); o.put("title", title); notifyListeners("icy", o); }
            @Override public void onError(String message) { JSObject o = new JSObject(); o.put("message", message); notifyListeners("error", o); }
        };
    }

    private void startService() {
        try { getContext().startService(new Intent(getContext(), LuPlayerService.class)); } catch (Exception ignored) { }
    }

    private void withPlayer(PluginCall call, Task t) { withPlayer(call, t, 0); }

    private void withPlayer(PluginCall call, Task t, int tries) {
        main.post(() -> {
            LuPlayerService s = LuPlayerService.instance;
            if (s == null || s.player == null) {
                if (tries < 50) { startService(); main.postDelayed(() -> withPlayer(call, t, tries + 1), 100); }
                else call.reject("The player didn't start");
                return;
            }
            try { t.run(s); call.resolve(state(s, false)); } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
        });
    }

    private JSObject state(LuPlayerService s, boolean withIds) {
        ExoPlayer p = s.player;
        JSObject o = new JSObject();
        if (p == null) return o;
        o.put("playing", p.isPlaying());
        o.put("playWhenReady", p.getPlayWhenReady());
        o.put("state", p.getPlaybackState());
        o.put("index", p.getCurrentMediaItemIndex());
        o.put("count", p.getMediaItemCount());
        o.put("position", p.getCurrentPosition());
        long d = p.getDuration();
        o.put("duration", d == C.TIME_UNSET ? -1 : d);
        o.put("live", p.isCurrentMediaItemLive());
        o.put("shuffle", p.getShuffleModeEnabled());
        o.put("icy", s.icy);
        MediaItem cur = p.getCurrentMediaItem();
        o.put("id", cur != null ? cur.mediaId : "");
        if (withIds) {
            JSArray ids = new JSArray();
            for (int i = 0; i < p.getMediaItemCount(); i++) ids.put(p.getMediaItemAt(i).mediaId);
            o.put("ids", ids);
        }
        return o;
    }

    // ---------------- playback ----------------
    @PluginMethod
    public void setQueue(PluginCall call) {
        JSArray items = call.getArray("items");
        int index = call.getInt("index", 0);
        long pos = (long) (double) call.getDouble("position", 0.0);
        boolean play = call.getBoolean("play", false);
        List<MediaItem> list = new ArrayList<>();
        try {
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.getJSONObject(i);
                list.add(LuPlayerService.item(it.optString("id"), it.optString("u"), it.optString("t"), it.optString("a"),
                        it.optString("al"), it.optString("art"), it.optBoolean("live", false)));
            }
        } catch (Exception e) { call.reject("Bad queue"); return; }
        withPlayer(call, s -> {
            s.player.setRepeatMode(Player.REPEAT_MODE_ALL);
            s.player.setMediaItems(list, Math.max(0, Math.min(index, list.size() - 1)), pos);
            s.player.prepare();
            s.player.setPlayWhenReady(play);
        });
    }

    @PluginMethod public void play(PluginCall call) { withPlayer(call, s -> { if (s.player.getPlaybackState() == Player.STATE_IDLE) s.player.prepare(); s.player.play(); }); }
    @PluginMethod public void pause(PluginCall call) { withPlayer(call, s -> s.player.pause()); }
    @PluginMethod public void stop(PluginCall call) { withPlayer(call, s -> { s.player.stop(); s.player.clearMediaItems(); }); }
    @PluginMethod public void seek(PluginCall call) { long ms = (long) (double) call.getDouble("ms", 0.0); withPlayer(call, s -> s.player.seekTo(ms)); }
    @PluginMethod public void skipTo(PluginCall call) {
        int i = call.getInt("index", 0); long ms = (long) (double) call.getDouble("ms", 0.0);
        withPlayer(call, s -> { if (i >= 0 && i < s.player.getMediaItemCount()) s.player.seekTo(i, ms); });
    }
    @PluginMethod public void next(PluginCall call) { withPlayer(call, s -> s.player.seekToNextMediaItem()); }
    @PluginMethod public void prev(PluginCall call) { withPlayer(call, s -> s.player.seekToPreviousMediaItem()); }
    @PluginMethod public void volume(PluginCall call) { float v = (float) (double) call.getDouble("v", 1.0); withPlayer(call, s -> s.player.setVolume(Math.max(0f, Math.min(1f, v)))); }
    @PluginMethod public void shuffle(PluginCall call) { boolean on = call.getBoolean("on", false); withPlayer(call, s -> s.player.setShuffleModeEnabled(on)); }
    @PluginMethod public void evenVolume(PluginCall call) { boolean on = call.getBoolean("on", false); withPlayer(call, s -> s.setEven(on)); }
    @PluginMethod public void getState(PluginCall call) {
        main.post(() -> { LuPlayerService s = LuPlayerService.instance; call.resolve(s != null ? state(s, true) : new JSObject()); });
    }

    // ---------------- your songs ----------------
    private String audioAlias() { return Build.VERSION.SDK_INT >= 33 ? "audio" : "storage"; }

    @PluginMethod
    public void audioAccess(PluginCall call) {
        if (getPermissionState(audioAlias()) == PermissionState.GRANTED) { JSObject r = new JSObject(); r.put("granted", true); call.resolve(r); }
        else requestPermissionForAlias(audioAlias(), call, "audioAccessDone");
    }

    @PermissionCallback
    private void audioAccessDone(PluginCall call) {
        JSObject r = new JSObject(); r.put("granted", getPermissionState(audioAlias()) == PermissionState.GRANTED); call.resolve(r);
    }

    @PluginMethod
    public void scanLibrary(PluginCall call) {
        new Thread(() -> {
            JSObject out = new JSObject();
            JSArray pls = new JSArray();
            int total = 0;
            if (getPermissionState(audioAlias()) != PermissionState.GRANTED) { out.put("granted", false); out.put("playlists", pls); call.resolve(out); return; }
            ContentResolver cr = getContext().getContentResolver();
            Uri base = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
            boolean rel = Build.VERSION.SDK_INT >= 29;
            String[] proj = { MediaStore.Audio.Media._ID, MediaStore.Audio.Media.TITLE, MediaStore.Audio.Media.ARTIST, MediaStore.Audio.Media.ALBUM_ID,
                    MediaStore.Audio.Media.DURATION, MediaStore.Audio.Media.DISPLAY_NAME, rel ? MediaStore.Audio.Media.RELATIVE_PATH : MediaStore.Audio.Media.DATA, MediaStore.Audio.Media.DATA };
            Map<String, JSArray> byFolder = new LinkedHashMap<>();
            Map<String, Uri> firstOf = new HashMap<>();
            Map<String, Long> albumOf = new HashMap<>();
            Map<String, String> dirOf = new HashMap<>();
            try (Cursor c = cr.query(base, proj, MediaStore.Audio.Media.DURATION + ">=20000", null, MediaStore.Audio.Media.DISPLAY_NAME + " ASC")) {
                while (c != null && c.moveToNext()) {
                    long id = c.getLong(0);
                    String path = c.getString(6) != null ? c.getString(6) : "";
                    if (SKIP.matcher(path).find()) continue;
                    if (!rel) { int cut = path.lastIndexOf('/'); path = cut > 0 ? path.substring(0, cut) : path; }
                    String folder = path.replaceAll("/+$", "");
                    folder = folder.contains("/") ? folder.substring(folder.lastIndexOf('/') + 1) : folder;
                    if (folder.isEmpty()) folder = "Music";
                    String name = c.getString(5) != null ? c.getString(5) : "";
                    String title = c.getString(1);
                    if (title == null || title.isEmpty()) title = name.replaceAll("\\.[^.]+$", "");
                    String artist = c.getString(2);
                    if (artist == null || artist.equals("<unknown>")) artist = "";
                    Uri u = ContentUris.withAppendedId(base, id);
                    JSObject t = new JSObject();
                    t.put("t", title);
                    t.put("a", artist);
                    t.put("d", c.getLong(4) / 1000.0);
                    t.put("src", u.toString());
                    t.put("art", ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), c.getLong(3)).toString());
                    JSArray arr = byFolder.get(folder);
                    if (arr == null) { arr = new JSArray(); byFolder.put(folder, arr); firstOf.put(folder, u); albumOf.put(folder, c.getLong(3)); String fp = c.getString(7); if (fp != null && fp.lastIndexOf('/') > 0) dirOf.put(folder, fp.substring(0, fp.lastIndexOf('/'))); }
                    arr.put(t);
                    total++;
                }
            } catch (Exception e) { out.put("error", String.valueOf(e.getMessage())); }
            List<String> names = new ArrayList<>(byFolder.keySet());
            java.util.Collections.sort(names, String.CASE_INSENSITIVE_ORDER);
            for (String f : names) {
                JSObject p = new JSObject();
                p.put("name", f);
                p.put("cover", cover(cr, firstOf.get(f), albumOf.get(f), dirOf.get(f)));
                p.put("tracks", byFolder.get(f));
                pls.put(p);
            }
            out.put("granted", true);
            out.put("count", total);
            out.put("playlists", pls);
            call.resolve(out);
        }).start();
    }

    // the folder's own picture first (cover.jpg, folder.jpg… as on the PC, synced with the songs), then the art inside the song
    private static final String[] COVERS = { "cover.jpg", "cover.png", "folder.jpg", "folder.png", "front.jpg" };
    private static Bitmap folderImage(String dir) {
        if (dir == null) return null;
        try {
            File d = new File(dir);
            File pick = null;
            for (String n : COVERS) { File f = new File(d, n); if (f.isFile()) { pick = f; break; } }
            if (pick == null) { File[] all = d.listFiles(); if (all != null) { java.util.Arrays.sort(all); for (File f : all) { String n = f.getName().toLowerCase(); if (f.isFile() && (n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png"))) { pick = f; break; } } } }
            if (pick == null) return null;
            BitmapFactory.Options o = new BitmapFactory.Options(); o.inJustDecodeBounds = true; BitmapFactory.decodeFile(pick.getPath(), o);
            int s = 1; while (Math.max(o.outWidth, o.outHeight) / (s * 2) >= 200) s *= 2;
            BitmapFactory.Options o2 = new BitmapFactory.Options(); o2.inSampleSize = s;
            return BitmapFactory.decodeFile(pick.getPath(), o2);
        } catch (Exception e) { return null; }
    }

    private String cover(ContentResolver cr, Uri track, Long albumId, String dir) {
        String key = String.valueOf(track);
        if (artCache.containsKey(key)) return artCache.get(key);
        String res = "";
        try {
            Bitmap b = folderImage(dir);
            if (b != null) { res = dataUrl(b, 200); artCache.put(key, res); return res; }
            if (Build.VERSION.SDK_INT >= 29) b = cr.loadThumbnail(track, new Size(200, 200), null);
            else if (albumId != null) try (InputStream in = cr.openInputStream(ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId))) { b = BitmapFactory.decodeStream(in); }
            if (b != null) res = dataUrl(b, 200);
        } catch (Exception ignored) { }
        if (!res.isEmpty()) artCache.put(key, res);   // no picture yet: look again next time (a cover may arrive with the next sync)
        return res;
    }

    private static String dataUrl(Bitmap b, int max) {
        if (b.getWidth() > max || b.getHeight() > max) {
            float k = (float) max / Math.max(b.getWidth(), b.getHeight());
            b = Bitmap.createScaledBitmap(b, Math.max(1, Math.round(b.getWidth() * k)), Math.max(1, Math.round(b.getHeight() * k)), true);
        }
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.JPEG, 82, bo);
        return "data:image/jpeg;base64," + Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
    }

    @PluginMethod
    public void libSig(PluginCall call) {
        new Thread(() -> {
            JSObject o = new JSObject();
            try (Cursor c = getContext().getContentResolver().query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    new String[] { "COUNT(*)", "MAX(" + MediaStore.Audio.Media.DATE_MODIFIED + ")" }, null, null, null)) {
                if (c != null && c.moveToFirst()) o.put("sig", c.getLong(0) + "-" + c.getLong(1));
            } catch (Exception e) {
                // some phones don't allow COUNT(*) in a projection: fall back to counting rows
                try (Cursor c = getContext().getContentResolver().query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, new String[] { MediaStore.Audio.Media._ID }, null, null, null)) {
                    o.put("sig", String.valueOf(c != null ? c.getCount() : 0));
                } catch (Exception e2) { o.put("sig", "0"); }
            }
            call.resolve(o);
        }).start();
    }

    // ---------------- songs from Lu Cube on your PC (over Wi-Fi) ----------------
    // removes files an earlier PC sync copied (only inside the app's own "Lu Cube" folder) and tells the music library
    @PluginMethod
    public void removeSynced(PluginCall call) {
        JSArray paths = call.getArray("paths", new JSArray());
        new Thread(() -> {
            int n = 0;
            List<String> gone = new ArrayList<>();
            try {
                File[] media = getContext().getExternalMediaDirs();
                File root = new File(media != null && media.length > 0 && media[0] != null ? media[0] : getContext().getExternalFilesDir(null), "Lu Cube");
                String rootPath = root.getCanonicalPath();
                for (int i = 0; i < paths.length(); i++) {
                    String dest = paths.getString(i).replace("\\", "/").replaceAll("(^|/)\\.\\.(?=/|$)", "").replaceAll("^/+", "");
                    File f = new File(root, dest);
                    if (!f.getCanonicalPath().startsWith(rootPath + File.separator)) continue;
                    if (f.isFile() && f.delete()) { n++; gone.add(f.getPath()); }
                    File d = f.getParentFile();
                    while (d != null && !d.getCanonicalPath().equals(rootPath)) { String[] left = d.list(); if (left != null && left.length == 0 && d.delete()) d = d.getParentFile(); else break; }
                }
            } catch (Exception ignored) { }
            if (!gone.isEmpty()) MediaScannerConnection.scanFile(getContext(), gone.toArray(new String[0]), null, null);
            JSObject r = new JSObject(); r.put("removed", n); call.resolve(r);
        }).start();
    }

    // the visualiser: the newest frequency picture of what's playing (512 bytes, base64)
    @PluginMethod
    public void spectrum(PluginCall call) {
        JSObject r = new JSObject();
        r.put("sr", LuTap.INSTANCE.sampleRate());
        r.put("b", Base64.encodeToString(LuTap.INSTANCE.spectrum(), Base64.NO_WRAP));
        call.resolve(r);
    }

    // the opening holds the screen upright while it plays (lock: true), then lets it turn freely again
    @PluginMethod
    public void lockPortrait(PluginCall call) {
        boolean lock = call.getBoolean("lock", true);
        main.post(() -> {
            try { getActivity().setRequestedOrientation(lock ? android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT : android.content.pm.ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED); } catch (Exception ignored) { }
            call.resolve();
        });
    }

    @PluginMethod
    public void downloadFile(PluginCall call) {
        String url = call.getString("url");
        String dest = call.getString("dest", "song").replace("\\", "/").replaceAll("(^|/)\\.\\.(?=/|$)", "").replaceAll("^/+", "");
        JSObject headers = call.getObject("headers", new JSObject());
        new Thread(() -> {
            HttpURLConnection con = null;
            try {
                File[] media = getContext().getExternalMediaDirs();
                File root = media != null && media.length > 0 && media[0] != null ? media[0] : getContext().getExternalFilesDir(null);
                File out = new File(new File(root, "Lu Cube"), dest);
                File dir = out.getParentFile();
                if (dir != null && !dir.exists() && !dir.mkdirs()) throw new Exception("Can't make " + dir);
                con = (HttpURLConnection) new URL(url).openConnection();
                con.setConnectTimeout(15000);
                con.setReadTimeout(60000);
                Iterator<String> keys = headers.keys();
                while (keys.hasNext()) { String k = keys.next(); con.setRequestProperty(k, headers.getString(k)); }
                if (con.getResponseCode() != 200) throw new Exception("Your PC answered " + con.getResponseCode());
                File tmp = new File(out.getPath() + ".part");
                long n = 0;
                try (InputStream in = con.getInputStream(); OutputStream os = new FileOutputStream(tmp)) {
                    byte[] buf = new byte[65536];
                    int r;
                    while ((r = in.read(buf)) > 0) { os.write(buf, 0, r); n += r; }
                }
                if (out.exists() && !out.delete()) throw new Exception("Can't replace " + out);
                if (!tmp.renameTo(out)) throw new Exception("Can't save " + out);
                MediaScannerConnection.scanFile(getContext(), new String[] { out.getPath() }, null, null);
                JSObject r = new JSObject(); r.put("path", out.getPath()); r.put("size", n); call.resolve(r);
            } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
            finally { if (con != null) con.disconnect(); }
        }).start();
    }

    // ---------------- remote: whatever another app is playing ----------------
    private boolean remoteAllowed() { return NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName()); }

    @PluginMethod public void remoteAccess(PluginCall call) { JSObject o = new JSObject(); o.put("granted", remoteAllowed()); call.resolve(o); }

    @PluginMethod public void remoteSettings(PluginCall call) {
        try { getActivity().startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)); } catch (Exception ignored) { }
        call.resolve();
    }

    private List<MediaController> controllers() {
        MediaSessionManager m = (MediaSessionManager) getContext().getSystemService(Context.MEDIA_SESSION_SERVICE);
        List<MediaController> out = new ArrayList<>();
        if (m == null) return out;
        for (MediaController c : m.getActiveSessions(new ComponentName(getContext(), LuListener.class)))
            if (!c.getPackageName().equals(getContext().getPackageName())) out.add(c);
        return out;
    }

    @PluginMethod
    public void remoteList(PluginCall call) {
        JSObject o = new JSObject();
        JSArray list = new JSArray();
        o.put("granted", remoteAllowed());
        if (remoteAllowed()) {
            try {
                PackageManager pm = getContext().getPackageManager();
                for (MediaController c : controllers()) {
                    android.media.MediaMetadata md = c.getMetadata();
                    PlaybackState ps = c.getPlaybackState();
                    JSObject s = new JSObject();
                    String pkg = c.getPackageName();
                    s.put("pkg", pkg);
                    String app = pkg;
                    try { ApplicationInfo ai = pm.getApplicationInfo(pkg, 0); app = String.valueOf(pm.getApplicationLabel(ai)); } catch (Exception ignored) { }
                    s.put("app", app);
                    String title = "", artist = "", album = "";
                    long dur = 0;
                    if (md != null) {
                        title = nz(md.getString(android.media.MediaMetadata.METADATA_KEY_TITLE), md.getString(android.media.MediaMetadata.METADATA_KEY_DISPLAY_TITLE));
                        artist = nz(md.getString(android.media.MediaMetadata.METADATA_KEY_ARTIST), md.getString(android.media.MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE));
                        album = nz(md.getString(android.media.MediaMetadata.METADATA_KEY_ALBUM), "");
                        dur = md.getLong(android.media.MediaMetadata.METADATA_KEY_DURATION);
                        String key = pkg + "|" + title;
                        String art = artCache.get(key);
                        if (art == null) {
                            Bitmap b = md.getBitmap(android.media.MediaMetadata.METADATA_KEY_ALBUM_ART);
                            if (b == null) b = md.getBitmap(android.media.MediaMetadata.METADATA_KEY_ART);
                            if (b == null) b = md.getBitmap(android.media.MediaMetadata.METADATA_KEY_DISPLAY_ICON);
                            art = b != null ? dataUrl(b, 240) : "";
                            artCache.put(key, art);
                        }
                        s.put("art", art);
                    }
                    s.put("title", title);
                    s.put("artist", artist);
                    s.put("album", album);
                    s.put("duration", dur);
                    boolean playing = ps != null && ps.getState() == PlaybackState.STATE_PLAYING;
                    long pos = ps != null ? ps.getPosition() : 0;
                    if (playing && ps.getLastPositionUpdateTime() > 0) pos += (long) ((SystemClock.elapsedRealtime() - ps.getLastPositionUpdateTime()) * ps.getPlaybackSpeed());
                    s.put("position", Math.max(0, pos));
                    s.put("playing", playing);
                    list.put(s);
                }
            } catch (Exception e) { o.put("error", String.valueOf(e.getMessage())); }
        }
        o.put("sessions", list);
        call.resolve(o);
    }

    private static String nz(String a, String b) { return a != null && !a.isEmpty() ? a : (b != null ? b : ""); }

    @PluginMethod
    public void remoteCmd(PluginCall call) {
        String pkg = call.getString("pkg", ""), cmd = call.getString("cmd", "");
        long ms = (long) (double) call.getDouble("ms", 0.0);
        try {
            for (MediaController c : controllers()) {
                if (!c.getPackageName().equals(pkg)) continue;
                MediaController.TransportControls t = c.getTransportControls();
                switch (cmd) {
                    case "play": t.play(); break;
                    case "pause": t.pause(); break;
                    case "next": t.skipToNext(); break;
                    case "prev": t.skipToPrevious(); break;
                    case "seek": t.seekTo(ms); break;
                }
                break;
            }
            call.resolve();
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    // ---------------- wake-up alarm ----------------
    @PluginMethod
    public void setAlarm(PluginCall call) {
        LuAlarm.save(getContext(), call.getData().toString());
        JSObject o = new JSObject();
        o.put("scheduled", LuAlarm.schedule(getContext()));
        o.put("exact", LuAlarm.canExact(getContext()));
        call.resolve(o);
    }

    @PluginMethod
    public void alarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) {
            try { getActivity().startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()))); } catch (Exception ignored) { }
        }
        call.resolve();
    }

    // ---------------- Android Auto's menu, links out, version ----------------
    @PluginMethod
    public void setBrowseTree(PluginCall call) {
        String json = call.getString("json", "{}");
        new Thread(() -> {
            try {
                File f = LuTree.file(getContext()), tmp = new File(f.getPath() + ".tmp");
                try (OutputStream os = new FileOutputStream(tmp)) { os.write(json.getBytes(StandardCharsets.UTF_8)); }
                if (!tmp.renameTo(f)) { if (f.delete()) tmp.renameTo(f); }
                call.resolve();
            } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
        }).start();
    }

    @PluginMethod
    public void openExternal(PluginCall call) {
        JSObject o = new JSObject();
        try {
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(call.getString("url", ""))).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            o.put("ok", true);
        } catch (ActivityNotFoundException e) { o.put("ok", false); }
        call.resolve(o);
    }

    @PluginMethod
    public void info(PluginCall call) {
        JSObject o = new JSObject();
        try { o.put("version", getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionName); } catch (Exception e) { o.put("version", "?"); }
        try { o.put("build", (long) androidx.core.content.pm.PackageInfoCompat.getLongVersionCode(getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0))); } catch (Exception e) { o.put("build", 0); }
        o.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(o);
    }

    // ---------- updates: download the new APK and hand it straight to Android's installer ----------
    @PluginMethod
    public void installUpdate(PluginCall call) {
        String url = call.getString("url", "");
        new Thread(() -> {
            HttpURLConnection con = null;
            try {
                File out = new File(getContext().getCacheDir(), "LuCube-update.apk"), tmp = new File(out.getPath() + ".part");
                String u = url;
                for (int hop = 0; hop < 6; hop++) { // GitHub sends release files through a redirect
                    con = (HttpURLConnection) new URL(u).openConnection();
                    con.setInstanceFollowRedirects(false);
                    con.setConnectTimeout(15000);
                    con.setReadTimeout(60000);
                    int code = con.getResponseCode();
                    if (code >= 300 && code < 400 && con.getHeaderField("Location") != null) { u = new URL(new URL(u), con.getHeaderField("Location")).toString(); con.disconnect(); continue; }
                    if (code != 200) throw new Exception("GitHub answered " + code);
                    break;
                }
                long total = con.getContentLengthLong(), n = 0, lastPct = -1;
                try (InputStream in = con.getInputStream(); OutputStream os = new FileOutputStream(tmp)) {
                    byte[] buf = new byte[65536];
                    int r;
                    while ((r = in.read(buf)) > 0) {
                        os.write(buf, 0, r); n += r;
                        long pct = total > 0 ? n * 100 / total : -1;
                        if (pct != lastPct) { lastPct = pct; JSObject e = new JSObject(); e.put("pct", pct); notifyListeners("update", e); }
                    }
                }
                if (out.exists()) out.delete();
                if (!tmp.renameTo(out)) throw new Exception("Couldn't save the update");
                main.post(() -> {
                    JSObject r = new JSObject();
                    try {
                        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
                            getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName())));
                            r.put("needsPermission", true);
                            call.resolve(r);
                            return;
                        }
                        Uri apk = androidx.core.content.FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", out);
                        Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(apk, "application/vnd.android.package-archive")
                                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        getActivity().startActivity(i);
                        r.put("ok", true);
                        call.resolve(r);
                    } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
                });
            } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
            finally { if (con != null) con.disconnect(); }
        }).start();
    }
}
