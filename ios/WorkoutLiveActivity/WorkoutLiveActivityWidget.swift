import ActivityKit
import SwiftUI
import UIKit
import WidgetKit

private enum LiveTheme {
  /// EvoFit primary (#6C3BAA)
  static let brand = Color(red: 0.424, green: 0.231, blue: 0.667)
  static let textPrimary = Color(red: 0.11, green: 0.11, blue: 0.12)
  static let textSecondary = Color(red: 0.45, green: 0.45, blue: 0.48)
  static let textTertiary = Color(red: 0.62, green: 0.62, blue: 0.65)
  static let surface = Color.white
  static let surfaceMuted = Color(red: 0.96, green: 0.96, blue: 0.97)
  static let controlFill = Color(red: 0.91, green: 0.91, blue: 0.93)
  static let completeGreen = Color(red: 0.22, green: 0.78, blue: 0.35)
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
      // Remount when end changes — timerInterval does not always adopt a new range.
      .id(Int(end.timeIntervalSince1970 * 1000))
      .monospacedDigit()
      .font(font)
      .foregroundStyle(color)
      .frame(width: width)
    }
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
      .id(Int(end.timeIntervalSince1970 * 1000))
      .tint(LiveTheme.brand)
      .labelsHidden()
      .scaleEffect(x: 1, y: 0.55, anchor: .center)
    }
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
          Text(context.state.exerciseName)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundStyle(.primary)
            .lineLimit(2)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if context.state.isResting, let end = context.state.restEndAt {
            SafeRestCountdownText(
              end: end,
              restSecondsDefault: context.state.restSecondsDefault,
              font: .title3.bold(),
              color: LiveTheme.brand
            )
          } else {
            SafeWorkoutElapsedText(
              startedAt: context.attributes.workoutStartedAt,
              font: .caption.bold()
            )
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          if context.state.isResting {
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
        Image(systemName: "dumbbell.fill")
          .foregroundStyle(LiveTheme.brand)
      } compactTrailing: {
        if context.state.isResting, let end = context.state.restEndAt {
          SafeRestCountdownText(
            end: end,
            restSecondsDefault: context.state.restSecondsDefault,
            font: .body.monospacedDigit(),
            color: LiveTheme.brand,
            width: 48
          )
        } else {
          SafeWorkoutElapsedText(
            startedAt: context.attributes.workoutStartedAt,
            font: .body.monospacedDigit(),
            width: 48
          )
        }
      } minimal: {
        Image(systemName: "dumbbell.fill")
          .foregroundStyle(LiveTheme.brand)
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
    VStack(alignment: .leading, spacing: 0) {
      headerRow
        .padding(.horizontal, 14)
        .padding(.top, 12)
        .padding(.bottom, 10)

      exerciseRow
        .padding(.horizontal, 14)
        .padding(.bottom, context.state.isResting ? 10 : 12)

      if context.state.isResting {
        restSection
      } else {
        activeSetSection
      }
    }
    .background(LiveTheme.surface)
  }

  private var headerRow: some View {
    HStack(spacing: 6) {
      Image(systemName: "link")
        .font(.system(size: 11, weight: .semibold))
        .foregroundStyle(LiveTheme.textTertiary)
      Text("Entreno")
        .font(.caption.weight(.medium))
        .foregroundStyle(LiveTheme.textTertiary)
      Spacer(minLength: 8)
      SafeWorkoutElapsedText(
        startedAt: context.attributes.workoutStartedAt,
        font: .caption.monospacedDigit().weight(.medium),
        color: LiveTheme.textSecondary,
        multilineTrailing: true
      )
    }
  }

  private var exerciseRow: some View {
    HStack(alignment: .center, spacing: 12) {
      exerciseThumbnail

      VStack(alignment: .leading, spacing: 3) {
        Text(context.state.exerciseName)
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(LiveTheme.textPrimary)
          .lineLimit(2)

        Text(exerciseSubtitle)
          .font(.caption)
          .foregroundStyle(LiveTheme.textSecondary)
          .lineLimit(2)
      }
      Spacer(minLength: 0)
    }
  }

  private var exerciseSubtitle: String {
    if context.state.isResting {
      if context.state.nextSetSummary.isEmpty {
        return "Siguiente serie pendiente"
      }
      return context.state.nextSetSummary
    }
    return parsed.setLabel.isEmpty ? "Serie pendiente" : parsed.setLabel
  }

  @ViewBuilder
  private var exerciseThumbnail: some View {
    ZStack {
      Circle()
        .fill(LiveTheme.surfaceMuted)
      if let image = loadExerciseImage() {
        image
          .resizable()
          .scaledToFill()
          .clipShape(Circle())
      } else {
        Image(systemName: "figure.strengthtraining.traditional")
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(LiveTheme.brand)
      }
    }
    .frame(width: 44, height: 44)
  }

  private var activeSetSection: some View {
    HStack(alignment: .center, spacing: 12) {
      Text(parsed.prescription.isEmpty ? "—" : parsed.prescription)
        .font(.title3.weight(.bold))
        .foregroundStyle(LiveTheme.textPrimary)
        .lineLimit(1)
        .minimumScaleFactor(0.75)

      Spacer(minLength: 8)

      Button(intent: WorkoutLiveCompleteSetIntent()) {
        Image(systemName: "checkmark")
          .font(.system(size: 18, weight: .bold))
          .foregroundStyle(.white)
          .frame(width: 44, height: 44)
          .background(LiveTheme.completeGreen)
          .clipShape(Circle())
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
    .frame(maxWidth: .infinity)
    .background(LiveTheme.surfaceMuted)
  }

  private var restSection: some View {
    VStack(spacing: 10) {
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
      .padding(.horizontal, 14)

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
      .padding(.horizontal, 14)
      .padding(.bottom, 12)
    }
  }

  @ViewBuilder
  private var restTimerLabel: some View {
    if let end = context.state.restEndAt {
      // Time only (no "Rest:" prefix) — lock screen truncates "Rest: 2:50" to "R…2:50".
      SafeRestCountdownText(
        end: end,
        restSecondsDefault: context.state.restSecondsDefault,
        font: .title3.weight(.bold).monospacedDigit(),
        color: LiveTheme.textPrimary,
        width: 56
      )
      .minimumScaleFactor(0.8)
    } else {
      Text("0:00")
        .font(.title3.weight(.bold).monospacedDigit())
        .foregroundStyle(LiveTheme.textPrimary)
        .frame(width: 56)
    }
  }

  private func loadExerciseImage() -> Image? {
    guard let raw = context.state.imageFileName, !raw.isEmpty else { return nil }

    // Widget extensions should not fetch remote URLs synchronously.
    if raw.hasPrefix("http://") || raw.hasPrefix("https://") {
      return nil
    }

    if let container = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: WorkoutLiveStore.appGroupId
    ) {
      let fileURL = container.appendingPathComponent(raw)
      if let data = try? Data(contentsOf: fileURL),
         let uiImage = UIImage(data: data) {
        return Image(uiImage: uiImage)
      }
    }

    if let uiImage = UIImage(contentsOfFile: raw) {
      return Image(uiImage: uiImage)
    }

    return nil
  }
}

// MARK: - Parsing helpers

struct LiveSetSummaryParts {
  var setLabel: String
  var prescription: String

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
