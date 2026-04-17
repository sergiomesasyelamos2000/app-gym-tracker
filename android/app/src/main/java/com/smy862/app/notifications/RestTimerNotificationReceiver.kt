package com.smy862.app.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class RestTimerNotificationReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val action = intent?.action ?: return
    RestTimerNotificationModule.handleAction(context, action)
  }
}
