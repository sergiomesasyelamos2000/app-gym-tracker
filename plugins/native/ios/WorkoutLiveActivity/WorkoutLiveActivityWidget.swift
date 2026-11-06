import ActivityKit
import ImageIO
import SwiftUI
import UIKit
import WidgetKit

/// Dark, Hevy-style palette. The Lock Screen card is always black.
private enum LiveTheme {
  /// EvoFit primary (#6C3BAA) lifted for contrast on black.
  static let brand = Color(red: 0.55, green: 0.36, blue: 0.86)
  static let textPrimary = Color.white
  static let textSecondary = Color.white.opacity(0.62)
  static let textTertiary = Color.white.opacity(0.45)
  static let surface = Color(red: 0.05, green: 0.05, blue: 0.06)
  static let controlFill = Color.white.opacity(0.14)
  static let checkFill = Color.white.opacity(0.22)
  static let dotInactive = Color.white.opacity(0.22)
  static let completeGreen = Color(red: 0.22, green: 0.78, blue: 0.35)
}

/// Lock Screen Live Activities are clipped at 160pt — keep sizes in budget.
private enum LiveLayout {
  static let horizontalPadding: CGFloat = 14
  static let verticalPadding: CGFloat = 10
  static let rowSpacing: CGFloat = 8
  static let thumbSize: CGFloat = 40
  static let maxSetDots = 10
}

/// Switch away from `timerInterval` before the clock hits `end`.
/// SwiftUI can fatal when a mounted `Text`/`ProgressView(timerInterval:)` crosses its end.
private let liveTimerSafetyMargin: TimeInterval = 1.5

/// Cap elapsed workout clocks — `Date.distantFuture` traps `Text(timerInterval:)`.
private let workoutElapsedMaxDuration: TimeInterval = 24 * 60 * 60

/// Stable rest countdown range (fixed start…end). Nil when too close to expiry.
/// Duration is at least the remaining time so ±15 never places `start` in the future.
private func stableRestCountdownRange(
  until end: Date,
  restSecondsDefault: Int,
  now: Date = Date()
) -> ClosedRange<Date>? {
  let remaining = end.timeIntervalSince(now)
  guard remaining > liveTimerSafetyMargin else { return nil }
  let duration = max(max(1.0, Double(restSecondsDefault)), remaining)
  let start = end.addingTimeInterval(-duration)
  guard start < end else { return nil }
  return start...end
}

/// Elapsed workout clock with a bounded end (never `Date.distantFuture`).
private func workoutElapsedRange(
  startedAt: Date,
  now: Date = Date()
) -> ClosedRange<Date>? {
  guard startedAt <= now else { return nil }
  let end = startedAt.addingTimeInterval(workoutElapsedMaxDuration)
  guard now.timeIntervalSince(end) < -liveTimerSafetyMargin else { return nil }
  return startedAt...end
}

// MARK: - Safe timer views

@available(iOS 17.0, *)
private struct SafeRestCountdownText: View {
  let end: Date
  let restSecondsDefault: Int
  var font: Font = .title3.bold()
  var color: Color = LiveTheme.brand
  var width: CGFloat? = nil

  var body: some View {
    // Remount the whole timeline when end changes — an inner .id inside
    // .periodic(by: 1) can wait up to ~1s before adopting a new range.
    TimelineView(.periodic(from: .now, by: 1)) { context in
      Group {
        if let range = stableRestCountdownRange(
          until: end,
          restSecondsDefault: restSecondsDefault,
          now: context.date
        ) {
          Text(timerInterval: range, countsDown: true)
        } else {
          Text("0:00")
        }
      }
      .monospacedDigit()
      .font(font)
      .foregroundStyle(color)
      .frame(width: width)
    }
    .id(end)
  }
}

@available(iOS 17.0, *)
private struct SafeWorkoutElapsedText: View {
  let startedAt: Date
  var font: Font = .caption.bold()
  var color: Color = .primary
  var width: CGFloat? = nil
  var multilineTrailing: Bool = false

  var body: some View {
    TimelineView(.periodic(from: .now, by: 30)) { context in
      Group {
        if let range = workoutElapsedRange(
          startedAt: startedAt,
          now: context.date
        ) {
          Text(timerInterval: range, countsDown: false)
        } else {
          Text("0:00")
        }
      }
      .monospacedDigit()
      .font(font)
      .foregroundStyle(color)
      .frame(width: width)
      .multilineTextAlignment(multilineTrailing ? .trailing : .leading)
    }
  }
}

private func formatFrozenElapsed(_ totalSeconds: Int) -> String {
  let s = max(0, totalSeconds)
  let hours = s / 3600
  let minutes = (s % 3600) / 60
  let seconds = s % 60
  if hours > 0 {
    return String(format: "%d:%02d:%02d", hours, minutes, seconds)
  }
  return String(format: "%d:%02d", minutes, seconds)
}

@available(iOS 17.0, *)
private struct WorkoutElapsedClock: View {
  let context: ActivityViewContext<WorkoutLiveAttributes>
  var font: Font = .caption.bold()
  var color: Color = .primary
  var width: CGFloat? = nil
  var multilineTrailing: Bool = false

  var body: some View {
    if context.state.pausedClock {
      Text(formatFrozenElapsed(context.state.pausedElapsedSeconds ?? 0))
        .monospacedDigit()
        .font(font)
        .foregroundStyle(color)
        .frame(width: width)
        .multilineTextAlignment(multilineTrailing ? .trailing : .leading)
    } else {
      SafeWorkoutElapsedText(
        startedAt: context.state.timerStartedAt ?? context.attributes.workoutStartedAt,
        font: font,
        color: color,
        width: width,
        multilineTrailing: multilineTrailing
      )
    }
  }
}

@available(iOS 17.0, *)
private struct SafeRestProgressBar: View {
  let end: Date
  let restSecondsDefault: Int

  var body: some View {
    TimelineView(.periodic(from: .now, by: 1)) { context in
      Group {
        if let range = stableRestCountdownRange(
          until: end,
          restSecondsDefault: restSecondsDefault,
          now: context.date
        ) {
          ProgressView(timerInterval: range, countsDown: true)
        } else {
          ProgressView(value: 0)
        }
      }
      .tint(LiveTheme.brand)
      .labelsHidden()
      .scaleEffect(x: 1, y: 0.55, anchor: .center)
    }
    .id(end)
  }
}

@available(iOS 17.0, *)
@main
struct WorkoutLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    WorkoutLiveActivityWidget()
  }
}

@available(iOS 17.0, *)
struct WorkoutLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutLiveAttributes.self) { context in
      WorkoutLiveLockScreenView(context: context)
        .activityBackgroundTint(LiveTheme.surface)
        .activitySystemActionForegroundColor(LiveTheme.textPrimary)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            ExerciseThumbnailView(
              imageFileName: context.state.imageFileName,
              size: 36
            )
            Text(context.state.exerciseName)
              .font(.caption)
              .fontWeight(.semibold)
              .foregroundStyle(.primary)
              .lineLimit(2)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          if context.state.pausedClock {
            WorkoutElapsedClock(context: context, font: .caption.bold())
          } else if context.state.isResting, let end = context.state.restEndAt {
            SafeRestCountdownText(
              end: end,
              restSecondsDefault: context.state.restSecondsDefault,
              font: .title3.bold(),
              color: LiveTheme.brand
            )
          } else {
            WorkoutElapsedClock(context: context, font: .caption.bold())
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          if context.state.pausedClock {
            Text("En pausa")
              .font(.caption.bold())
              .foregroundStyle(.secondary)
              .frame(maxWidth: .infinity)
          } else if context.state.isResting {
            HStack(spacing: 8) {
              Button(intent: WorkoutLiveSubtractRestIntent()) {
                Text("-15s")
                  .frame(maxWidth: .infinity)
              }
              Button(intent: WorkoutLiveAddRestIntent()) {
                Text("+15s")
                  .frame(maxWidth: .infinity)
              }
              Button(intent: WorkoutLiveSkipRestIntent()) {
                Text("Omitir")
                  .frame(maxWidth: .infinity)
              }
              .tint(LiveTheme.brand)
            }
            .font(.caption.bold())
          } else {
            Button(intent: WorkoutLiveCompleteSetIntent()) {
              Label("Completar", systemImage: "checkmark")
                .font(.caption.bold())
                .frame(maxWidth: .infinity)
            }
            .tint(LiveTheme.completeGreen)
          }
        }
      } compactLeading: {
        ExerciseThumbnailView(
          imageFileName: context.state.imageFileName,
          size: 24
        )
      } compactTrailing: {
        if context.state.pausedClock {
          WorkoutElapsedClock(
            context: context,
            font: .body.monospacedDigit(),
            width: 48
          )
        } else if context.state.isResting, let end = context.state.restEndAt {
          SafeRestCountdownText(
            end: end,
            restSecondsDefault: context.state.restSecondsDefault,
            font: .body.monospacedDigit(),
            color: LiveTheme.brand,
            width: 48
          )
        } else {
          WorkoutElapsedClock(
            context: context,
            font: .body.monospacedDigit(),
            width: 48
          )
        }
      } minimal: {
        ExerciseThumbnailView(
          imageFileName: context.state.imageFileName,
          size: 22
        )
      }
    }
  }
}

// MARK: - Lock screen / banner

@available(iOS 17.0, *)
struct WorkoutLiveLockScreenView: View {
  let context: ActivityViewContext<WorkoutLiveAttributes>

  private var parsed: LiveSetSummaryParts {
    LiveSetSummaryParts.parse(context.state.nextSetSummary)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: LiveLayout.rowSpacing) {
      headerRow
      exerciseRow
      if context.state.pausedClock {
        pausedSection
      } else if context.state.isResting {
        restSection
      } else {
        activeSetSection
      }
    }
    .padding(.horizontal, LiveLayout.horizontalPadding)
    .padding(.vertical, LiveLayout.verticalPadding)
  }

  private var headerRow: some View {
    HStack(spacing: 6) {
      Image("EvoFitLogo")
        .resizable()
        .scaledToFit()
        .frame(width: 16, height: 16)
        .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
      Text(routineTitle)
        .font(.caption.weight(.medium))
        .foregroundStyle(LiveTheme.textTertiary)
        .lineLimit(1)
      Spacer(minLength: 8)
      WorkoutElapsedClock(
        context: context,
        font: .caption.monospacedDigit().weight(.medium),
        color: LiveTheme.textSecondary,
        multilineTrailing: true
      )
    }
  }

  private var pausedSection: some View {
    HStack {
      Text("En pausa")
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(LiveTheme.textSecondary)
      Spacer(minLength: 8)
      Text(formatFrozenElapsed(context.state.pausedElapsedSeconds ?? 0))
        .font(.title3.weight(.bold).monospacedDigit())
        .foregroundStyle(LiveTheme.textPrimary)
    }
  }

  private var routineTitle: String {
    let name = context.state.routineName?.trimmingCharacters(in: .whitespacesAndNewlines)
    return name?.isEmpty == false ? name! : "Entrenamiento"
  }

  private var exerciseRow: some View {
    HStack(alignment: .center, spacing: 12) {
      ExerciseThumbnailView(
        imageFileName: context.state.imageFileName,
        size: LiveLayout.thumbSize
      )

      VStack(alignment: .leading, spacing: 4) {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
          Text(context.state.exerciseName)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(LiveTheme.textPrimary)
            .lineLimit(1)
          Spacer(minLength: 4)
          if let position = exercisePositionLabel {
            Text(position)
              .font(.caption2.weight(.semibold))
              .foregroundStyle(LiveTheme.textTertiary)
              .fixedSize()
          }
        }

        if context.state.isResting {
          Text(restSubtitle)
            .font(.caption)
            .foregroundStyle(LiveTheme.textSecondary)
            .lineLimit(1)
        } else {
          HStack(spacing: 6) {
            if let completed = context.state.completedSets,
               let total = context.state.totalSets {
              SetProgressDots(completed: completed, total: total)
            }
            Text(activeSetLabel)
              .font(.caption)
              .foregroundStyle(LiveTheme.textSecondary)
              .lineLimit(1)
          }
        }
      }
    }
  }

  private var exercisePositionLabel: String? {
    guard let index = context.state.exerciseIndex,
          let count = context.state.exerciseCount,
          index > 0, count > 0
    else { return nil }
    return "Ej. \(index)/\(count)"
  }

  private var activeSetLabel: String {
    if !parsed.setLabel.isEmpty { return parsed.setLabel }
    if let completed = context.state.completedSets,
       let total = context.state.totalSets, total > 0 {
      return "Serie \(min(completed + 1, total)) de \(total)"
    }
    return "Serie pendiente"
  }

  private var restSubtitle: String {
    let raw = context.state.nextSetSummary.trimmingCharacters(in: .whitespacesAndNewlines)
    if raw.isEmpty { return "Siguiente serie pendiente" }
    // "Próximo ejercicio: …" and other free text are already readable.
    guard !parsed.setLabel.isEmpty, parsed.setLabel.hasPrefix("Serie") else { return raw }
    let setText = "serie" + parsed.setLabel.dropFirst("Serie".count)
    if parsed.prescription.isEmpty { return "Siguiente: \(setText)" }
    return "Siguiente: \(setText) · \(parsed.prescription)"
  }

  private var activeSetSection: some View {
    HStack(alignment: .center, spacing: 16) {
      let metrics = parsed.metrics
      if metrics.isEmpty {
        Text(parsed.prescription.isEmpty ? "—" : parsed.prescription)
          .font(.title3.weight(.bold))
          .foregroundStyle(LiveTheme.textPrimary)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
      } else {
        ForEach(metrics.indices, id: \.self) { index in
          LiveMetricBlock(value: metrics[index].value, unit: metrics[index].unit)
        }
      }

      Spacer(minLength: 8)

      Button(intent: WorkoutLiveCompleteSetIntent()) {
        Image(systemName: "checkmark")
          .font(.system(size: 17, weight: .bold))
          .foregroundStyle(.white)
          .frame(width: 40, height: 40)
          .background(LiveTheme.checkFill)
          .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
      }
      .buttonStyle(.plain)
    }
  }

  private var restSection: some View {
    VStack(spacing: LiveLayout.rowSpacing) {
      Group {
        if let end = context.state.restEndAt {
          SafeRestProgressBar(
            end: end,
            restSecondsDefault: context.state.restSecondsDefault
          )
        } else {
          ProgressView(value: 0)
            .tint(LiveTheme.brand)
            .labelsHidden()
        }
      }
      // Edge-to-edge bar like Hevy.
      .padding(.horizontal, -LiveLayout.horizontalPadding)

      HStack(spacing: 8) {
        Button(intent: WorkoutLiveSubtractRestIntent()) {
          Text("-15s")
            .frame(minWidth: 52)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
        }
        .buttonStyle(LivePillButtonStyle(fill: LiveTheme.controlFill, foreground: LiveTheme.textPrimary))

        Spacer(minLength: 4)

        restTimerLabel

        Spacer(minLength: 4)

        Button(intent: WorkoutLiveAddRestIntent()) {
          Text("+15s")
            .frame(minWidth: 52)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
        }
        .buttonStyle(LivePillButtonStyle(fill: LiveTheme.controlFill, foreground: LiveTheme.textPrimary))

        Button(intent: WorkoutLiveSkipRestIntent()) {
          Text("Omitir")
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
        }
        .buttonStyle(LivePillButtonStyle(fill: LiveTheme.brand, foreground: .white))
      }
    }
  }

  private var restTimerLabel: some View {
    VStack(spacing: 0) {
      Text("DESCANSO")
        .font(.system(size: 9, weight: .bold))
        .tracking(0.8)
        .foregroundStyle(LiveTheme.textTertiary)
      Group {
        if let end = context.state.restEndAt {
          // Time only (no "Rest:" prefix) — lock screen truncates "Rest: 2:50" to "R…2:50".
          SafeRestCountdownText(
            end: end,
            restSecondsDefault: context.state.restSecondsDefault,
            font: .system(size: 26, weight: .bold).monospacedDigit(),
            color: LiveTheme.textPrimary,
            width: 76
          )
        } else {
          Text("0:00")
            .font(.system(size: 26, weight: .bold).monospacedDigit())
            .foregroundStyle(LiveTheme.textPrimary)
            .frame(width: 76)
        }
      }
      .minimumScaleFactor(0.8)
    }
  }
}

// MARK: - Set progress / metrics

/// One dot per set; falls back to nothing when there are too many to fit.
@available(iOS 17.0, *)
struct SetProgressDots: View {
  let completed: Int
  let total: Int

  var body: some View {
    if total > 0, total <= LiveLayout.maxSetDots {
      HStack(spacing: 3) {
        ForEach(0..<total, id: \.self) { index in
          Circle()
            .fill(index < completed ? LiveTheme.brand : LiveTheme.dotInactive)
            .frame(width: 6, height: 6)
        }
      }
    }
  }
}

@available(iOS 17.0, *)
struct LiveMetricBlock: View {
  let value: String
  let unit: String

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(value)
        .font(.title2.weight(.bold).monospacedDigit())
        .foregroundStyle(LiveTheme.textPrimary)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      if !unit.isEmpty {
        Text(unit)
          .font(.system(size: 10, weight: .semibold))
          .tracking(0.6)
          .foregroundStyle(LiveTheme.textTertiary)
      }
    }
  }
}

// MARK: - Exercise thumbnail

/// Hevy-style exercise thumb: white circle, whole image (no crop),
/// dumbbell symbol only when no thumb was stored in the App Group.
@available(iOS 17.0, *)
struct ExerciseThumbnailView: View {
  let imageFileName: String?
  let size: CGFloat

  var body: some View {
    ZStack {
      Circle().fill(Color.white)
      if let uiImage = loadLiveExerciseThumb(imageFileName, maxPixelSize: size * 3) {
        Image(uiImage: uiImage)
          .resizable()
          .scaledToFit()
          // Inset so square illustrations are not cut by the circle.
          .padding(size * 0.12)
      } else {
        Image(systemName: "dumbbell.fill")
          .font(.system(size: size * 0.42, weight: .semibold))
          .foregroundStyle(LiveTheme.brand)
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
  }
}

/// Reads a thumb written by the app into the App Group. Downsamples via ImageIO
/// so a stale full-size file cannot blow the widget memory budget.
private func loadLiveExerciseThumb(_ relativePath: String?, maxPixelSize: CGFloat) -> UIImage? {
  guard let relativePath, !relativePath.isEmpty,
        !relativePath.hasPrefix("http://"), !relativePath.hasPrefix("https://"),
        !relativePath.hasPrefix("data:"),
        let container = FileManager.default.containerURL(
          forSecurityApplicationGroupIdentifier: WorkoutLiveStore.appGroupId
        )
  else { return nil }

  let fileURL = container.appendingPathComponent(relativePath)
  let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
  guard let source = CGImageSourceCreateWithURL(fileURL as CFURL, sourceOptions) else {
    return nil
  }
  let thumbOptions = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceCreateThumbnailWithTransform: true,
    kCGImageSourceShouldCacheImmediately: true,
    kCGImageSourceThumbnailMaxPixelSize: maxPixelSize,
  ] as CFDictionary
  guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbOptions) else {
    return nil
  }
  return UIImage(cgImage: cgImage)
}

// MARK: - Parsing helpers

struct LiveSetSummaryParts {
  var setLabel: String
  var prescription: String

  /// "32.5 kg x 4-6 reps" → [("32.5", "KG"), ("4-6", "REPS")]. Empty when unparseable.
  var metrics: [(value: String, unit: String)] {
    let pieces = prescription
      .components(separatedBy: " x ")
      .map { $0.trimmingCharacters(in: .whitespaces) }
      .filter { !$0.isEmpty }
    guard (1...2).contains(pieces.count) else { return [] }
    return pieces.map { piece -> (value: String, unit: String) in
      guard let space = piece.lastIndex(of: " ") else { return (value: piece, unit: "") }
      let value = String(piece[..<space]).trimmingCharacters(in: .whitespaces)
      let unit = String(piece[piece.index(after: space)...]).uppercased()
      return (value: value, unit: unit)
    }
  }

  static func parse(_ raw: String) -> LiveSetSummaryParts {
    let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
      return LiveSetSummaryParts(setLabel: "", prescription: "")
    }

    // "Serie 2 de 6 (40 kg x 5)" or legacy "Next: set 2 of 6 (40 kg x 5)"
    var working = trimmed
    if working.lowercased().hasPrefix("next:") {
      working = String(working.dropFirst(5)).trimmingCharacters(in: .whitespaces)
    }

    var prescription = ""
    if let open = working.lastIndex(of: "("),
       let close = working.lastIndex(of: ")"),
       open < close {
      prescription = String(working[working.index(after: open)..<close])
        .trimmingCharacters(in: .whitespaces)
      working = String(working[..<open]).trimmingCharacters(in: .whitespaces)
    }

    // Normalize EN "set 2 of 6" / ES "serie 2 de 6" → "Serie 2 de 6"
    var setLabel = working
    let nsLabel = setLabel as NSString
    let fullRange = NSRange(location: 0, length: nsLabel.length)
    if let enRegex = try? NSRegularExpression(
      pattern: #"^set\s+(\d+)\s+of\s+(\d+)$"#,
      options: .caseInsensitive
    ),
      let match = enRegex.firstMatch(in: setLabel, range: fullRange),
      match.numberOfRanges == 3 {
      setLabel = "Serie \(nsLabel.substring(with: match.range(at: 1))) de \(nsLabel.substring(with: match.range(at: 2)))"
    } else if let esRegex = try? NSRegularExpression(
      pattern: #"^serie\s+(\d+)\s+de\s+(\d+)$"#,
      options: .caseInsensitive
    ),
      let match = esRegex.firstMatch(in: setLabel, range: fullRange),
      match.numberOfRanges == 3 {
      setLabel = "Serie \(nsLabel.substring(with: match.range(at: 1))) de \(nsLabel.substring(with: match.range(at: 2)))"
    } else if setLabel.lowercased().hasPrefix("set ") {
      setLabel = "Serie " + setLabel.dropFirst(4)
    } else if setLabel.lowercased().hasPrefix("serie ") {
      setLabel = "Serie " + setLabel.dropFirst(6)
    }

    // Prefer "40 kg x 5 reps" style when reps lack the word
    if !prescription.isEmpty,
       prescription.lowercased().contains("x"),
       !prescription.lowercased().contains("rep") {
      prescription = "\(prescription) reps"
    }

    return LiveSetSummaryParts(setLabel: setLabel, prescription: prescription)
  }
}

// MARK: - Button styles

struct LivePillButtonStyle: ButtonStyle {
  let fill: Color
  let foreground: Color

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.caption.weight(.bold))
      .foregroundStyle(foreground)
      .background(fill.opacity(configuration.isPressed ? 0.75 : 1))
      .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
  }
}
