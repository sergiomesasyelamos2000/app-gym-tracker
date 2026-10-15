import AppIntents
import ActivityKit
import Foundation

/// Interactive Live Activity controls require `LiveActivityIntent` (not plain `AppIntent`)
/// so Lock Screen / Dynamic Island buttons actually run.
@available(iOS 17.0, *)
struct WorkoutLiveAddRestIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Add 15s rest"

  func perform() async throws -> some IntentResult {
    await WorkoutLiveIntentHandler.applyRestDelta(15)
    return .result()
  }
}

@available(iOS 17.0, *)
struct WorkoutLiveSubtractRestIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Subtract 15s rest"

  func perform() async throws -> some IntentResult {
    await WorkoutLiveIntentHandler.applyRestDelta(-15)
    return .result()
  }
}

@available(iOS 17.0, *)
struct WorkoutLiveSkipRestIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Skip rest"

  func perform() async throws -> some IntentResult {
    await WorkoutLiveIntentHandler.skipRest()
    return .result()
  }
}

@available(iOS 17.0, *)
struct WorkoutLiveCompleteSetIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Complete set"

  func perform() async throws -> some IntentResult {
    await WorkoutLiveIntentHandler.completeSet()
    return .result()
  }
}

@available(iOS 17.0, *)
enum WorkoutLiveIntentHandler {
  @MainActor
  static func applyRestDelta(_ delta: Int) async {
    guard let activity = Activity<WorkoutLiveAttributes>.activities.first else { return }
    var state = activity.content.state
    guard state.isResting, let end = state.restEndAt else { return }
    let remaining = max(0, end.timeIntervalSinceNow + Double(delta))
    // Clear rest flags before update so the widget never mounts an expired timerInterval.
    if remaining <= 0 {
      state.isResting = false
      state.restEndAt = nil
      WorkoutLiveStore.enqueueIntent("skip")
    } else {
      let newEnd = Date().addingTimeInterval(remaining)
      state.restEndAt = newEnd
      // Keep progress duration ≥ remaining so widget timer ranges stay valid after ±15.
      let nextDefault = max(state.restSecondsDefault + delta, Int(ceil(remaining)), 1)
      state.restSecondsDefault = nextDefault
      WorkoutLiveStore.enqueueIntent(
        delta > 0 ? "add" : "subtract",
        delta: delta,
        endAt: newEnd.timeIntervalSince1970 * 1000
      )
    }
    await activity.update(ActivityContent(state: state, staleDate: nil))
  }

  @MainActor
  static func skipRest() async {
    guard let activity = Activity<WorkoutLiveAttributes>.activities.first else { return }
    var state = activity.content.state
    state.isResting = false
    state.restEndAt = nil
    WorkoutLiveStore.enqueueIntent("skip")
    await activity.update(ActivityContent(state: state, staleDate: nil))
  }

  @MainActor
  static func completeSet() async {
    guard let activity = Activity<WorkoutLiveAttributes>.activities.first else { return }
    var state = activity.content.state
    let restSeconds = max(1, state.restSecondsDefault)
    state.isResting = true
    state.restEndAt = Date().addingTimeInterval(Double(restSeconds))
    WorkoutLiveStore.enqueueIntent("completeSet")
    await activity.update(ActivityContent(state: state, staleDate: nil))
  }
}
