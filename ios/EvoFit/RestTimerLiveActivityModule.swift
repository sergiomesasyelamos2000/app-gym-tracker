import Foundation
import ActivityKit
import React
import RestTimerShared

@objc(RestTimerLiveActivity)
final class RestTimerLiveActivity: NSObject {
  private let sharedDefaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
  private var currentActivityId: String?
  private var currentStartDate: Date?
  private var currentExerciseName: String?
  private var currentExerciseImageFileName: String?
  private var currentNextSetSummary: String?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @available(iOS 16.2, *)
  private func resolveActivity() -> Activity<RestTimerAttributes>? {
    restorePersistedStateIfNeeded()

    if let currentActivityId {
      return Activity<RestTimerAttributes>.activities.first(where: { $0.id == currentActivityId })
    }

    return Activity<RestTimerAttributes>.activities.first
  }

  @available(iOS 16.2, *)
  private func buildContent(
    endDate: Date,
    exerciseName: String?,
    exerciseImageFileName: String?,
    nextSetSummary: String?
  ) -> ActivityContent<RestTimerAttributes.ContentState> {
    let state = RestTimerAttributes.ContentState(
      endDate: endDate,
      exerciseName: exerciseName,
      exerciseImageFileName: exerciseImageFileName,
      nextSetSummary: nextSetSummary
    )

    return ActivityContent(state: state, staleDate: endDate)
  }

  private func persistState() {
    sharedDefaults?.set(currentActivityId, forKey: RestTimerLiveActivityShared.currentActivityIdKey)
    sharedDefaults?.set(currentStartDate?.timeIntervalSince1970, forKey: RestTimerLiveActivityShared.currentStartDateKey)
    sharedDefaults?.set(currentExerciseName, forKey: RestTimerLiveActivityShared.currentExerciseNameKey)
    sharedDefaults?.set(currentExerciseImageFileName, forKey: RestTimerLiveActivityShared.currentExerciseImageKey)
    sharedDefaults?.set(currentNextSetSummary, forKey: RestTimerLiveActivityShared.currentNextSetSummaryKey)
  }

  private func clearPersistedState() {
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentActivityIdKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentStartDateKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentExerciseNameKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentExerciseImageKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentNextSetSummaryKey)
  }

  private func restorePersistedStateIfNeeded() {
    if currentActivityId == nil {
      currentActivityId = sharedDefaults?.string(forKey: RestTimerLiveActivityShared.currentActivityIdKey)
    }

    if currentStartDate == nil,
       let timestamp = sharedDefaults?.object(forKey: RestTimerLiveActivityShared.currentStartDateKey) as? Double {
      currentStartDate = Date(timeIntervalSince1970: timestamp)
    }

    if currentExerciseName == nil {
      currentExerciseName = sharedDefaults?.string(forKey: RestTimerLiveActivityShared.currentExerciseNameKey)
    }

    if currentExerciseImageFileName == nil {
      currentExerciseImageFileName = sharedDefaults?.string(forKey: RestTimerLiveActivityShared.currentExerciseImageKey)
    }

    if currentNextSetSummary == nil {
      currentNextSetSummary = sharedDefaults?.string(forKey: RestTimerLiveActivityShared.currentNextSetSummaryKey)
    }
  }

  private func sharedContainerURL() -> URL? {
    FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: RestTimerLiveActivityShared.appGroupIdentifier
    )
  }

  private func storeSharedImage(from imageUrl: String?) async -> String? {
    guard let imageUrl else {
      return currentExerciseImageFileName
    }

    let trimmedImageUrl = imageUrl.trimmingCharacters(in: .whitespacesAndNewlines)

    guard trimmedImageUrl.isEmpty == false else {
      return currentExerciseImageFileName
    }

    guard let containerURL = sharedContainerURL() else { return nil }

    let fileName = "rest-timer-exercise-image.jpg"
    let destinationURL = containerURL.appendingPathComponent(fileName)

    do {
      let imageData: Data

      if trimmedImageUrl.hasPrefix("data:image"), let commaIndex = trimmedImageUrl.firstIndex(of: ",") {
        let base64 = String(trimmedImageUrl[trimmedImageUrl.index(after: commaIndex)...])
        guard let decoded = Data(base64Encoded: base64) else { return nil }
        imageData = decoded
      } else if trimmedImageUrl.hasPrefix("http://") || trimmedImageUrl.hasPrefix("https://") {
        guard let remoteURL = URL(string: trimmedImageUrl) else { return nil }
        let (downloadedData, _) = try await URLSession.shared.data(from: remoteURL)
        imageData = downloadedData
      } else if trimmedImageUrl.hasPrefix("file://"), let fileURL = URL(string: trimmedImageUrl) {
        imageData = try Data(contentsOf: fileURL)
      } else if let decoded = Data(base64Encoded: trimmedImageUrl) {
        imageData = decoded
      } else {
        return currentExerciseImageFileName
      }

      try imageData.write(to: destinationURL, options: .atomic)
      return fileName
    } catch {
      print("[LiveActivity] failed to store shared image: \(error)")
      return currentExerciseImageFileName
    }
  }

  @objc
  func startRestTimer(
    _ endTimestampMs: NSNumber,
    exerciseName: NSString?,
    imageUrl: NSString?,
    nextSetSummary: NSString?
  ) {
    guard #available(iOS 16.2, *) else { return }

    Task {
      if ActivityAuthorizationInfo().areActivitiesEnabled == false {
        print("[LiveActivity] activities disabled in system settings")
        return
      }

      if let existingActivity = resolveActivity() {
        let finalContent = buildContent(
          endDate: Date(),
          exerciseName: currentExerciseName,
          exerciseImageFileName: currentExerciseImageFileName,
          nextSetSummary: currentNextSetSummary
        )
        await existingActivity.end(finalContent, dismissalPolicy: .immediate)
      }

      let now = Date()
      let endDate = Date(timeIntervalSince1970: endTimestampMs.doubleValue / 1000)
      let safeEndDate = max(endDate, now.addingTimeInterval(1))
      let exercise = exerciseName as String?
      let exerciseImageFileName = await storeSharedImage(from: imageUrl as String?)
      let nextSetSummaryValue = nextSetSummary as String?
      let attributes = RestTimerAttributes(startDate: now)

      do {
        let content = buildContent(
          endDate: safeEndDate,
          exerciseName: exercise,
          exerciseImageFileName: exerciseImageFileName,
          nextSetSummary: nextSetSummaryValue
        )
        let activity = try Activity.request(attributes: attributes, content: content, pushType: nil)
        currentActivityId = activity.id
        currentStartDate = now
        currentExerciseName = exercise
        currentExerciseImageFileName = exerciseImageFileName
        currentNextSetSummary = nextSetSummaryValue
        persistState()
      } catch {
        print("[LiveActivity] failed to start activity: \(error)")
      }
    }
  }


  @objc
  func updateRestTimer(
    _ endTimestampMs: NSNumber,
    exerciseName: NSString?,
    imageUrl: NSString?,
    nextSetSummary: NSString?
  ) {
    guard #available(iOS 16.2, *) else { return }

    Task {
      guard let activity = resolveActivity() else {
        print("[LiveActivity] update ignored because there is no active activity")
        return
      }

      let now = Date()
      let endDate = Date(timeIntervalSince1970: endTimestampMs.doubleValue / 1000)
      let safeEndDate = max(endDate, now)

      if currentStartDate == nil {
        currentStartDate = activity.attributes.startDate
      }

      if let exerciseName {
        currentExerciseName = exerciseName as String
      }

      if imageUrl != nil {
        currentExerciseImageFileName = await storeSharedImage(from: imageUrl as String?)
      }

      if let nextSetSummary {
        currentNextSetSummary = nextSetSummary as String
      }

      let content = buildContent(
        endDate: safeEndDate,
        exerciseName: currentExerciseName,
        exerciseImageFileName: currentExerciseImageFileName,
        nextSetSummary: currentNextSetSummary
      )
      await activity.update(content)
      currentActivityId = activity.id
      persistState()
    }
  }

  @objc
  func endRestTimer() {
    guard #available(iOS 16.2, *) else { return }

    Task {
      guard let activity = resolveActivity() else { return }

      let content = buildContent(
        endDate: Date(),
        exerciseName: currentExerciseName,
        exerciseImageFileName: currentExerciseImageFileName,
        nextSetSummary: currentNextSetSummary
      )
      await activity.end(content, dismissalPolicy: .immediate)

      currentActivityId = nil
      currentStartDate = nil
      currentExerciseName = nil
      currentExerciseImageFileName = nil
      currentNextSetSummary = nil
      clearPersistedState()
    }
  }
}

@objc(RestTimerLiveActivityModule)
class RestTimerLiveActivityModule: RCTEventEmitter {
  private let sharedDefaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
  private var hasListeners = false
  private var lastHandledIntentSequence = 0
    
  override init() {
    super.init()
    registerIntentObserver()
    lastHandledIntentSequence = sharedDefaults?.integer(
      forKey: RestTimerLiveActivityShared.pendingIntentSequenceKey
    ) ?? 0
  }

  override func supportedEvents() -> [String]! {
    return ["onRestTimerIntent"]
  }
    
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func startObserving() {
    hasListeners = true
    emitPendingIntentIfNeeded()
  }

  override func stopObserving() {
    hasListeners = false
  }

  deinit {
    CFNotificationCenterRemoveObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      Unmanaged.passUnretained(self).toOpaque(),
      nil,
      nil
    )
  }

  @objc
  func supportedEventsList(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve(supportedEvents())
  }

  private func registerIntentObserver() {
    CFNotificationCenterAddObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      Unmanaged.passUnretained(self).toOpaque(),
      { _, observer, _, _, _ in
        guard let observer else { return }
        let module = Unmanaged<RestTimerLiveActivityModule>
          .fromOpaque(observer)
          .takeUnretainedValue()
        module.emitPendingIntentIfNeeded()
      },
      RestTimerLiveActivityShared.pendingIntentNotificationName as CFString,
      nil,
      .deliverImmediately
    )
  }

  private func emitPendingIntentIfNeeded() {
    guard hasListeners else { return }
    let sequence = sharedDefaults?.integer(
      forKey: RestTimerLiveActivityShared.pendingIntentSequenceKey
    ) ?? 0

    guard sequence > lastHandledIntentSequence else {
      return
    }

    guard let action = sharedDefaults?.string(
      forKey: RestTimerLiveActivityShared.pendingIntentActionKey
    ) else {
      lastHandledIntentSequence = sequence
      return
    }

    let delta = sharedDefaults?.integer(
      forKey: RestTimerLiveActivityShared.pendingIntentDeltaKey
    ) ?? 0

    lastHandledIntentSequence = sequence
    sendEvent(
      withName: "onRestTimerIntent",
      body: ["action": action, "delta": delta]
    )
  }
}
