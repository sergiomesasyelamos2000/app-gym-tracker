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
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.smy862.app.MainActivity
import com.smy862.app.R
import java.io.File
import java.net.URL
import kotlin.math.max

/**
 * Foreground service hosting the ongoing workout Live Activity notification.
 * Presentation lives in [WorkoutLiveNotificationUi]; this class owns state + intents.
 */
class WorkoutLiveForegroundService : Service() {

  companion object {
    const val NOTIFICATION_ID = 9102
    const val CHANNEL_ID = "workout-live-ongoing-v2"

    const val ACTION_START = "com.smy862.app.workout.START"
    const val ACTION_UPDATE = "com.smy862.app.workout.UPDATE"
    const val ACTION_STOP = "com.smy862.app.workout.STOP"
    const val ACTION_CLEAR_REST = "com.smy862.app.workout.CLEAR_REST"
    const val ACTION_ADD = "com.smy862.app.workout.ADD"
    const val ACTION_SUBTRACT = "com.smy862.app.workout.SUBTRACT"
    const val ACTION_SKIP = "com.smy862.app.workout.SKIP"
    const val ACTION_COMPLETE_SET = "com.smy862.app.workout.COMPLETE_SET"
    const val ACTION_OPEN = "com.smy862.app.workout.OPEN"

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
      if (action == ACTION_OPEN) {
        bringAppToForegroundAndOpen(context)
        return
      }
      val svc = instance
      if (svc == null) {
        val intent = Intent(context, WorkoutLiveForegroundService::class.java).apply {
          this.action = action
        }
        context.startService(intent)
        return
      }
      when (action) {
        ACTION_ADD -> svc.applyRestDelta(15)
        ACTION_SUBTRACT -> svc.applyRestDelta(-15)
        ACTION_SKIP -> svc.clearRest(emitSkip = true)
        ACTION_CLEAR_REST -> svc.clearRest(emitSkip = false)
        ACTION_COMPLETE_SET -> {
          RestTimerNotificationModule.emitFromService("completeSet", 0, 0)
        }
      }
    }

    private fun bringAppToForegroundAndOpen(context: Context) {
      val launch = Intent(context, MainActivity::class.java).apply {
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_SINGLE_TOP or
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        )
      }
      context.startActivity(launch)
      RestTimerNotificationModule.emitFromService("open", 0, 0)
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
  private var lastRestPublishAtMs: Long = 0

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
      ACTION_ADD, ACTION_SUBTRACT, ACTION_SKIP, ACTION_COMPLETE_SET, ACTION_CLEAR_REST, ACTION_OPEN -> {
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
        val bmp = loadBitmap(imageUrl)?.let { WorkoutLiveNotificationUi.toCircularBitmap(it) }
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
      publishForeground(force = true)
    }
  }

  private fun clearRest(emitSkip: Boolean) {
    isResting = false
    restEndAtMs = 0
    cancelRestTimer()
    if (emitSkip) {
      RestTimerNotificationModule.emitFromService("skip", 0, 0)
    }
    publishForeground(force = true)
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
        val now = System.currentTimeMillis()
        // Progress bar needs ~1 Hz updates; Chronometer handles the digits.
        if (now - lastRestPublishAtMs >= 900L) {
          lastRestPublishAtMs = now
          publishForeground(force = true)
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

  private fun currentModel(): WorkoutLiveNotificationUi.Model =
    WorkoutLiveNotificationUi.Model(
      workoutStartedAtMs = workoutStartedAtMs,
      exerciseName = exerciseName,
      nextSetSummary = nextSetSummary,
      isResting = isResting,
      restEndAtMs = restEndAtMs,
      restSecondsDefault = restSecondsDefault,
      exerciseBitmap = exerciseBitmap,
    )

  private fun publishForeground(force: Boolean = false) {
    ensureChannel()
    val key =
      "$workoutStartedAtMs|$exerciseName|$nextSetSummary|$isResting|$restEndAtMs|$restSecondsDefault"
    if (!force && key == lastPublishedKey && !isResting) {
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
    val model = currentModel()
    val openPi = openIntent()
    val compact = WorkoutLiveNotificationUi.bindCompact(packageName, model)
    val expanded = WorkoutLiveNotificationUi.bindExpanded(packageName, model) { views ->
      bindActions(views)
    }
    // Custom RemoteViews need an explicit root click; builder contentIntent alone is unreliable.
    compact.setOnClickPendingIntent(R.id.workout_live_root, openPi)
    expanded.setOnClickPendingIntent(R.id.workout_live_root, openPi)

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setColor(0xFF6C3BAA.toInt())
      .setCustomContentView(compact)
      .setCustomBigContentView(expanded)
      // Full custom card — no system Decorated header (bell / chevron chrome).
      .setContentIntent(openPi)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  private fun bindActions(views: RemoteViews) {
    if (isResting && restEndAtMs > System.currentTimeMillis()) {
      views.setOnClickPendingIntent(R.id.workout_live_minus, actionIntent(ACTION_SUBTRACT, 3101))
      views.setOnClickPendingIntent(R.id.workout_live_plus, actionIntent(ACTION_ADD, 3102))
      views.setOnClickPendingIntent(R.id.workout_live_skip, actionIntent(ACTION_SKIP, 3103))
    } else {
      views.setOnClickPendingIntent(
        R.id.workout_live_complete,
        actionIntent(ACTION_COMPLETE_SET, 3104)
      )
    }
  }

  private fun openIntent(): PendingIntent {
    return actionIntent(ACTION_OPEN, 2101)
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
      NotificationManager.IMPORTANCE_DEFAULT
    ).apply {
      description = "Notificación continua del entrenamiento"
      setShowBadge(false)
      enableVibration(false)
      setSound(null, null)
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
