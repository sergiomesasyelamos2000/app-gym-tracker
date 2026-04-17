package com.smy862.app.notifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.CountDownTimer
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.smy862.app.MainActivity
import com.smy862.app.R
import java.io.File
import java.net.URL
import kotlin.math.max

class RestTimerNotificationModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val NOTIFICATION_ID = 9101
    private const val CHANNEL_ID = "rest-timer-ongoing"
    internal const val EVENT_NAME = "onRestTimerIntent"
    internal const val ACTION_ADD = "com.smy862.app.rest.ADD"
    internal const val ACTION_SUBTRACT = "com.smy862.app.rest.SUBTRACT"
    internal const val ACTION_SKIP = "com.smy862.app.rest.SKIP"

    private var timer: CountDownTimer? = null
    private var endAtMs: Long = 0
    private var exerciseName: String? = null
    private var nextSetSummary: String? = null
    private var exerciseBitmap: Bitmap? = null
    private var moduleInstance: RestTimerNotificationModule? = null

    internal fun handleAction(context: Context, action: String) {
      val instance = moduleInstance ?: return

      when (action) {
        ACTION_ADD -> instance.applyDelta(15)
        ACTION_SUBTRACT -> instance.applyDelta(-15)
        ACTION_SKIP -> {
          instance.endRestTimer()
          instance.emitIntentEvent("skip", 0)
        }
      }
    }
  }

  override fun getName(): String = "RestTimerNotification"

  init {
    moduleInstance = this
  }

  @ReactMethod
  fun startRestTimer(
    endTimestampMs: Double,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?
  ) {
    this.exerciseName = exerciseName?.takeIf { it.isNotBlank() }
    this.nextSetSummary = nextSetSummary?.takeIf { it.isNotBlank() }
    this.exerciseBitmap = loadBitmap(imageUrl)
    endAtMs = endTimestampMs.toLong()
    startOrRestartTimer()
  }

  @ReactMethod
  fun updateRestTimer(
    endTimestampMs: Double,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?
  ) {
    endAtMs = endTimestampMs.toLong()
    if (!exerciseName.isNullOrBlank()) {
      this.exerciseName = exerciseName
    }
    if (imageUrl != null) {
      this.exerciseBitmap = loadBitmap(imageUrl)
    }
    if (nextSetSummary != null) {
      this.nextSetSummary = nextSetSummary.takeIf { it.isNotBlank() }
    }
    startOrRestartTimer()
  }

  @ReactMethod
  fun endRestTimer() {
    stopTimer()
    NotificationManagerCompat.from(reactContext).cancel(NOTIFICATION_ID)
  }

  private fun applyDelta(deltaSeconds: Int) {
    val remainingSeconds = max(0, ((endAtMs - System.currentTimeMillis()) / 1000L).toInt())
    val newRemainingSeconds = max(0, remainingSeconds + deltaSeconds)
    endAtMs = System.currentTimeMillis() + newRemainingSeconds * 1000L

    if (newRemainingSeconds == 0) {
      endRestTimer()
    } else {
      startOrRestartTimer()
    }

    emitIntentEvent(
      if (deltaSeconds > 0) "add" else "subtract",
      deltaSeconds
    )
  }

  private fun startOrRestartTimer() {
    stopTimer(clearState = false)
    ensureChannel()

    val remainingMs = max(0L, endAtMs - System.currentTimeMillis())
    updateNotification(remainingMs)

    timer = object : CountDownTimer(remainingMs, 1000L) {
      override fun onTick(millisUntilFinished: Long) {
        updateNotification(millisUntilFinished)
      }

      override fun onFinish() {
        endRestTimer()
      }
    }.start()
  }

  private fun stopTimer(clearState: Boolean = true) {
    timer?.cancel()
    timer = null
    if (clearState) {
      endAtMs = 0
      exerciseName = null
      nextSetSummary = null
      exerciseBitmap = null
    }
  }

  private fun updateNotification(remainingMs: Long) {
    val compactView = buildCompactRemoteViews()
    val expandedView = buildExpandedRemoteViews(remainingMs)

    val notification = NotificationCompat.Builder(reactContext, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setStyle(NotificationCompat.DecoratedCustomViewStyle())
      .setCustomContentView(compactView)
      .setCustomBigContentView(expandedView)
      .setContentIntent(createContentIntent())
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .build()

    NotificationManagerCompat.from(reactContext).notify(NOTIFICATION_ID, notification)
  }

  private fun buildCompactRemoteViews(): RemoteViews {
    val views = RemoteViews(reactContext.packageName, R.layout.notification_rest_timer_compact)
    bindSharedViews(views, isExpanded = false)
    views.setChronometer(
      R.id.rest_timer_time,
      SystemClock.elapsedRealtime() + max(0L, endAtMs - System.currentTimeMillis()),
      null,
      true
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      views.setChronometerCountDown(R.id.rest_timer_time, true)
    }
    return views
  }

  private fun buildExpandedRemoteViews(remainingMs: Long): RemoteViews {
    val views = RemoteViews(reactContext.packageName, R.layout.notification_rest_timer_expanded)
    bindSharedViews(views, isExpanded = true)
    views.setChronometer(
      R.id.rest_timer_time,
      SystemClock.elapsedRealtime() + remainingMs,
      null,
      true
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      views.setChronometerCountDown(R.id.rest_timer_time, true)
    }
    views.setOnClickPendingIntent(R.id.rest_timer_minus, createActionIntent(ACTION_SUBTRACT))
    views.setOnClickPendingIntent(R.id.rest_timer_plus, createActionIntent(ACTION_ADD))
    views.setOnClickPendingIntent(R.id.rest_timer_skip, createActionIntent(ACTION_SKIP))
    return views
  }

  private fun bindSharedViews(views: RemoteViews, isExpanded: Boolean) {
    views.setTextViewText(
      R.id.rest_timer_exercise_name,
      exerciseName?.takeIf { it.isNotBlank() } ?: "Descanso en curso"
    )
    views.setTextViewText(
      R.id.rest_timer_next_summary,
      nextSetSummary?.takeIf { it.isNotBlank() } ?: "Siguiente serie pendiente"
    )

    if (exerciseBitmap != null) {
      views.setImageViewBitmap(R.id.rest_timer_exercise_image, exerciseBitmap)
    } else {
      views.setImageViewResource(R.id.rest_timer_exercise_image, R.mipmap.ic_launcher)
    }

    if (!isExpanded) {
      views.setViewVisibility(R.id.rest_timer_next_summary, android.view.View.GONE)
    }
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager =
      reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "Descanso en curso",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Temporizador de descanso en curso"
      setShowBadge(false)
      enableVibration(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }

    manager.createNotificationChannel(channel)
  }

  private fun createContentIntent(): PendingIntent {
    val intent = Intent(reactContext, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or pendingIntentMutableFlag()
    return PendingIntent.getActivity(reactContext, 2001, intent, flags)
  }

  private fun createActionIntent(action: String): PendingIntent {
    val intent = Intent(reactContext, RestTimerNotificationReceiver::class.java).apply {
      this.action = action
    }
    val requestCode = when (action) {
      ACTION_ADD -> 3001
      ACTION_SUBTRACT -> 3002
      else -> 3003
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or pendingIntentMutableFlag()
    return PendingIntent.getBroadcast(reactContext, requestCode, intent, flags)
  }

  private fun pendingIntentMutableFlag(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      PendingIntent.FLAG_MUTABLE
    } else {
      0
    }
  }

  private fun emitIntentEvent(action: String, delta: Int) {
    val params = Arguments.createMap().apply {
      putString("action", action)
      putInt("delta", delta)
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_NAME, params)
  }

  private fun loadBitmap(imageUrl: String?): Bitmap? {
    val trimmed = imageUrl?.trim()?.takeIf { it.isNotEmpty() } ?: return exerciseBitmap

    return try {
      when {
        trimmed.startsWith("data:image") -> {
          val base64 = trimmed.substringAfter(",", "")
          decodeBase64(base64)
        }

        trimmed.startsWith("http://") || trimmed.startsWith("https://") -> {
          URL(trimmed).openStream().use { BitmapFactory.decodeStream(it) }
        }

        trimmed.startsWith("file://") -> {
          BitmapFactory.decodeFile(File(trimmed.removePrefix("file://")).absolutePath)
        }

        else -> decodeBase64(trimmed)
      }
    } catch (_: Throwable) {
      exerciseBitmap
    }
  }

  private fun decodeBase64(raw: String): Bitmap? {
    val decoded = android.util.Base64.decode(raw, android.util.Base64.DEFAULT)
    return BitmapFactory.decodeByteArray(decoded, 0, decoded.size)
  }
}
