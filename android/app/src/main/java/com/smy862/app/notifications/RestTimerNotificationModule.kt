package com.smy862.app.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.os.CountDownTimer
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.smy862.app.R
import kotlin.math.max

class RestTimerNotificationModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private var timer: CountDownTimer? = null
  private var startAtMs: Long = 0
  private var endAtMs: Long = 0
  private var totalSeconds: Int = 0
  private var exerciseName: String? = null

  private val notificationId = 9101
  private val channelId = "rest-timer-ongoing"

  override fun getName(): String = "RestTimerNotification"

  @ReactMethod
  fun startRestTimer(totalSeconds: Int, exerciseName: String?) {
    this.exerciseName = exerciseName
    val safeTotal = max(1, totalSeconds)
    val now = System.currentTimeMillis()
    startAtMs = now
    this.totalSeconds = safeTotal
    endAtMs = now + safeTotal * 1000L

    startOrRestartTimer()
  }

  @ReactMethod
  fun updateRestTimer(remainingSeconds: Int, exerciseName: String?) {
    val now = System.currentTimeMillis()
    if (startAtMs == 0L) {
      startAtMs = now
    }

    val elapsedSeconds = max(0, ((now - startAtMs) / 1000L).toInt())
    val safeRemaining = max(0, remainingSeconds)
    val newTotal = max(1, safeRemaining + elapsedSeconds)

    totalSeconds = newTotal
    endAtMs = now + safeRemaining * 1000L
    if (exerciseName != null) {
      this.exerciseName = exerciseName
    }

    startOrRestartTimer()
  }

  @ReactMethod
  fun endRestTimer() {
    stopTimer()
    NotificationManagerCompat.from(reactContext).cancel(notificationId)
  }

  private fun startOrRestartTimer() {
    stopTimer()
    ensureChannel()

    val now = System.currentTimeMillis()
    val remainingMs = max(0, endAtMs - now)

    updateNotification(remainingMs)

    timer = object : CountDownTimer(remainingMs, 1000) {
      override fun onTick(millisUntilFinished: Long) {
        updateNotification(millisUntilFinished)
      }

      override fun onFinish() {
        endRestTimer()
      }
    }.start()
  }

  private fun stopTimer() {
    timer?.cancel()
    timer = null
    startAtMs = 0
    endAtMs = 0
    totalSeconds = 0
  }

  private fun updateNotification(remainingMs: Long) {
    val remainingSeconds = max(0, (remainingMs / 1000L).toInt())
    val elapsedSeconds = max(0, totalSeconds - remainingSeconds)

    val title = "Descanso en curso"
    val exerciseLabel = exerciseName?.takeIf { it.isNotBlank() }
    val timeText = formatTime(remainingSeconds)

    val body = if (exerciseLabel != null) {
      "$timeText restantes • $exerciseLabel"
    } else {
      "$timeText restantes"
    }

    val notification = NotificationCompat.Builder(reactContext, channelId)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle(title)
      .setContentText(body)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setProgress(totalSeconds, elapsedSeconds, false)
      .build()

    NotificationManagerCompat.from(reactContext).notify(notificationId, notification)
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val existing = manager.getNotificationChannel(channelId)
    if (existing != null) return

    val channel = NotificationChannel(
      channelId,
      "Descanso en curso",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Temporizador de descanso en curso"
      setShowBadge(false)
      enableVibration(false)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }

    manager.createNotificationChannel(channel)
  }

  private fun formatTime(seconds: Int): String {
    val minutes = seconds / 60
    val secs = seconds % 60
    return String.format("%d:%02d", minutes, secs)
  }
}
