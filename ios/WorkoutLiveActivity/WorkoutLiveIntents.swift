import AppIntents
import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct WorkoutLiveAddRestIntent: AppIntent {
  static var title: LocalizedStringResource = "Add 15s rest"

  func perform() async throws -> some IntentResult {
    await WorkoutLiveIntentHandler.applyRestDelta(15)
    return .result()
  }
}

@available(iOS 16.1, *)
struct WorkoutLiveSubtractRestIntent: AppIntent {
  static var title: LocalizedStringResource = "Subtract 15s rest"

  func perform() async throws -> some IntentResult {
    await WorkoutLiveIntentHandler.applyRestDelta(-15)
    return .result()
  }
}

@available(iOS 16.1, *)
struct WorkoutLiveSkipRestIntent: AppIntent {
  static var title: LocalizedStringResource = "Skip rest"

  func perform() async throws -> some IntentResult {
    await WorkoutLiveIntentHandler.skipRest()
    return .result()
  }
}

@available(iOS 16.1, *)
struct WorkoutLiveCompleteSetIntent: AppIntent {
  static var title: LocalizedStringResource = "Complete set"

  func perform() async throws -> some IntentResult {
    await WorkoutLiveIntentHandler.completeSet()
    return .result()
  }
}

@available(iOS 16.1, *)
enum WorkoutLiveIntentHandler {
  @MainActor
  static func applyRestDelta(_ delta: Int) async {
    guard let activity = Activity<WorkoutLiveAttributes>.activities.first else { return }
    var state = activity.content.state
    guard state.isResting, let end = state.restEndAt else { return }
    let remaining = max(0, end.timeIntervalSinceNow + Double(delta))
    if remaining <= 0 {
      state.isResting = false
      state.restEndAt = nil
      WorkoutLiveStore.enqueueIntent("skip")
    } else {
      let newEnd = Date().addingTimeInterval(remaining)
      state.restEndAt = newEnd
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
