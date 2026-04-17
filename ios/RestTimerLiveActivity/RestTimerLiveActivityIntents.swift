import AppIntents
import ActivityKit
import Foundation
import RestTimerShared

@available(iOS 17.0, *)
private enum RestTimerIntentAction {
  static func publishIntent(_ action: String, delta: Int) {
    let defaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
    let nextSequence = (defaults?.integer(forKey: RestTimerLiveActivityShared.pendingIntentSequenceKey) ?? 0) + 1

    defaults?.set(action, forKey: RestTimerLiveActivityShared.pendingIntentActionKey)
    defaults?.set(delta, forKey: RestTimerLiveActivityShared.pendingIntentDeltaKey)
    defaults?.set(nextSequence, forKey: RestTimerLiveActivityShared.pendingIntentSequenceKey)

    CFNotificationCenterPostNotification(
      CFNotificationCenterGetDarwinNotifyCenter(),
      CFNotificationName(RestTimerLiveActivityShared.pendingIntentNotificationName as CFString),
      nil,
      nil,
      true
    )
  }

  static func resolveActivity() -> Activity<RestTimerAttributes>? {
    let defaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
    let currentId = defaults?.string(forKey: RestTimerLiveActivityShared.currentActivityIdKey)

    if let currentId {
      return Activity<RestTimerAttributes>.activities.first(where: { $0.id == currentId })
    }

    return Activity<RestTimerAttributes>.activities.first
  }

  static func update(delta: TimeInterval, shouldEnd: Bool = false) async {
    guard let activity = resolveActivity() else { return }

    let defaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
    let exerciseName = defaults?.string(forKey: RestTimerLiveActivityShared.currentExerciseNameKey)
    let exerciseImageFileName = defaults?.string(forKey: RestTimerLiveActivityShared.currentExerciseImageKey)
    let nextSetSummary = defaults?.string(forKey: RestTimerLiveActivityShared.currentNextSetSummaryKey)

    if shouldEnd {
      let finalState = RestTimerAttributes.ContentState(
        endDate: Date(),
        exerciseName: exerciseName,
        exerciseImageFileName: exerciseImageFileName,
        nextSetSummary: nextSetSummary
      )
      await activity.end(ActivityContent(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
      defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentActivityIdKey)
      defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentStartDateKey)
      defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentExerciseNameKey)
      defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentExerciseImageKey)
      defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentNextSetSummaryKey)
      return
    }

    let nextEndDate = max(Date(), activity.content.state.endDate.addingTimeInterval(delta))
    let nextState = RestTimerAttributes.ContentState(
      endDate: nextEndDate,
      exerciseName: exerciseName,
      exerciseImageFileName: exerciseImageFileName,
      nextSetSummary: nextSetSummary
    )
    await activity.update(ActivityContent(state: nextState, staleDate: nextEndDate))
  }
}

@available(iOS 17.0, *)
struct AddRestTimeIntent: LiveActivityIntent {
  static var openAppWhenRun = false
  static var title: LocalizedStringResource = "Añadir tiempo"

  func perform() async throws -> some IntentResult {
    await RestTimerIntentAction.update(delta: 15)
    RestTimerIntentAction.publishIntent("add", delta: 15)
    return .result()
  }
}

@available(iOS 17.0, *)
struct SubtractRestTimeIntent: LiveActivityIntent {
  static var openAppWhenRun = false
  static var title: LocalizedStringResource = "Restar tiempo"

  func perform() async throws -> some IntentResult {
    await RestTimerIntentAction.update(delta: -15)
    RestTimerIntentAction.publishIntent("subtract", delta: -15)
    return .result()
  }
}

@available(iOS 17.0, *)
struct SkipRestTimeIntent: LiveActivityIntent {
  static var openAppWhenRun = false
  static var title: LocalizedStringResource = "Omitir"

  func perform() async throws -> some IntentResult {
    await RestTimerIntentAction.update(delta: 0, shouldEnd: true)
    RestTimerIntentAction.publishIntent("skip", delta: 0)
    return .result()
  }
}
