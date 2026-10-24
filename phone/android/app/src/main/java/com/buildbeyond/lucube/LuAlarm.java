package com.buildbeyond.lucube;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.content.ContextCompat;
import androidx.media3.common.MediaItem;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Random;
import java.util.TimeZone;

/**
 * The Wake-up face's alarm. Settings come from the cube as JSON:
 * {on, h, m, sunrise, station:{u,t,a}, candidates:[{u,t,a,tz|off}]}
 * Sunrise mode wakes you to a station somewhere it's morning right now (6–9 am local), fading in.
 */
public class LuAlarm extends BroadcastReceiver {
    static final String ACTION_FIRE = "com.buildbeyond.lucube.ALARM";

    static void save(Context c, String json) { c.getSharedPreferences("lu", Context.MODE_PRIVATE).edit().putString("alarm", json).apply(); }

    static JSONObject load(Context c) {
        try { return new JSONObject(c.getSharedPreferences("lu", Context.MODE_PRIVATE).getString("alarm", "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    static boolean canExact(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms());
    }

    private static PendingIntent fireIntent(Context c) {
        Intent i = new Intent(c, LuAlarm.class).setAction(ACTION_FIRE);
        return PendingIntent.getBroadcast(c, 42, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Sets (or cancels) the next ring. Returns the time in ms, or 0 if off. */
    static long schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return 0;
        PendingIntent pi = fireIntent(c);
        am.cancel(pi);
        JSONObject a = load(c);
        if (!a.optBoolean("on", false)) return 0;
        Calendar at = Calendar.getInstance();
        at.set(Calendar.HOUR_OF_DAY, a.optInt("h", 7));
        at.set(Calendar.MINUTE, a.optInt("m", 0));
        at.set(Calendar.SECOND, 0);
        at.set(Calendar.MILLISECOND, 0);
        if (at.getTimeInMillis() <= System.currentTimeMillis() + 5000) at.add(Calendar.DAY_OF_YEAR, 1);
        long t = at.getTimeInMillis();
        try {
            if (canExact(c)) {
                PendingIntent show = PendingIntent.getActivity(c, 43, new Intent(c, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(t, show), pi);
            } else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
        } catch (SecurityException e) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi); }
        return t;
    }

    @Override
    public void onReceive(Context c, Intent i) {
        String act = i.getAction();
        if (ACTION_FIRE.equals(act)) {
            Intent s = new Intent(c, LuPlayerService.class).setAction(ACTION_FIRE);
            try { ContextCompat.startForegroundService(c, s); } catch (Exception e) { try { c.startService(s); } catch (Exception ignored) { } }
            schedule(c); // tomorrow
        } else if (Intent.ACTION_BOOT_COMPLETED.equals(act) || "android.intent.action.MY_PACKAGE_REPLACED".equals(act)
                || "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(act)) {
            schedule(c);
        }
    }

    private static int localHour(JSONObject st) {
        Calendar now;
        if (st.has("tz") && !st.optString("tz").isEmpty()) now = Calendar.getInstance(TimeZone.getTimeZone(st.optString("tz")));
        else if (st.has("off")) { now = Calendar.getInstance(TimeZone.getTimeZone("UTC")); now.add(Calendar.MINUTE, st.optInt("off")); }
        else return -1;
        return now.get(Calendar.HOUR_OF_DAY);
    }

    /** Called by the player service once it's in the foreground. */
    static void fire(LuPlayerService s) {
        JSONObject a = load(s);
        JSONObject pick = a.optJSONObject("station");
        if (a.optBoolean("sunrise", false)) {
            JSONArray cand = a.optJSONArray("candidates");
            List<JSONObject> morning = new ArrayList<>();
            for (int k = 0; cand != null && k < cand.length(); k++) {
                JSONObject st = cand.optJSONObject(k);
                if (st == null) continue;
                int h = localHour(st);
                if (h >= 6 && h <= 9) morning.add(st);
            }
            if (!morning.isEmpty()) pick = morning.get(new Random().nextInt(morning.size()));
        }
        final JSONObject p = pick;
        s.main.post(() -> {
            if (s.player == null) return;
            if (p != null && !p.optString("u").isEmpty()) {
                MediaItem it = LuPlayerService.item("alarm", p.optString("u"), p.optString("t", "Lu Cube"), p.optString("a", "Wake-up"), "Wake-up", null, true);
                s.player.setMediaItem(it);
            }
            if (s.player.getMediaItemCount() == 0) return;
            s.player.setVolume(0.05f);
            s.player.prepare();
            s.player.play();
            final float[] v = { 0.05f };
            Runnable up = new Runnable() {
                @Override public void run() {
                    if (s.player == null) return;
                    v[0] = Math.min(1f, v[0] + 0.0167f); // about a minute to full
                    s.player.setVolume(v[0]);
                    if (v[0] < 1f) s.main.postDelayed(this, 1000);
                }
            };
            s.main.postDelayed(up, 1000);
        });
    }
}
