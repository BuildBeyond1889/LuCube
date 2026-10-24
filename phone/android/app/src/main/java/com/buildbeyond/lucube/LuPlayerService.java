package com.buildbeyond.lucube;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.audiofx.DynamicsProcessing;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Metadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.extractor.metadata.icy.IcyInfo;
import androidx.media3.session.LibraryResult;
import androidx.media3.session.MediaLibraryService;
import androidx.media3.session.MediaSession;

import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

import java.util.ArrayList;
import java.util.List;

/**
 * The phone's own media player for Lu Cube: plays your songs and live radio in the background, with the
 * lock-screen / notification controls, headphone and Bluetooth buttons, Android Auto, and the radio's song titles.
 */
@OptIn(markerClass = UnstableApi.class)
public class LuPlayerService extends MediaLibraryService {
    static LuPlayerService instance;
    interface Listener { void onState(); void onIcy(String title); void onError(String message); }
    static Listener listener;

    ExoPlayer player;
    MediaLibrarySession session;
    String icy = "";
    boolean even = false;
    private DynamicsProcessing dp;
    final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        even = getSharedPreferences("lu", MODE_PRIVATE).getBoolean("even", false);
        player = new ExoPlayer.Builder(this)
                .setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
                .setHandleAudioBecomingNoisy(true)
                .setWakeMode(C.WAKE_MODE_NETWORK)
                .build();
        player.addListener(new Player.Listener() {
            @Override public void onEvents(@NonNull Player p, @NonNull Player.Events events) {
                if (listener != null) listener.onState();
                LuWidget.update(LuPlayerService.this);
            }
            @Override public void onMediaItemTransition(@Nullable MediaItem item, int reason) { icy = ""; }
            @Override public void onMetadata(@NonNull Metadata metadata) {
                for (int i = 0; i < metadata.length(); i++) {
                    Metadata.Entry e = metadata.get(i);
                    if (e instanceof IcyInfo && ((IcyInfo) e).title != null) {
                        String t = ((IcyInfo) e).title.trim();
                        if (t.isEmpty() || t.equals(icy)) continue;
                        icy = t;
                        showIcy(t);
                        if (listener != null) listener.onIcy(t);
                    }
                }
            }
            @Override public void onPlayerError(@NonNull PlaybackException error) {
                if (listener != null) listener.onError(error.getErrorCodeName());
            }
            @Override public void onAudioSessionIdChanged(int audioSessionId) { applyEven(); }
        });
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent toApp = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        session = new MediaLibrarySession.Builder(this, player, new LibCallback())
                .setSessionActivity(toApp)   // tapping the notification opens Lu Cube
                .build();
        addSession(session);
    }

    @Nullable @Override
    public MediaLibrarySession onGetSession(@NonNull MediaSession.ControllerInfo controllerInfo) { return session; }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        if (intent != null && LuAlarm.ACTION_FIRE.equals(intent.getAction())) {
            holdForeground("Good morning", "Tuning in…");
            LuAlarm.fire(this);
        }
        return super.onStartCommand(intent, flags, startId);
    }

    /** Commands from the widget and the alarm. */
    void command(String action) {
        if (player == null) return;
        switch (action) {
            case "toggle":
                if (player.isPlaying()) player.pause();
                else if (player.getMediaItemCount() > 0) { player.prepare(); player.play(); }
                break;
            case "next": if (player.hasNextMediaItem()) player.seekToNextMediaItem(); break;
            case "prev": player.seekToPreviousMediaItem(); break;
        }
    }

    /** The station's song title goes on the lock screen and notification too. */
    private void showIcy(String title) {
        MediaItem cur = player.getCurrentMediaItem();
        if (cur == null) return;
        CharSequence station = cur.mediaMetadata.station != null ? cur.mediaMetadata.station : cur.mediaMetadata.title;
        MediaMetadata md = cur.mediaMetadata.buildUpon().setTitle(title).setArtist(station).setStation(station).build();
        try { player.replaceMediaItem(player.getCurrentMediaItemIndex(), cur.buildUpon().setMediaMetadata(md).build()); } catch (Exception ignored) { }
    }

    /** "Even volume": a gentle compressor and limiter so loud stations and quiet songs sit at the same level. */
    void setEven(boolean on) {
        even = on;
        getSharedPreferences("lu", MODE_PRIVATE).edit().putBoolean("even", on).apply();
        applyEven();
    }

    void applyEven() {
        try {
            if (dp != null) { dp.release(); dp = null; }
            if (!even || Build.VERSION.SDK_INT < 28 || player == null) return;
            int sid = player.getAudioSessionId();
            if (sid == C.AUDIO_SESSION_ID_UNSET) return;
            DynamicsProcessing.Config cfg = new DynamicsProcessing.Config.Builder(
                    DynamicsProcessing.VARIANT_FAVOR_FREQUENCY_RESOLUTION, 2, false, 0, true, 1, false, 0, true).build();
            cfg.setMbcBandAllChannelsTo(0, new DynamicsProcessing.MbcBand(true, 20000f, 10f, 250f, 4f, -24f, 4f, -90f, 1f, 0f, 6f));
            cfg.setLimiterAllChannelsTo(new DynamicsProcessing.Limiter(true, true, 0, 1f, 60f, 10f, -2f, 0f));
            dp = new DynamicsProcessing(0, sid, cfg);
            dp.setEnabled(true);
        } catch (Throwable t) { dp = null; }
    }

    /** The alarm starts us from the background: show a notification straight away, then the player takes it over. */
    void holdForeground(String title, String text) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel("lu_wake") == null)
                nm.createNotificationChannel(new NotificationChannel("lu_wake", "Wake-up", NotificationManager.IMPORTANCE_LOW));
            Notification n = new NotificationCompat.Builder(this, "lu_wake").setSmallIcon(R.drawable.ic_lu_note)
                    .setContentTitle(title).setContentText(text).setOngoing(true).build();
            ServiceCompat.startForeground(this, 1001, n, Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0);
        } catch (Exception ignored) { }
    }

    static MediaItem item(String id, String uri, String title, String artist, String album, String art, boolean live) {
        MediaMetadata.Builder md = new MediaMetadata.Builder().setTitle(title).setArtist(artist).setAlbumTitle(album)
                .setIsBrowsable(false).setIsPlayable(true).setMediaType(live ? MediaMetadata.MEDIA_TYPE_RADIO_STATION : MediaMetadata.MEDIA_TYPE_MUSIC);
        if (live) md.setStation(title);
        if (art != null && !art.isEmpty() && !art.startsWith("data:")) md.setArtworkUri(Uri.parse(art));
        return new MediaItem.Builder().setMediaId(id).setUri(uri).setMediaMetadata(md.build())
                .setRequestMetadata(new MediaItem.RequestMetadata.Builder().setMediaUri(Uri.parse(uri)).build()).build();
    }

    /** Android Auto browses your playlists and the radio through here. */
    private class LibCallback implements MediaLibrarySession.Callback {
        @NonNull @Override
        public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(@NonNull MediaLibrarySession s, @NonNull MediaSession.ControllerInfo browser, @Nullable LibraryParams params) {
            return Futures.immediateFuture(LibraryResult.ofItem(LuTree.root(), params));
        }
        @NonNull @Override
        public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetChildren(@NonNull MediaLibrarySession s, @NonNull MediaSession.ControllerInfo browser, @NonNull String parentId, int page, int pageSize, @Nullable LibraryParams params) {
            List<MediaItem> all = LuTree.children(LuPlayerService.this, parentId);
            int from = Math.min(all.size(), Math.max(0, page) * Math.max(1, pageSize)), to = Math.min(all.size(), from + Math.max(1, pageSize));
            return Futures.immediateFuture(LibraryResult.ofItemList(ImmutableList.copyOf(all.subList(from, to)), params));
        }
        @NonNull @Override
        public ListenableFuture<LibraryResult<MediaItem>> onGetItem(@NonNull MediaLibrarySession s, @NonNull MediaSession.ControllerInfo browser, @NonNull String mediaId) {
            MediaItem it = LuTree.find(LuPlayerService.this, mediaId);
            return Futures.immediateFuture(it != null ? LibraryResult.ofItem(it, null) : LibraryResult.ofError(LibraryResult.RESULT_ERROR_BAD_VALUE));
        }
        @NonNull @Override
        public ListenableFuture<List<MediaItem>> onAddMediaItems(@NonNull MediaSession s, @NonNull MediaSession.ControllerInfo controller, @NonNull List<MediaItem> items) {
            List<MediaItem> out = new ArrayList<>();
            for (MediaItem m : items) {
                if (m.localConfiguration != null) { out.add(m); continue; }
                MediaItem found = LuTree.find(LuPlayerService.this, m.mediaId);
                if (found != null) out.add(found);
                else if (m.requestMetadata.mediaUri != null) out.add(m.buildUpon().setUri(m.requestMetadata.mediaUri).build());
            }
            return Futures.immediateFuture(out);
        }
        @NonNull @Override
        public ListenableFuture<MediaSession.MediaItemsWithStartPosition> onSetMediaItems(@NonNull MediaSession s, @NonNull MediaSession.ControllerInfo controller, @NonNull List<MediaItem> items, int startIndex, long startPositionMs) {
            // picking one song in the car plays its whole playlist (or the country's channels) from there
            if (items.size() == 1 && items.get(0).localConfiguration == null) {
                LuTree.Expanded ex = LuTree.expand(LuPlayerService.this, items.get(0).mediaId);
                if (ex != null) return Futures.immediateFuture(new MediaSession.MediaItemsWithStartPosition(ex.items, ex.index, C.TIME_UNSET));
            }
            return Futures.transform(onAddMediaItems(s, controller, items),
                    list -> new MediaSession.MediaItemsWithStartPosition(list, startIndex, startPositionMs), Runnable::run);
        }
    }

    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        // swiping the app away keeps the music going; if nothing is playing, close quietly
        if (player == null || !player.getPlayWhenReady() || player.getMediaItemCount() == 0) stopSelf();
    }

    @Override
    public void onDestroy() {
        if (dp != null) { try { dp.release(); } catch (Exception ignored) { } }
        if (session != null) { session.release(); session = null; }
        if (player != null) { player.release(); player = null; }
        instance = null;
        LuWidget.update(this);
        super.onDestroy();
    }
}
