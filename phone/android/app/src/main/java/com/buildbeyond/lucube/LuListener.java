package com.buildbeyond.lucube;

import android.service.notification.NotificationListenerService;

/** Only exists so Android lets the Remote mode see what Spotify, YouTube Music and the rest are playing. Reads nothing itself. */
public class LuListener extends NotificationListenerService { }
