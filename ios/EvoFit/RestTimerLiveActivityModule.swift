import Foundation
import ActivityKit
import React
import RestTimerShared
import UIKit

// MARK: - RestTimerLiveActivity (módulo nativo para start/update/end)

@objc(RestTimerLiveActivity)
final class RestTimerLiveActivity: NSObject {
  private let sharedDefaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
  private var currentActivityId: String?
  private var currentStartDate: Date?
  private var currentEndDate: Date?
  private var currentExerciseName: String?
  private var currentExerciseImageFileName: String?
  private var currentNextSetSummary: String?

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

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
    sharedDefaults?.set(currentEndDate?.timeIntervalSince1970, forKey: RestTimerLiveActivityShared.currentEndDateKey)
    sharedDefaults?.set(currentExerciseName, forKey: RestTimerLiveActivityShared.currentExerciseNameKey)
    sharedDefaults?.set(currentExerciseImageFileName, forKey: RestTimerLiveActivityShared.currentExerciseImageKey)
    sharedDefaults?.set(currentNextSetSummary, forKey: RestTimerLiveActivityShared.currentNextSetSummaryKey)
    sharedDefaults?.synchronize()
  }

  private func clearPersistedState() {
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentActivityIdKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentStartDateKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentEndDateKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentExerciseNameKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentExerciseImageKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.currentNextSetSummaryKey)
    sharedDefaults?.synchronize()
  }

  private func restorePersistedStateIfNeeded() {
    if currentActivityId == nil {
      currentActivityId = sharedDefaults?.string(forKey: RestTimerLiveActivityShared.currentActivityIdKey)
    }
    if currentStartDate == nil,
       let ts = sharedDefaults?.object(forKey: RestTimerLiveActivityShared.currentStartDateKey) as? Double {
      currentStartDate = Date(timeIntervalSince1970: ts)
    }
    if currentEndDate == nil,
       let ts = sharedDefaults?.object(forKey: RestTimerLiveActivityShared.currentEndDateKey) as? Double {
      currentEndDate = Date(timeIntervalSince1970: ts)
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
    guard let imageUrl else { return currentExerciseImageFileName }
    let trimmed = imageUrl.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return currentExerciseImageFileName }
    guard let containerURL = sharedContainerURL() else { return nil }

    let fileName = "rest-timer-exercise-image.jpg"
    let destinationURL = containerURL.appendingPathComponent(fileName)

    do {
      let imageData: Data
      if trimmed.hasPrefix("data:image"), let commaIndex = trimmed.firstIndex(of: ",") {
        let base64 = String(trimmed[trimmed.index(after: commaIndex)...])
        guard let decoded = Data(base64Encoded: base64) else { return nil }
        imageData = decoded
      } else if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
        guard let remoteURL = URL(string: trimmed) else { return nil }
        let (data, _) = try await URLSession.shared.data(from: remoteURL)
        imageData = data
      } else if trimmed.hasPrefix("file://"), let fileURL = URL(string: trimmed) {
        imageData = try Data(contentsOf: fileURL)
      } else if let decoded = Data(base64Encoded: trimmed) {
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
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        print("[LiveActivity] activities disabled")
        return
      }
      if let existing = resolveActivity() {
        let content = buildContent(endDate: Date(), exerciseName: currentExerciseName,
                                   exerciseImageFileName: currentExerciseImageFileName,
                                   nextSetSummary: currentNextSetSummary)
        await existing.end(content, dismissalPolicy: .immediate)
      }

      let now = Date()
      let endDate = max(Date(timeIntervalSince1970: endTimestampMs.doubleValue / 1000),
                        now.addingTimeInterval(1))
      let exercise = exerciseName as String?
      let imageFileName = await storeSharedImage(from: imageUrl as String?)
      let nextSet = nextSetSummary as String?
      let attributes = RestTimerAttributes(startDate: now)

      do {
        let content = buildContent(endDate: endDate, exerciseName: exercise,
                                   exerciseImageFileName: imageFileName, nextSetSummary: nextSet)
        let activity = try Activity.request(attributes: attributes, content: content, pushType: nil)
        currentActivityId = activity.id
        currentStartDate = now
        currentEndDate = endDate
        currentExerciseName = exercise
        currentExerciseImageFileName = imageFileName
        currentNextSetSummary = nextSet
        persistState()
      } catch {
        print("[LiveActivity] failed to start: \(error)")
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
        print("[LiveActivity] update ignored: no active activity")
        return
      }
      let now = Date()
      let endDate = max(Date(timeIntervalSince1970: endTimestampMs.doubleValue / 1000), now)

      if currentStartDate == nil { currentStartDate = activity.attributes.startDate }
      if let exerciseName { currentExerciseName = exerciseName as String }
      if imageUrl != nil { currentExerciseImageFileName = await storeSharedImage(from: imageUrl as String?) }
      if let nextSetSummary { currentNextSetSummary = nextSetSummary as String }

      let content = buildContent(endDate: endDate, exerciseName: currentExerciseName,
                                 exerciseImageFileName: currentExerciseImageFileName,
                                 nextSetSummary: currentNextSetSummary)
      await activity.update(content)
      currentActivityId = activity.id
      currentEndDate = endDate
      persistState()
    }
  }

  @objc
  func endRestTimer() {
    guard #available(iOS 16.2, *) else { return }
    Task {
      guard let activity = resolveActivity() else { return }
      let content = buildContent(endDate: Date(), exerciseName: currentExerciseName,
                                 exerciseImageFileName: currentExerciseImageFileName,
                                 nextSetSummary: currentNextSetSummary)
      await activity.end(content, dismissalPolicy: .immediate)
      currentActivityId = nil; currentStartDate = nil; currentEndDate = nil
      currentExerciseName = nil; currentExerciseImageFileName = nil; currentNextSetSummary = nil
      clearPersistedState()
    }
  }

  @objc(getCurrentRestTimerState:rejecter:)
  func getCurrentRestTimerState(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    restorePersistedStateIfNeeded()
    let now = Date()
    let isActive = currentEndDate.map { $0 > now } ?? false
    resolve([
      "isActive": isActive,
      "endTimestampMs": currentEndDate.map { $0.timeIntervalSince1970 * 1000 } as Any,
      "exerciseName": currentExerciseName as Any,
      "imageFileName": currentExerciseImageFileName as Any,
      "nextSetSummary": currentNextSetSummary as Any
    ])
  }
}

// MARK: - RestTimerLiveActivityModule (event emitter para intents)

@objc(RestTimerLiveActivityModule)
class RestTimerLiveActivityModule: RCTEventEmitter {
  private let sharedDefaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
  private var hasListeners = false
  private var lastHandledIntentSequence = -1
  private var appActiveObserver: NSObjectProtocol?

  override init() {
    super.init()
    // Observar didBecomeActive en lugar de Darwin notifications.
    // Los intents ya no abren la app; este observer sincroniza cambios pendientes
    // cuando el usuario vuelve a la app más tarde.
    appActiveObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didBecomeActiveNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      print("[IntentModule] didBecomeActive → poll")
      self?.emitPendingIntentIfNeeded()
    }
  }

  deinit {
    if let obs = appActiveObserver {
      NotificationCenter.default.removeObserver(obs)
    }
  }

  override func supportedEvents() -> [String]! {
    ["onRestTimerIntent"]
  }

  override static func requiresMainQueueSetup() -> Bool { true }

  override func startObserving() {
    print("[IntentModule] startObserving")
    hasListeners = true
    emitPendingIntentIfNeeded()
  }

  override func stopObserving() {
    print("[IntentModule] stopObserving")
    hasListeners = false
  }

  // Llamado explícitamente desde JS como seguro de malla extra
  @objc(pollPendingIntent:rejecter:)
  func pollPendingIntent(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    print("[IntentModule] pollPendingIntent called from JS")
    emitPendingIntentIfNeeded()
    resolve(nil)
  }

  @objc
  func supportedEventsList(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(supportedEvents())
  }

  private func emitPendingIntentIfNeeded() {
    guard hasListeners else {
      print("[IntentModule] skip: no listeners yet")
      return
    }

    sharedDefaults?.synchronize()

    let sequence = sharedDefaults?.integer(forKey: RestTimerLiveActivityShared.pendingIntentSequenceKey) ?? 0
    print("[IntentModule] poll → sequence=\(sequence) lastHandled=\(lastHandledIntentSequence)")

    guard sequence > lastHandledIntentSequence else {
      print("[IntentModule] skip: no new intent")
      return
    }

    guard let action = sharedDefaults?.string(forKey: RestTimerLiveActivityShared.pendingIntentActionKey) else {
      print("[IntentModule] skip: action missing in UserDefaults")
      lastHandledIntentSequence = sequence
      return
    }

    let delta = sharedDefaults?.integer(forKey: RestTimerLiveActivityShared.pendingIntentDeltaKey) ?? 0
    let endTimestampMs = sharedDefaults?.object(forKey: RestTimerLiveActivityShared.pendingIntentEndTimestampMsKey) as? Double

    print("[IntentModule] EMIT action=\(action) delta=\(delta) endTs=\(String(describing: endTimestampMs))")
    lastHandledIntentSequence = sequence

    // Evita reemitir un intent viejo si el bridge se recrea más tarde.
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.pendingIntentActionKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.pendingIntentDeltaKey)
    sharedDefaults?.removeObject(forKey: RestTimerLiveActivityShared.pendingIntentEndTimestampMsKey)
    sharedDefaults?.synchronize()

    sendEvent(withName: "onRestTimerIntent", body: [
      "action": action,
      "delta": delta,
      "endTimestampMs": endTimestampMs as Any
    ])
  }
}
