package com.smy862.app.notifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.CountDownTimer
import android.os.IBinder
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.smy862.app.MainActivity
import com.smy862.app.R
import java.io.File
import java.net.URL
import kotlin.math.max

/**
 * Foreground service that hosts the Hevy-style workout Live Activity notification
 * for the entire workout (duration + exercise + optional rest controls).
 */
class WorkoutLiveForegroundService : Service() {

  companion object {
    const val NOTIFICATION_ID = 9102
    const val CHANNEL_ID = "workout-live-ongoing"

    const val ACTION_START = "com.smy862.app.workout.START"
    const val ACTION_UPDATE = "com.smy862.app.workout.UPDATE"
    const val ACTION_STOP = "com.smy862.app.workout.STOP"
    const val ACTION_CLEAR_REST = "com.smy862.app.workout.CLEAR_REST"
    const val ACTION_ADD = "com.smy862.app.workout.ADD"
    const val ACTION_SUBTRACT = "com.smy862.app.workout.SUBTRACT"
    const val ACTION_SKIP = "com.smy862.app.workout.SKIP"
    const val ACTION_COMPLETE_SET = "com.smy862.app.workout.COMPLETE_SET"

    const val EXTRA_WORKOUT_STARTED_AT = "workoutStartedAtMs"
    const val EXTRA_EXERCISE_NAME = "exerciseName"
    const val EXTRA_IMAGE_URL = "imageUrl"
    const val EXTRA_NEXT_SUMMARY = "nextSetSummary"
    const val EXTRA_IS_RESTING = "isResting"
    const val EXTRA_REST_END_AT = "restEndAtMs"
    const val EXTRA_REST_DEFAULT = "restSecondsDefault"

    @Volatile
    private var instance: WorkoutLiveForegroundService? = null

    fun handleAction(context: Context, action: String) {
      val svc = instance
      if (svc == null) {
        // Bounce through startService so we still emit even if JS module is alive.
        val intent = Intent(context, WorkoutLiveForegroundService::class.java).apply {
          this.action = action
        }
        context.startService(intent)
        return
      }
      when (action) {
        ACTION_ADD -> svc.applyRestDelta(15)
        ACTION_SUBTRACT -> svc.applyRestDelta(-15)
        ACTION_SKIP -> {
          svc.clearRest(emitSkip = true)
        }
        ACTION_CLEAR_REST -> {
          svc.clearRest(emitSkip = false)
        }
        ACTION_COMPLETE_SET -> {
          RestTimerNotificationModule.emitFromService("completeSet", 0, 0)
        }
      }
    }
  }

  private var workoutStartedAtMs: Long = 0
  private var exerciseName: String? = null
  private var nextSetSummary: String? = null
  private var isResting: Boolean = false
  private var restEndAtMs: Long = 0
  private var restSecondsDefault: Int = 90
  private var exerciseBitmap: Bitmap? = null
  private var lastImageUrl: String? = null
  private var restTimer: CountDownTimer? = null
  private var lastPublishedKey: String? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    ensureChannel()
  }

  override fun onDestroy() {
    restTimer?.cancel()
    instance = null
    super.onDestroy()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopSelfSafely()
        return START_NOT_STICKY
      }
      ACTION_ADD, ACTION_SUBTRACT, ACTION_SKIP, ACTION_COMPLETE_SET, ACTION_CLEAR_REST -> {
        handleAction(this, intent.action!!)
        return START_STICKY
      }
      ACTION_START, ACTION_UPDATE, null -> {
        applyExtras(intent)
        publishForeground()
        if (isResting) restartRestTimer() else cancelRestTimer()
      }
    }
    return START_STICKY
  }

  private fun applyExtras(intent: Intent?) {
    if (intent == null) return
    if (intent.hasExtra(EXTRA_WORKOUT_STARTED_AT)) {
      workoutStartedAtMs = intent.getLongExtra(EXTRA_WORKOUT_STARTED_AT, workoutStartedAtMs)
    }
    intent.getStringExtra(EXTRA_EXERCISE_NAME)?.let { exerciseName = it }
    intent.getStringExtra(EXTRA_NEXT_SUMMARY)?.let { nextSetSummary = it }
    if (intent.hasExtra(EXTRA_IS_RESTING)) {
      isResting = intent.getBooleanExtra(EXTRA_IS_RESTING, false)
    }
    if (intent.hasExtra(EXTRA_REST_END_AT)) {
      restEndAtMs = intent.getLongExtra(EXTRA_REST_END_AT, 0)
    }
    if (intent.hasExtra(EXTRA_REST_DEFAULT)) {
      restSecondsDefault = intent.getIntExtra(EXTRA_REST_DEFAULT, restSecondsDefault)
    }
    val imageUrl = intent.getStringExtra(EXTRA_IMAGE_URL)
    if (!imageUrl.isNullOrBlank() && imageUrl != lastImageUrl) {
      lastImageUrl = imageUrl
      Thread {
        val bmp = loadBitmap(imageUrl)
        if (bmp != null && lastImageUrl == imageUrl) {
          exerciseBitmap = bmp
          publishForeground(force = true)
        }
      }.start()
    }
  }

  private fun applyRestDelta(deltaSeconds: Int) {
    if (!isResting) return
    val remainingSeconds = max(0, ((restEndAtMs - System.currentTimeMillis()) / 1000L).toInt())
    val newRemaining = max(0, remainingSeconds + deltaSeconds)
    restEndAtMs = System.currentTimeMillis() + newRemaining * 1000L
    RestTimerNotificationModule.emitFromService(
      if (deltaSeconds > 0) "add" else "subtract",
      deltaSeconds,
      restEndAtMs
    )
    if (newRemaining == 0) {
      clearRest(emitSkip = true)
    } else {
      restartRestTimer()
      publishForeground()
    }
  }

  private fun clearRest(emitSkip: Boolean) {
    isResting = false
    restEndAtMs = 0
    cancelRestTimer()
    if (emitSkip) {
      RestTimerNotificationModule.emitFromService("skip", 0, 0)
    }
    publishForeground()
  }

  private fun restartRestTimer() {
    cancelRestTimer()
    val remaining = max(0L, restEndAtMs - System.currentTimeMillis())
    if (remaining <= 0L) {
      clearRest(emitSkip = false)
      return
    }
    restTimer = object : CountDownTimer(remaining, 1000L) {
      override fun onTick(millisUntilFinished: Long) {
        // Chronometer handles visual countdown; periodic refresh keeps OEM happy.
        if (millisUntilFinished % 5000L < 1000L) {
          publishForeground()
        }
      }

      override fun onFinish() {
        clearRest(emitSkip = false)
      }
    }.start()
  }

  private fun cancelRestTimer() {
    restTimer?.cancel()
    restTimer = null
  }

  private fun publishForeground(force: Boolean = false) {
    ensureChannel()
    val key =
      "$workoutStartedAtMs|$exerciseName|$nextSetSummary|$isResting|$restEndAtMs"
    if (!force && key == lastPublishedKey && !isResting) {
      // Non-rest updates with identical content — skip notify (Chronometer runs alone).
      return
    }
    lastPublishedKey = key
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      ServiceCompat.startForeground(
        this,
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
      )
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun stopSelfSafely() {
    cancelRestTimer()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun buildNotification(): Notification {
    val compact = buildCompact()
    val expanded = buildExpanded()
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setStyle(NotificationCompat.DecoratedCustomViewStyle())
      .setCustomContentView(compact)
      .setCustomBigContentView(expanded)
      .setContentIntent(contentIntent())
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  private fun buildCompact(): RemoteViews {
    val views = RemoteViews(packageName, R.layout.notification_workout_live_compact)
    bindExercise(views)
    if (isResting && restEndAtMs > System.currentTimeMillis()) {
      views.setChronometer(
        R.id.workout_live_primary_time,
        SystemClock.elapsedRealtime() + (restEndAtMs - System.currentTimeMillis()),
        null,
        true
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        views.setChronometerCountDown(R.id.workout_live_primary_time, true)
      }
    } else {
      views.setChronometer(
        R.id.workout_live_primary_time,
        SystemClock.elapsedRealtime() - (System.currentTimeMillis() - workoutStartedAtMs),
        null,
        true
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        views.setChronometerCountDown(R.id.workout_live_primary_time, false)
      }
    }
    return views
  }

  private fun buildExpanded(): RemoteViews {
    val views = RemoteViews(packageName, R.layout.notification_workout_live_expanded)
    bindExercise(views)
    views.setChronometer(
      R.id.workout_live_duration,
      SystemClock.elapsedRealtime() - (System.currentTimeMillis() - workoutStartedAtMs),
      null,
      true
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      views.setChronometerCountDown(R.id.workout_live_duration, false)
    }

    if (isResting && restEndAtMs > System.currentTimeMillis()) {
      views.setViewVisibility(R.id.workout_live_rest_row, View.VISIBLE)
      views.setViewVisibility(R.id.workout_live_rest_actions, View.VISIBLE)
      views.setViewVisibility(R.id.workout_live_complete, View.GONE)
      views.setChronometer(
        R.id.workout_live_rest_time,
        SystemClock.elapsedRealtime() + (restEndAtMs - System.currentTimeMillis()),
        null,
        true
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        views.setChronometerCountDown(R.id.workout_live_rest_time, true)
      }
      views.setOnClickPendingIntent(R.id.workout_live_minus, actionIntent(ACTION_SUBTRACT, 3101))
      views.setOnClickPendingIntent(R.id.workout_live_plus, actionIntent(ACTION_ADD, 3102))
      views.setOnClickPendingIntent(R.id.workout_live_skip, actionIntent(ACTION_SKIP, 3103))
    } else {
      views.setViewVisibility(R.id.workout_live_rest_row, View.GONE)
      views.setViewVisibility(R.id.workout_live_rest_actions, View.GONE)
      views.setViewVisibility(R.id.workout_live_complete, View.VISIBLE)
      views.setOnClickPendingIntent(
        R.id.workout_live_complete,
        actionIntent(ACTION_COMPLETE_SET, 3104)
      )
    }
    return views
  }

  private fun bindExercise(views: RemoteViews) {
    views.setTextViewText(
      R.id.workout_live_exercise_name,
      exerciseName?.takeIf { it.isNotBlank() } ?: "Entrenamiento"
    )
    views.setTextViewText(
      R.id.workout_live_next_summary,
      nextSetSummary?.takeIf { it.isNotBlank() } ?: "Siguiente serie pendiente"
    )
    if (exerciseBitmap != null) {
      views.setImageViewBitmap(R.id.workout_live_exercise_image, exerciseBitmap)
    } else {
      views.setImageViewResource(R.id.workout_live_exercise_image, R.mipmap.ic_launcher)
    }
  }

  private fun contentIntent(): PendingIntent {
    val intent = Intent(this, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    return PendingIntent.getActivity(this, 2101, intent, pendingFlags())
  }

  private fun actionIntent(action: String, requestCode: Int): PendingIntent {
    val intent = Intent(this, RestTimerNotificationReceiver::class.java).apply {
      this.action = action
    }
    return PendingIntent.getBroadcast(this, requestCode, intent, pendingFlags())
  }

  private fun pendingFlags(): Int {
    val mutable =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
    return PendingIntent.FLAG_UPDATE_CURRENT or mutable
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Entreno en curso",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Live Activity del entrenamiento (estilo Hevy)"
      setShowBadge(false)
      enableVibration(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  private fun loadBitmap(imageUrl: String?): Bitmap? {
    val trimmed = imageUrl?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    return try {
      when {
        trimmed.startsWith("data:image") -> {
          val base64 = trimmed.substringAfter(",", "")
          val decoded = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)
          BitmapFactory.decodeByteArray(decoded, 0, decoded.size)
        }
        trimmed.startsWith("http://") || trimmed.startsWith("https://") ->
          URL(trimmed).openStream().use { BitmapFactory.decodeStream(it) }
        trimmed.startsWith("file://") ->
          BitmapFactory.decodeFile(File(trimmed.removePrefix("file://")).absolutePath)
        else -> {
          val decoded = android.util.Base64.decode(trimmed, android.util.Base64.DEFAULT)
          BitmapFactory.decodeByteArray(decoded, 0, decoded.size)
        }
      }
    } catch (_: Throwable) {
      null
    }
  }
}
