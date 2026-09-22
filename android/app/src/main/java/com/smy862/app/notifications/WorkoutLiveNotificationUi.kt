package com.smy862.app.notifications

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import com.smy862.app.R
import kotlin.math.max
import kotlin.math.min

/**
 * Builds compact / expanded RemoteViews for the ongoing workout notification.
 * Visual language: Material 3 tonal surfaces + EvoFit primary (#6C3BAA).
 */
internal object WorkoutLiveNotificationUi {

  data class Model(
    val workoutStartedAtMs: Long,
    val exerciseName: String?,
    val nextSetSummary: String?,
    val isResting: Boolean,
    val restEndAtMs: Long,
    val restSecondsDefault: Int,
    val exerciseBitmap: Bitmap?,
  )

  data class SetSummaryParts(
    val setLabel: String,
    val prescription: String,
    val hasMeaningfulPrescription: Boolean,
  )

  fun parseSetSummary(raw: String?): SetSummaryParts {
    var working = raw?.trim().orEmpty()
    if (working.isEmpty()) {
      return SetSummaryParts("", "", false)
    }

    if (working.startsWith("Next:", ignoreCase = true)) {
      working = working.substring(5).trim()
    }

    var prescription = ""
    val open = working.lastIndexOf('(')
    val close = working.lastIndexOf(')')
    if (open >= 0 && close > open) {
      prescription = working.substring(open + 1, close).trim()
      working = working.substring(0, open).trim()
    }

    // Normalize EN "set 2 of 6" / ES "serie 2 de 6" → "Serie 2 de 6"
    var setLabel = working
    val enMatch = Regex("""(?i)^set\s+(\d+)\s+of\s+(\d+)$""").matchEntire(setLabel)
    val esMatch = Regex("""(?i)^serie\s+(\d+)\s+de\s+(\d+)$""").matchEntire(setLabel)
    when {
      enMatch != null ->
        setLabel = "Serie ${enMatch.groupValues[1]} de ${enMatch.groupValues[2]}"
      esMatch != null ->
        setLabel = "Serie ${esMatch.groupValues[1]} de ${esMatch.groupValues[2]}"
      setLabel.startsWith("set ", ignoreCase = true) ->
        setLabel = "Serie " + setLabel.substring(4)
      setLabel.startsWith("serie ", ignoreCase = true) ->
        setLabel = "Serie " + setLabel.substring(6)
    }

    val meaningful = isMeaningfulPrescription(prescription)
    if (
      meaningful &&
      prescription.contains('x', ignoreCase = true) &&
      !prescription.contains("rep", ignoreCase = true)
    ) {
      prescription = "$prescription reps"
    }

    return SetSummaryParts(
      setLabel = setLabel,
      prescription = if (meaningful) prescription else "",
      hasMeaningfulPrescription = meaningful,
    )
  }

  private fun isMeaningfulPrescription(value: String): Boolean {
    if (value.isBlank()) return false
    val normalized = value.lowercase().replace(" ", "")
    if (normalized.matches(Regex("""0(\.0)?kgx0(reps)?"""))) return false
    if (normalized == "—" || normalized == "-") return false
    return true
  }

  fun toCircularBitmap(source: Bitmap, sizePx: Int = 128): Bitmap {
    val diameter = min(source.width, source.height).coerceAtLeast(1)
    val squared = Bitmap.createBitmap(source, 0, 0, diameter, diameter)
    val output = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(output)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val dest = Rect(0, 0, sizePx, sizePx)
    canvas.drawCircle(sizePx / 2f, sizePx / 2f, sizePx / 2f, paint)
    paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
    canvas.drawBitmap(squared, Rect(0, 0, diameter, diameter), dest, paint)
    if (squared !== source) squared.recycle()
    return output
  }

  fun bindCompact(packageName: String, model: Model): RemoteViews {
    val views = RemoteViews(packageName, R.layout.notification_workout_live_compact)
    val parts = parseSetSummary(model.nextSetSummary)
    bindSharedExercise(views, model, parts, compact = true)

    val now = System.currentTimeMillis()
    if (model.isResting && model.restEndAtMs > now) {
      views.setChronometer(
        R.id.workout_live_primary_time,
        SystemClock.elapsedRealtime() + (model.restEndAtMs - now),
        null,
        true
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        views.setChronometerCountDown(R.id.workout_live_primary_time, true)
      }
      views.setTextColor(R.id.workout_live_primary_time, 0xFF6C3BAA.toInt())
    } else {
      val base = if (model.workoutStartedAtMs > 0) model.workoutStartedAtMs else now
      views.setChronometer(
        R.id.workout_live_primary_time,
        SystemClock.elapsedRealtime() - (now - base),
        null,
        true
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        views.setChronometerCountDown(R.id.workout_live_primary_time, false)
      }
      views.setTextColor(R.id.workout_live_primary_time, 0xFF5F6368.toInt())
    }
    return views
  }

  fun bindExpanded(
    packageName: String,
    model: Model,
    actionBinder: (RemoteViews) -> Unit,
  ): RemoteViews {
    val views = RemoteViews(packageName, R.layout.notification_workout_live_expanded)
    val parts = parseSetSummary(model.nextSetSummary)
    bindSharedExercise(views, model, parts, compact = false)

    val now = System.currentTimeMillis()
    val started = if (model.workoutStartedAtMs > 0) model.workoutStartedAtMs else now
    views.setChronometer(
      R.id.workout_live_duration,
      SystemClock.elapsedRealtime() - (now - started),
      null,
      true
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      views.setChronometerCountDown(R.id.workout_live_duration, false)
    }

    if (model.isResting && model.restEndAtMs > now) {
      views.setTextViewText(R.id.workout_live_header_label, "Descanso")
      views.setViewVisibility(R.id.workout_live_rest_block, View.VISIBLE)
      views.setViewVisibility(R.id.workout_live_active_row, View.GONE)

      val totalMs = max(1L, model.restSecondsDefault * 1000L)
      val remainingMs = max(0L, model.restEndAtMs - now)
      val elapsedMs = max(0L, totalMs - remainingMs)
      val progress = ((elapsedMs * 1000L) / totalMs).toInt().coerceIn(0, 1000)
      views.setProgressBar(R.id.workout_live_rest_progress, 1000, progress, false)

      views.setChronometer(
        R.id.workout_live_rest_time,
        SystemClock.elapsedRealtime() + remainingMs,
        null,
        true
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        views.setChronometerCountDown(R.id.workout_live_rest_time, true)
      }
    } else {
      views.setTextViewText(R.id.workout_live_header_label, "Entreno")
      views.setViewVisibility(R.id.workout_live_rest_block, View.GONE)
      views.setViewVisibility(R.id.workout_live_active_row, View.VISIBLE)

      val prescription = when {
        parts.hasMeaningfulPrescription -> parts.prescription
        parts.setLabel.isNotBlank() -> parts.setLabel
        else -> "Serie lista"
      }
      views.setTextViewText(R.id.workout_live_prescription, prescription)
    }

    actionBinder(views)
    return views
  }

  private fun bindSharedExercise(
    views: RemoteViews,
    model: Model,
    parts: SetSummaryParts,
    compact: Boolean,
  ) {
    views.setTextViewText(
      R.id.workout_live_exercise_name,
      model.exerciseName?.takeIf { it.isNotBlank() } ?: "Entrenamiento"
    )

    val subtitle = when {
      model.isResting -> when {
        parts.hasMeaningfulPrescription && parts.setLabel.isNotBlank() ->
          "${parts.setLabel} · ${parts.prescription}"
        parts.setLabel.isNotBlank() -> parts.setLabel
        model.nextSetSummary?.isNotBlank() == true -> model.nextSetSummary!!
        else -> "Siguiente serie"
      }
      // Expanded active: subtitle is "Serie X de Y"
      !compact -> parts.setLabel.ifBlank { "Serie pendiente" }
      parts.hasMeaningfulPrescription ->
        "${parts.setLabel.ifBlank { "Serie" }} · ${parts.prescription}"
      parts.setLabel.isNotBlank() -> parts.setLabel
      else -> "Serie pendiente"
    }
    views.setTextViewText(R.id.workout_live_next_summary, subtitle)

    if (model.exerciseBitmap != null) {
      views.setImageViewBitmap(R.id.workout_live_exercise_image, model.exerciseBitmap)
      // Fill the tonal circle; XML default padding is for the barbell glyph.
      views.setViewPadding(R.id.workout_live_exercise_image, 0, 0, 0, 0)
    } else {
      views.setImageViewResource(R.id.workout_live_exercise_image, R.drawable.ic_workout_live_barbell)
      // ~8dp inset so the flat barbell sits inside the primary-container circle.
      val padPx = if (compact) 21 else 24
      views.setViewPadding(
        R.id.workout_live_exercise_image,
        padPx,
        padPx,
        padPx,
        padPx
      )
    }
  }
}
