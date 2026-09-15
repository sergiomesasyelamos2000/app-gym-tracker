package com.smy862.app.notifications

import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * RN bridge for workout Live Activity (Android FGS notification).
 * Keeps legacy rest-timer method names for backwards compatibility.
 */
class RestTimerNotificationModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    internal const val EVENT_NAME = "onRestTimerIntent"
    internal const val EVENT_NAME_WORKOUT = "onWorkoutLiveIntent"

    // Legacy action constants (still used by older PendingIntents if any)
    internal const val ACTION_ADD = WorkoutLiveForegroundService.ACTION_ADD
    internal const val ACTION_SUBTRACT = WorkoutLiveForegroundService.ACTION_SUBTRACT
    internal const val ACTION_SKIP = WorkoutLiveForegroundService.ACTION_SKIP

    private var moduleInstance: RestTimerNotificationModule? = null

    internal fun handleAction(context: android.content.Context, action: String) {
      when (action) {
        WorkoutLiveForegroundService.ACTION_ADD,
        WorkoutLiveForegroundService.ACTION_SUBTRACT,
        WorkoutLiveForegroundService.ACTION_SKIP,
        WorkoutLiveForegroundService.ACTION_COMPLETE_SET,
        // Also accept legacy rest.* actions
        "com.smy862.app.rest.ADD",
        "com.smy862.app.rest.SUBTRACT",
        "com.smy862.app.rest.SKIP" -> {
          val mapped = when (action) {
            "com.smy862.app.rest.ADD" -> WorkoutLiveForegroundService.ACTION_ADD
            "com.smy862.app.rest.SUBTRACT" -> WorkoutLiveForegroundService.ACTION_SUBTRACT
            "com.smy862.app.rest.SKIP" -> WorkoutLiveForegroundService.ACTION_SKIP
            else -> action
          }
          WorkoutLiveForegroundService.handleAction(context, mapped)
        }
      }
    }

    internal fun emitFromService(action: String, delta: Int, endTimestampMs: Long) {
      moduleInstance?.emitIntentEvent(action, delta, endTimestampMs)
    }
  }

  override fun getName(): String = "RestTimerNotification"

  init {
    moduleInstance = this
  }

  @ReactMethod
  fun startWorkoutLive(
    workoutStartedAtMs: Double,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?,
    isResting: Boolean,
    restEndAtMs: Double?,
    restSecondsDefault: Double?
  ) {
    startOrUpdateService(
      WorkoutLiveForegroundService.ACTION_START,
      workoutStartedAtMs,
      exerciseName,
      imageUrl,
      nextSetSummary,
      isResting,
      restEndAtMs,
      restSecondsDefault
    )
  }

  @ReactMethod
  fun updateWorkoutLive(
    workoutStartedAtMs: Double,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?,
    isResting: Boolean,
    restEndAtMs: Double?,
    restSecondsDefault: Double?
  ) {
    startOrUpdateService(
      WorkoutLiveForegroundService.ACTION_UPDATE,
      workoutStartedAtMs,
      exerciseName,
      imageUrl,
      nextSetSummary,
      isResting,
      restEndAtMs,
      restSecondsDefault
    )
  }

  @ReactMethod
  fun endWorkoutLive() {
    val intent = Intent(reactContext, WorkoutLiveForegroundService::class.java).apply {
      action = WorkoutLiveForegroundService.ACTION_STOP
    }
    reactContext.startService(intent)
  }

  @ReactMethod
  fun clearRestLive() {
    val intent = Intent(reactContext, WorkoutLiveForegroundService::class.java).apply {
      action = WorkoutLiveForegroundService.ACTION_CLEAR_REST
    }
    reactContext.startService(intent)
  }

  // --- Legacy rest-only API -------------------------------------------------

  @ReactMethod
  fun startRestTimer(
    endTimestampMs: Double,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?
  ) {
    startWorkoutLive(
      System.currentTimeMillis().toDouble(),
      exerciseName,
      imageUrl,
      nextSetSummary,
      true,
      endTimestampMs,
      null
    )
  }

  @ReactMethod
  fun updateRestTimer(
    endTimestampMs: Double,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?
  ) {
    updateWorkoutLive(
      System.currentTimeMillis().toDouble(),
      exerciseName,
      imageUrl,
      nextSetSummary,
      true,
      endTimestampMs,
      null
    )
  }

  @ReactMethod
  fun endRestTimer() {
    endWorkoutLive()
  }

  private fun startOrUpdateService(
    action: String,
    workoutStartedAtMs: Double,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?,
    isResting: Boolean,
    restEndAtMs: Double?,
    restSecondsDefault: Double?
  ) {
    val intent = Intent(reactContext, WorkoutLiveForegroundService::class.java).apply {
      this.action = action
      putExtra(
        WorkoutLiveForegroundService.EXTRA_WORKOUT_STARTED_AT,
        workoutStartedAtMs.toLong()
      )
      putExtra(WorkoutLiveForegroundService.EXTRA_EXERCISE_NAME, exerciseName)
      if (imageUrl != null) {
        putExtra(WorkoutLiveForegroundService.EXTRA_IMAGE_URL, imageUrl)
      }
      putExtra(WorkoutLiveForegroundService.EXTRA_NEXT_SUMMARY, nextSetSummary)
      putExtra(WorkoutLiveForegroundService.EXTRA_IS_RESTING, isResting)
      if (restEndAtMs != null) {
        putExtra(WorkoutLiveForegroundService.EXTRA_REST_END_AT, restEndAtMs.toLong())
      }
      if (restSecondsDefault != null) {
        putExtra(
          WorkoutLiveForegroundService.EXTRA_REST_DEFAULT,
          restSecondsDefault.toInt()
        )
      }
    }
    ContextCompat.startForegroundService(reactContext, intent)
  }

  private fun emitIntentEvent(action: String, delta: Int, endTimestampMs: Long) {
    if (!reactContext.hasActiveReactInstance()) return
    val params = Arguments.createMap().apply {
      putString("action", action)
      putInt("delta", delta)
      putDouble("endTimestampMs", endTimestampMs.toDouble())
    }
    val emitter =
      reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
    emitter.emit(EVENT_NAME, params)
    emitter.emit(EVENT_NAME_WORKOUT, params)
  }
}
