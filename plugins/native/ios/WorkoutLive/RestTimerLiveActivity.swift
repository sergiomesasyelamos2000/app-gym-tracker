import Foundation
import ActivityKit
import React
import UIKit

@objc(RestTimerLiveActivity)
class RestTimerLiveActivity: NSObject {

  /// Boxed so the class can link against iOS 15.1; ActivityContent APIs need 16.2+.
  private var currentActivityBox: Any?

  @available(iOS 16.2, *)
  private var currentActivity: Activity<WorkoutLiveAttributes>? {
    get { currentActivityBox as? Activity<WorkoutLiveAttributes> }
    set { currentActivityBox = newValue }
  }

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
    guard #available(iOS 16.2, *) else {
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
      let imageFileName = await Self.resolveImageFileName(imageUrl)
      let state = makeState(
        exerciseName: exerciseName,
        nextSetSummary: nextSetSummary,
        isResting: isResting,
        restEndAtMs: restEndAtMs,
        imageFileName: imageFileName,
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
    guard #available(iOS 16.2, *) else {
      resolver(false)
      return
    }

    Task { @MainActor in
      let existing = currentActivity ?? Activity<WorkoutLiveAttributes>.activities.first
      // JS may pass null imageUrl to skip re-decode — keep prior App Group file.
      let imageFileName: String?
      if let imageUrl, !imageUrl.isEmpty {
        imageFileName = await Self.resolveImageFileName(imageUrl)
      } else {
        imageFileName = existing?.content.state.imageFileName
      }

      let state = makeState(
        exerciseName: exerciseName,
        nextSetSummary: nextSetSummary,
        isResting: isResting,
        restEndAtMs: restEndAtMs,
        imageFileName: imageFileName,
        restSecondsDefault: restSecondsDefault
      )
      let startedAt = Date(timeIntervalSince1970: workoutStartedAtMs.doubleValue / 1000)

      if let activity = existing {
        await activity.update(ActivityContent(state: state, staleDate: nil))
        currentActivity = activity
        persistState(state, startedAt: startedAt)
        resolver(true)
      } else {
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
      if #available(iOS 16.2, *) {
        await endAll()
      }
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
    guard #available(iOS 16.2, *) else {
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
    guard #available(iOS 16.2, *) else {
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

  @available(iOS 16.2, *)
  private func makeState(
    exerciseName: String?,
    nextSetSummary: String?,
    isResting: Bool,
    restEndAtMs: NSNumber?,
    imageFileName: String?,
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
      imageFileName: imageFileName,
      restSecondsDefault: restSecondsDefault?.intValue ?? 90
    )
  }

  /// Download remote static thumbs into the App Group so the widget can read them.
  /// Returns a relative path under the group container (e.g. `live-thumbs/thumb_….jpg`).
  private static func resolveImageFileName(_ imageUrl: String?) async -> String? {
    guard let imageUrl, !imageUrl.isEmpty else { return nil }

    if !imageUrl.hasPrefix("http://"), !imageUrl.hasPrefix("https://") {
      return imageUrl
    }

    guard let container = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: WorkoutLiveStore.appGroupId
    ) else {
      return nil
    }

    let dir = container.appendingPathComponent("live-thumbs", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

    let fileName = "live-thumbs/\(stableThumbName(for: imageUrl))"
    let dest = container.appendingPathComponent(fileName)

    if FileManager.default.fileExists(atPath: dest.path) {
      return fileName
    }

    guard let remote = URL(string: imageUrl) else { return nil }

    do {
      let config = URLSessionConfiguration.ephemeral
      config.timeoutIntervalForRequest = 4
      config.timeoutIntervalForResource = 6
      let session = URLSession(configuration: config)
      let (data, response) = try await session.data(from: remote)
      if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
        return nil
      }
      // Prefer JPEG for widget decode size; fall back to original bytes.
      if let uiImage = UIImage(data: data),
         let jpeg = uiImage.jpegData(compressionQuality: 0.82) {
        try jpeg.write(to: dest, options: .atomic)
      } else {
        try data.write(to: dest, options: .atomic)
      }
      return fileName
    } catch {
      return nil
    }
  }

  /// Stable FNV-1a filename (Swift `Hasher` / `hashValue` are not stable across launches).
  private static func stableThumbName(for urlString: String) -> String {
    var hash: UInt64 = 14695981039346656037
    for byte in urlString.utf8 {
      hash ^= UInt64(byte)
      hash = hash &* 1099511628211
    }
    return String(format: "thumb_%016llx.jpg", hash)
  }

  @available(iOS 16.2, *)
  @MainActor
  private func endAll() async {
    for activity in Activity<WorkoutLiveAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    currentActivity = nil
  }

  @available(iOS 16.2, *)
  private func persistState(_ state: WorkoutLiveAttributes.ContentState, startedAt: Date) {
    let payload: [String: Any] = [
      "exerciseName": state.exerciseName,
      "nextSetSummary": state.nextSetSummary,
      "isResting": state.isResting,
      "restEndAtMs": state.restEndAt.map { $0.timeIntervalSince1970 * 1000 } as Any,
      "workoutStartedAtMs": startedAt.timeIntervalSince1970 * 1000,
      "restSecondsDefault": state.restSecondsDefault,
      "imageFileName": state.imageFileName as Any,
    ]
    WorkoutLiveStore.defaults.set(payload, forKey: WorkoutLiveStore.stateKey)
  }
}
