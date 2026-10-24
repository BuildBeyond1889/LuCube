package com.buildbeyond.lucube;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;

/** Home-screen widget: what's playing, with back / play-pause / next. Tapping the words opens Lu Cube. */
public class LuWidget extends AppWidgetProvider {
    static final String ACT = "com.buildbeyond.lucube.WIDGET";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { update(c); }

    @Override
    public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        if (!ACT.equals(i.getAction())) return;
        String cmd = i.getStringExtra("cmd");
        LuPlayerService s = LuPlayerService.instance;
        if (s != null && s.player != null && s.player.getMediaItemCount() > 0) s.command(cmd);
        else c.startActivity(new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    private static PendingIntent btn(Context c, String cmd, int code) {
        Intent i = new Intent(c, LuWidget.class).setAction(ACT).putExtra("cmd", cmd);
        return PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static void update(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, LuWidget.class));
            if (ids == null || ids.length == 0) return;
            String title = "Lu Cube", sub = "Tap to open", tag = "♫ LU CUBE";
            boolean playing = false;
            LuPlayerService s = LuPlayerService.instance;
            if (s != null && s.player != null) {
                MediaItem cur = s.player.getCurrentMediaItem();
                playing = s.player.isPlaying();
                if (cur != null) {
                    MediaMetadata md = cur.mediaMetadata;
                    if (md.title != null) title = md.title.toString();
                    sub = md.artist != null ? md.artist.toString() : "";
                    if (md.mediaType != null && md.mediaType == MediaMetadata.MEDIA_TYPE_RADIO_STATION || md.station != null) tag = "📻 ON AIR";
                }
            }
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_lu);
            v.setTextViewText(R.id.w_tag, tag);
            v.setTextViewText(R.id.w_title, title);
            v.setTextViewText(R.id.w_sub, sub);
            v.setImageViewResource(R.id.w_play, playing ? R.drawable.ic_lu_pause : R.drawable.ic_lu_play);
            v.setOnClickPendingIntent(R.id.w_prev, btn(c, "prev", 1));
            v.setOnClickPendingIntent(R.id.w_play, btn(c, "toggle", 2));
            v.setOnClickPendingIntent(R.id.w_next, btn(c, "next", 3));
            Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            v.setOnClickPendingIntent(R.id.w_text, PendingIntent.getActivity(c, 4, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
            m.updateAppWidget(ids, v);
        } catch (Exception ignored) { }
    }
}
