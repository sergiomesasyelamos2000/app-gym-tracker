import ActivityKit
import SwiftUI
import WidgetKit

@main
struct WorkoutLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    WorkoutLiveActivityWidget()
  }
}

struct WorkoutLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutLiveAttributes.self) { context in
      WorkoutLiveLockScreenView(context: context)
        .activityBackgroundTint(Color.black.opacity(0.85))
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(context.state.exerciseName)
            .font(.caption)
            .fontWeight(.semibold)
            .lineLimit(2)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if context.state.isResting, let end = context.state.restEndAt {
            Text(timerInterval: Date.now...end, countsDown: true)
              .monospacedDigit()
              .font(.title3.bold())
              .foregroundStyle(Color(red: 0.56, green: 0.35, blue: 1))
          } else {
            Text(timerInterval: context.attributes.workoutStartedAt...Date.distantFuture, countsDown: false)
              .monospacedDigit()
              .font(.caption.bold())
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          if context.state.isResting {
            HStack {
              Button(intent: WorkoutLiveSubtractRestIntent()) { Text("-15s") }
              Button(intent: WorkoutLiveAddRestIntent()) { Text("+15s") }
              Button(intent: WorkoutLiveSkipRestIntent()) { Text("Skip") }
            }
            .font(.caption.bold())
          } else {
            Button(intent: WorkoutLiveCompleteSetIntent()) {
              Text("Completar serie")
                .font(.caption.bold())
                .frame(maxWidth: .infinity)
            }
          }
        }
      } compactLeading: {
        Image(systemName: "dumbbell.fill")
      } compactTrailing: {
        if context.state.isResting, let end = context.state.restEndAt {
          Text(timerInterval: Date.now...end, countsDown: true)
            .monospacedDigit()
            .frame(width: 48)
        } else {
          Text(timerInterval: context.attributes.workoutStartedAt...Date.distantFuture, countsDown: false)
            .monospacedDigit()
            .frame(width: 48)
        }
      } minimal: {
        Image(systemName: "dumbbell.fill")
      }
    }
  }
}

struct WorkoutLiveLockScreenView: View {
  let context: ActivityViewContext<WorkoutLiveAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        Text("EvoFit · Entreno")
          .font(.caption2.weight(.semibold))
          .foregroundStyle(.white.opacity(0.7))
        Spacer()
        Text(timerInterval: context.attributes.workoutStartedAt...Date.distantFuture, countsDown: false)
          .font(.caption2.monospacedDigit().weight(.semibold))
          .foregroundStyle(.white.opacity(0.7))
      }

      HStack(spacing: 12) {
        RoundedRectangle(cornerRadius: 8)
          .fill(Color.white.opacity(0.12))
          .frame(width: 48, height: 48)
          .overlay(
            Image(systemName: "figure.strengthtraining.traditional")
              .foregroundStyle(.white)
          )

        VStack(alignment: .leading, spacing: 4) {
          Text(context.state.exerciseName)
            .font(.headline)
            .foregroundStyle(.white)
            .lineLimit(2)
          Text(context.state.nextSetSummary.isEmpty ? "Siguiente serie pendiente" : context.state.nextSetSummary)
            .font(.caption)
            .foregroundStyle(.white.opacity(0.72))
            .lineLimit(2)
        }
        Spacer(minLength: 0)
      }

      if context.state.isResting, let end = context.state.restEndAt {
        HStack(alignment: .center, spacing: 8) {
          Text("Rest")
            .font(.subheadline.weight(.bold))
            .foregroundStyle(.white)
          Text(timerInterval: Date.now...end, countsDown: true)
            .font(.system(size: 28, weight: .bold, design: .rounded).monospacedDigit())
            .foregroundStyle(Color(red: 0.56, green: 0.35, blue: 1))
          Spacer()
        }

        HStack(spacing: 8) {
          Button(intent: WorkoutLiveSubtractRestIntent()) {
            Text("-15s").frame(maxWidth: .infinity)
          }
          .buttonStyle(LiveCapsuleButtonStyle(fill: Color.white.opacity(0.18)))

          Button(intent: WorkoutLiveAddRestIntent()) {
            Text("+15s").frame(maxWidth: .infinity)
          }
          .buttonStyle(LiveCapsuleButtonStyle(fill: Color(red: 0.56, green: 0.35, blue: 1)))

          Button(intent: WorkoutLiveSkipRestIntent()) {
            Text("Omitir").frame(maxWidth: .infinity)
          }
          .buttonStyle(LiveCapsuleButtonStyle(fill: Color.red.opacity(0.75)))
        }
      } else {
        Button(intent: WorkoutLiveCompleteSetIntent()) {
          Text("Completar serie")
            .font(.subheadline.weight(.bold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
        }
        .buttonStyle(LiveCapsuleButtonStyle(fill: Color(red: 0.56, green: 0.35, blue: 1)))
      }
    }
    .padding(14)
  }
}

struct LiveCapsuleButtonStyle: ButtonStyle {
  let fill: Color

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.caption.weight(.bold))
      .foregroundStyle(.white)
      .padding(.vertical, 10)
      .background(fill.opacity(configuration.isPressed ? 0.7 : 1))
      .clipShape(RoundedRectangle(cornerRadius: 10))
  }
}
