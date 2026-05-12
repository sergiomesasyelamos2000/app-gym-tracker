import AppIntents
import ActivityKit
import Foundation
import RestTimerShared

// MARK: - Helpers compartidos

@available(iOS 17.2, *)
private enum RestTimerIntentAction {
  struct UpdateResult {
    let endTimestampMs: Double
  }

  // Escribe en UserDefaults. La app lo leerá al activarse via didBecomeActive.
  // Ya NO usamos CFNotificationCenter porque la app no está escuchando
  // mientras está suspendida, y la notificación Darwin se pierde.
  static func publishIntent(_ action: String, delta: Int, endTimestampMs: Double) {
    let defaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
    let nextSequence = (defaults?.integer(forKey: RestTimerLiveActivityShared.pendingIntentSequenceKey) ?? 0) + 1
    defaults?.set(action,          forKey: RestTimerLiveActivityShared.pendingIntentActionKey)
    defaults?.set(delta,           forKey: RestTimerLiveActivityShared.pendingIntentDeltaKey)
    defaults?.set(endTimestampMs,  forKey: RestTimerLiveActivityShared.pendingIntentEndTimestampMsKey)
    defaults?.set(nextSequence,    forKey: RestTimerLiveActivityShared.pendingIntentSequenceKey)
    defaults?.synchronize()
    print("[Intent] publishIntent action=\(action) seq=\(nextSequence) endTs=\(endTimestampMs)")
  }

  static func resolveActivity() -> Activity<RestTimerAttributes>? {
    let defaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
    if let id = defaults?.string(forKey: RestTimerLiveActivityShared.currentActivityIdKey) {
      return Activity<RestTimerAttributes>.activities.first(where: { $0.id == id })
    }
    return Activity<RestTimerAttributes>.activities.first
  }

  static func updateActivity(delta: TimeInterval, shouldEnd: Bool = false) async -> UpdateResult {
    let defaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
    let exerciseName       = defaults?.string(forKey: RestTimerLiveActivityShared.currentExerciseNameKey)
    let exerciseImageFile  = defaults?.string(forKey: RestTimerLiveActivityShared.currentExerciseImageKey)
    let nextSetSummary     = defaults?.string(forKey: RestTimerLiveActivityShared.currentNextSetSummaryKey)
    let storedTs           = defaults?.object(forKey: RestTimerLiveActivityShared.currentEndDateKey) as? Double
    let resolvedActivity   = resolveActivity()
    let baseEndDate        = storedTs.map(Date.init(timeIntervalSince1970:))
      ?? resolvedActivity?.content.state.endDate
      ?? Date()

    if shouldEnd {
      let now = Date()
      if let activity = resolvedActivity {
        let finalState = RestTimerAttributes.ContentState(
          endDate: now,
          exerciseName: exerciseName,
          exerciseImageFileName: exerciseImageFile,
          nextSetSummary: nextSetSummary
        )
        await activity.end(ActivityContent(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
      } else {
        print("[Intent] updateActivity(skip): no active activity found")
      }

      defaults?.set(now.timeIntervalSince1970, forKey: RestTimerLiveActivityShared.currentEndDateKey)
      defaults?.synchronize()
      let endTimestampMs = now.timeIntervalSince1970 * 1000

      return UpdateResult(
        endTimestampMs: endTimestampMs
      )
    }

    let nextEndDate = max(Date(), baseEndDate.addingTimeInterval(delta))
    let nextState = RestTimerAttributes.ContentState(
      endDate: nextEndDate,
      exerciseName: exerciseName,
      exerciseImageFileName: exerciseImageFile,
      nextSetSummary: nextSetSummary
    )
    defaults?.set(nextEndDate.timeIntervalSince1970, forKey: RestTimerLiveActivityShared.currentEndDateKey)
    defaults?.synchronize()

    if let activity = resolvedActivity {
      await activity.update(ActivityContent(state: nextState, staleDate: nextEndDate))
      print("[Intent] updateActivity done, newEndDate=\(nextEndDate)")
    } else {
      print("[Intent] updateActivity: no active activity found, persisted endDate only")
    }

    return UpdateResult(
      endTimestampMs: nextEndDate.timeIntervalSince1970 * 1000
    )
  }

  static func clearPersistedActivityState() {
    let defaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentActivityIdKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentStartDateKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentEndDateKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentExerciseNameKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentExerciseImageKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentNextSetSummaryKey)
    defaults?.synchronize()
  }
}

// MARK: - Intents

@available(iOS 17.2, *)
struct AddRestTimeIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Añadir +15s"
  static var openAppWhenRun: Bool = true
  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

  func perform() async throws -> some IntentResult {
    print("[Intent] AddRestTimeIntent perform()")
    let result = await RestTimerIntentAction.updateActivity(delta: 15)
    RestTimerIntentAction.publishIntent("add", delta: 15, endTimestampMs: result.endTimestampMs)
    return .result()
  }
}

@available(iOS 17.2, *)
struct SubtractRestTimeIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Restar -15s"
  static var openAppWhenRun: Bool = true
  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

  func perform() async throws -> some IntentResult {
    print("[Intent] SubtractRestTimeIntent perform()")
    let result = await RestTimerIntentAction.updateActivity(delta: -15)
    RestTimerIntentAction.publishIntent("subtract", delta: -15, endTimestampMs: result.endTimestampMs)
    return .result()
  }
}

@available(iOS 17.2, *)
struct SkipRestTimeIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Omitir"
  static var openAppWhenRun: Bool = true
  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

  func perform() async throws -> some IntentResult {
    print("[Intent] SkipRestTimeIntent perform()")
    let result = await RestTimerIntentAction.updateActivity(delta: 0, shouldEnd: true)
    RestTimerIntentAction.publishIntent("skip", delta: 0, endTimestampMs: result.endTimestampMs)
    RestTimerIntentAction.clearPersistedActivityState()
    return .result()
  }
}
