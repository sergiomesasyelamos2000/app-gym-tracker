import Foundation
import ActivityKit
import React

@objc(RestTimerLiveActivity)
class RestTimerLiveActivity: NSObject {

  private var currentActivity: Activity<WorkoutLiveAttributes>?

  @objc
  static func requiresMainQueueSetup() -> Bool { true }

  @objc
  func startWorkoutLive(
    _ workoutStartedAtMs: NSNumber,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?,
    isResting: Bool,
    restEndAtMs: NSNumber?,
    restSecondsDefault: NSNumber?,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.1, *) else {
      resolver(false)
      return
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      resolver(false)
      return
    }

    Task { @MainActor in
      await endAll()
      let startedAt = Date(timeIntervalSince1970: workoutStartedAtMs.doubleValue / 1000)
      let attributes = WorkoutLiveAttributes(workoutStartedAt: startedAt)
      let state = makeState(
        exerciseName: exerciseName,
        nextSetSummary: nextSetSummary,
        isResting: isResting,
        restEndAtMs: restEndAtMs,
        imageUrl: imageUrl,
        restSecondsDefault: restSecondsDefault
      )
      do {
        let activity = try Activity.request(
          attributes: attributes,
          content: ActivityContent(state: state, staleDate: nil),
          pushType: nil
        )
        self.currentActivity = activity
        self.persistState(state, startedAt: startedAt)
        resolver(true)
      } catch {
        rejecter("live_start", error.localizedDescription, error)
      }
    }
  }

  @objc
  func updateWorkoutLive(
    _ workoutStartedAtMs: NSNumber,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?,
    isResting: Bool,
    restEndAtMs: NSNumber?,
    restSecondsDefault: NSNumber?,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.1, *) else {
      resolver(false)
      return
    }

    Task { @MainActor in
      let state = makeState(
        exerciseName: exerciseName,
        nextSetSummary: nextSetSummary,
        isResting: isResting,
        restEndAtMs: restEndAtMs,
        imageUrl: imageUrl,
        restSecondsDefault: restSecondsDefault
      )
      let startedAt = Date(timeIntervalSince1970: workoutStartedAtMs.doubleValue / 1000)

      if let activity = currentActivity ?? Activity<WorkoutLiveAttributes>.activities.first {
        await activity.update(ActivityContent(state: state, staleDate: nil))
        currentActivity = activity
        persistState(state, startedAt: startedAt)
        resolver(true)
      } else {
        // No active activity — start one.
        startWorkoutLive(
          workoutStartedAtMs,
          exerciseName: exerciseName,
          imageUrl: imageUrl,
          nextSetSummary: nextSetSummary,
          isResting: isResting,
          restEndAtMs: restEndAtMs,
          restSecondsDefault: restSecondsDefault,
          resolver: resolver,
          rejecter: rejecter
        )
      }
    }
  }

  @objc
  func endWorkoutLive(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    Task { @MainActor in
      await endAll()
      resolver(true)
    }
  }

  // Legacy aliases ----------------------------------------------------------

  @objc
  func startRestTimer(
    _ endTimestampMs: NSNumber,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    startWorkoutLive(
      NSNumber(value: Date().timeIntervalSince1970 * 1000),
      exerciseName: exerciseName,
      imageUrl: imageUrl,
      nextSetSummary: nextSetSummary,
      isResting: true,
      restEndAtMs: endTimestampMs,
      restSecondsDefault: nil,
      resolver: resolver,
      rejecter: rejecter
    )
  }

  @objc
  func updateRestTimer(
    _ endTimestampMs: NSNumber,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    updateWorkoutLive(
      NSNumber(value: Date().timeIntervalSince1970 * 1000),
      exerciseName: exerciseName,
      imageUrl: imageUrl,
      nextSetSummary: nextSetSummary,
      isResting: true,
      restEndAtMs: endTimestampMs,
      restSecondsDefault: nil,
      resolver: resolver,
      rejecter: rejecter
    )
  }

  @objc
  func endRestTimer(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    endWorkoutLive(resolver, rejecter: rejecter)
  }

  @objc
  func clearRestLive(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.1, *) else {
      resolver(false)
      return
    }
    Task { @MainActor in
      guard let activity = currentActivity ?? Activity<WorkoutLiveAttributes>.activities.first else {
        resolver(false)
        return
      }
      var state = activity.content.state
      state.isResting = false
      state.restEndAt = nil
      await activity.update(ActivityContent(state: state, staleDate: nil))
      resolver(true)
    }
  }

  @objc
  func getCurrentWorkoutLiveState(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.1, *) else {
      resolver(NSNull())
      return
    }
    if let activity = currentActivity ?? Activity<WorkoutLiveAttributes>.activities.first {
      let state = activity.content.state
      resolver([
        "isActive": true,
        "endTimestampMs": state.restEndAt.map { $0.timeIntervalSince1970 * 1000 } as Any,
        "exerciseName": state.exerciseName,
        "nextSetSummary": state.nextSetSummary,
        "isResting": state.isResting,
        "workoutStartedAtMs": activity.attributes.workoutStartedAt.timeIntervalSince1970 * 1000,
      ])
      return
    }
    resolver([
      "isActive": false,
    ])
  }

  @objc
  func getCurrentRestTimerState(
    _ resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    getCurrentWorkoutLiveState(resolver, rejecter: rejecter)
  }

  private func makeState(
    exerciseName: String?,
    nextSetSummary: String?,
    isResting: Bool,
    restEndAtMs: NSNumber?,
    imageUrl: String?,
    restSecondsDefault: NSNumber?
  ) -> WorkoutLiveAttributes.ContentState {
    let restEnd: Date? = {
      guard isResting, let ms = restEndAtMs?.doubleValue, ms > 0 else { return nil }
      return Date(timeIntervalSince1970: ms / 1000)
    }()
    return WorkoutLiveAttributes.ContentState(
      exerciseName: exerciseName?.isEmpty == false ? exerciseName! : "Entrenamiento",
      nextSetSummary: nextSetSummary ?? "",
      isResting: isResting,
      restEndAt: restEnd,
      imageFileName: imageUrl,
      restSecondsDefault: restSecondsDefault?.intValue ?? 90
    )
  }

  @MainActor
  private func endAll() async {
    for activity in Activity<WorkoutLiveAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    currentActivity = nil
  }

  private func persistState(_ state: WorkoutLiveAttributes.ContentState, startedAt: Date) {
    let payload: [String: Any] = [
      "exerciseName": state.exerciseName,
      "nextSetSummary": state.nextSetSummary,
      "isResting": state.isResting,
      "restEndAtMs": state.restEndAt.map { $0.timeIntervalSince1970 * 1000 } as Any,
      "workoutStartedAtMs": startedAt.timeIntervalSince1970 * 1000,
      "restSecondsDefault": state.restSecondsDefault,
    ]
    WorkoutLiveStore.defaults.set(payload, forKey: WorkoutLiveStore.stateKey)
  }
}
