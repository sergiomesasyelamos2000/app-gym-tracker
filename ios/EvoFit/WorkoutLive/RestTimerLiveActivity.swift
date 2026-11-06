import Foundation
import ActivityKit
import ImageIO
import React
import UIKit

/// Routine/exercise position + pause fields sent by JS (`toNativeProgress`) as an NSDictionary.
struct LiveProgress {
  var routineName: String?
  var exerciseIndex: Int?
  var exerciseCount: Int?
  var completedSets: Int?
  var totalSets: Int?
  var isPaused: Bool?
  var pausedElapsedSeconds: Int?

  init() {}

  /// Nil when JS did not send a dictionary (legacy callers).
  init?(dictionary: NSDictionary?) {
    guard let dictionary else { return nil }
    let name = (dictionary["routineName"] as? String)?
      .trimmingCharacters(in: .whitespacesAndNewlines)
    routineName = name?.isEmpty == false ? name : nil
    exerciseIndex = (dictionary["exerciseIndex"] as? NSNumber)?.intValue
    exerciseCount = (dictionary["exerciseCount"] as? NSNumber)?.intValue
    completedSets = (dictionary["completedSets"] as? NSNumber)?.intValue
    totalSets = (dictionary["totalSets"] as? NSNumber)?.intValue
    if let paused = dictionary["isPaused"] as? NSNumber {
      isPaused = paused.boolValue
    } else if let paused = dictionary["isPaused"] as? Bool {
      isPaused = paused
    }
    if let frozen = dictionary["pausedElapsedSeconds"] as? NSNumber {
      pausedElapsedSeconds = max(0, frozen.intValue)
    }
  }

  @available(iOS 16.2, *)
  init(state: WorkoutLiveAttributes.ContentState) {
    routineName = state.routineName
    exerciseIndex = state.exerciseIndex
    exerciseCount = state.exerciseCount
    completedSets = state.completedSets
    totalSets = state.totalSets
    isPaused = state.isPaused
    pausedElapsedSeconds = state.pausedElapsedSeconds
  }
}

@objc(RestTimerLiveActivity)
class RestTimerLiveActivity: NSObject {

  /// Boxed so the class can link against iOS 15.1; ActivityContent APIs need 16.2+.
  private var currentActivityBox: Any?
  /// Drop stale start/update/clearRest tasks that lose the race to a newer write
  /// (e.g. image download finishing after leave-to-pause).
  private var updateSerial: Int = 0
  /// Serialize ActivityKit content writes so an older in-flight update cannot
  /// land after a newer one (toast ±15 bursts).
  private var contentUpdateChain: Task<Bool, Never>?

  @available(iOS 16.2, *)
  private var currentActivity: Activity<WorkoutLiveAttributes>? {
    get { currentActivityBox as? Activity<WorkoutLiveAttributes> }
    set { currentActivityBox = newValue }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { true }

  private func nextUpdateSerial() -> Int {
    updateSerial += 1
    return updateSerial
  }

  @available(iOS 16.2, *)
  @MainActor
  private func commitContentUpdate(
    serial: Int,
    activity: Activity<WorkoutLiveAttributes>,
    state: WorkoutLiveAttributes.ContentState,
    startedAt: Date
  ) async -> Bool {
    let previous = contentUpdateChain
    let task = Task { @MainActor in
      _ = await previous?.value
      guard serial == self.updateSerial else { return false }
      await activity.update(ActivityContent(state: state, staleDate: nil))
      guard serial == self.updateSerial else { return false }
      self.currentActivity = activity
      self.persistState(state, startedAt: startedAt)
      return true
    }
    contentUpdateChain = task
    return await task.value
  }

  @objc
  func startWorkoutLive(
    _ workoutStartedAtMs: NSNumber,
    exerciseName: String?,
    imageUrl: String?,
    nextSetSummary: String?,
    isResting: Bool,
    restEndAtMs: NSNumber?,
    restSecondsDefault: NSNumber?,
    progress: NSDictionary?,
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
      let serial = nextUpdateSerial()
      await endAll()
      let startedAt = Date(timeIntervalSince1970: workoutStartedAtMs.doubleValue / 1000)
      let attributes = WorkoutLiveAttributes(workoutStartedAt: startedAt)
      let imageFileName = await Self.resolveImageFileName(imageUrl)
      guard serial == self.updateSerial else {
        resolver(false)
        return
      }
      let state = makeState(
        exerciseName: exerciseName,
        nextSetSummary: nextSetSummary,
        isResting: isResting,
        restEndAtMs: restEndAtMs,
        imageFileName: imageFileName,
        restSecondsDefault: restSecondsDefault,
        progress: LiveProgress(dictionary: progress) ?? LiveProgress(),
        timerStartedAt: startedAt
      )
      do {
        let activity = try Activity.request(
          attributes: attributes,
          content: ActivityContent(state: state, staleDate: nil),
          pushType: nil
        )
        guard serial == self.updateSerial else {
          await activity.end(nil, dismissalPolicy: .immediate)
          resolver(false)
          return
        }
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
    progress: NSDictionary?,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolver(false)
      return
    }

    Task { @MainActor in
      let serial = nextUpdateSerial()
      let existing = currentActivity ?? Activity<WorkoutLiveAttributes>.activities.first
      // JS may pass null imageUrl to skip re-decode — keep prior App Group file.
      let imageFileName: String?
      if let imageUrl, !imageUrl.isEmpty {
        imageFileName = await Self.resolveImageFileName(imageUrl)
      } else {
        imageFileName = existing?.content.state.imageFileName
      }
      guard serial == self.updateSerial else {
        resolver(false)
        return
      }
      // Legacy callers pass nil progress — keep what the activity already shows.
      let resolvedProgress = LiveProgress(dictionary: progress)
        ?? existing.map { LiveProgress(state: $0.content.state) }
        ?? LiveProgress()

      let startedAt = Date(timeIntervalSince1970: workoutStartedAtMs.doubleValue / 1000)
      let state = makeState(
        exerciseName: exerciseName,
        nextSetSummary: nextSetSummary,
        isResting: isResting,
        restEndAtMs: restEndAtMs,
        imageFileName: imageFileName,
        restSecondsDefault: restSecondsDefault,
        progress: resolvedProgress,
        timerStartedAt: startedAt
      )

      if let activity = existing {
        let ok = await commitContentUpdate(
          serial: serial,
          activity: activity,
          state: state,
          startedAt: startedAt
        )
        resolver(ok)
      } else {
        startWorkoutLive(
          workoutStartedAtMs,
          exerciseName: exerciseName,
          imageUrl: imageUrl,
          nextSetSummary: nextSetSummary,
          isResting: isResting,
          restEndAtMs: restEndAtMs,
          restSecondsDefault: restSecondsDefault,
          progress: progress,
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
      progress: nil,
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
      progress: nil,
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
      let serial = nextUpdateSerial()
      guard let activity = currentActivity ?? Activity<WorkoutLiveAttributes>.activities.first else {
        resolver(false)
        return
      }
      // Never clear rest over a frozen pause clock.
      if activity.content.state.pausedClock {
        resolver(false)
        return
      }
      var state = activity.content.state
      state.isResting = false
      state.restEndAt = nil
      guard serial == self.updateSerial else {
        resolver(false)
        return
      }
      let ok = await commitContentUpdate(
        serial: serial,
        activity: activity,
        state: state,
        startedAt: activity.attributes.workoutStartedAt
      )
      resolver(ok)
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
      var payload: [String: Any] = [
        "isActive": true,
        "exerciseName": state.exerciseName,
        "nextSetSummary": state.nextSetSummary,
        "isResting": state.isResting,
        "workoutStartedAtMs": activity.attributes.workoutStartedAt.timeIntervalSince1970 * 1000,
      ]
      if let restEnd = state.restEndAt {
        payload["endTimestampMs"] = restEnd.timeIntervalSince1970 * 1000
      } else {
        payload["endTimestampMs"] = NSNull()
      }
      resolver(payload)
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
    restSecondsDefault: NSNumber?,
    progress: LiveProgress,
    timerStartedAt: Date
  ) -> WorkoutLiveAttributes.ContentState {
    let paused = progress.isPaused == true
    let restEnd: Date? = {
      guard !paused, isResting, let ms = restEndAtMs?.doubleValue, ms > 0 else { return nil }
      return Date(timeIntervalSince1970: ms / 1000)
    }()
    return WorkoutLiveAttributes.ContentState(
      exerciseName: exerciseName?.isEmpty == false ? exerciseName! : "Entrenamiento",
      nextSetSummary: nextSetSummary ?? "",
      isResting: paused ? false : isResting,
      restEndAt: restEnd,
      imageFileName: imageFileName,
      restSecondsDefault: restSecondsDefault?.intValue ?? 90,
      routineName: progress.routineName,
      exerciseIndex: progress.exerciseIndex,
      exerciseCount: progress.exerciseCount,
      completedSets: progress.completedSets,
      totalSets: progress.totalSets,
      isPaused: paused,
      pausedElapsedSeconds: paused ? max(0, progress.pausedElapsedSeconds ?? 0) : nil,
      timerStartedAt: timerStartedAt
    )
  }

  /// Max edge (px) of stored thumbs. Live Activities fail to render images larger
  /// than their presentation size, and the widget extension has a tiny memory budget.
  private static let liveThumbMaxPixelSize: CGFloat = 120

  /// Store a small static thumb (remote `http(s)` or `data:image` URI) in the App Group
  /// so the widget can read it. Returns a relative path (e.g. `live-thumbs/thumb_v2_….jpg`)
  /// or nil when the image cannot be resolved — never a raw URL.
  private static func resolveImageFileName(_ imageUrl: String?) async -> String? {
    guard let imageUrl, !imageUrl.isEmpty else { return nil }

    let isRemote = imageUrl.hasPrefix("http://") || imageUrl.hasPrefix("https://")
    let isDataUri = imageUrl.hasPrefix("data:image")
    guard isRemote || isDataUri else { return nil }

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

    let data: Data?
    if isDataUri {
      data = decodeDataUri(imageUrl)
    } else {
      data = await downloadImageData(imageUrl)
    }

    guard let data, let jpeg = makeThumbnailJpeg(from: data) else { return nil }
    do {
      try jpeg.write(to: dest, options: .atomic)
      return fileName
    } catch {
      return nil
    }
  }

  private static func downloadImageData(_ urlString: String) async -> Data? {
    guard let remote = URL(string: urlString) else { return nil }
    do {
      let config = URLSessionConfiguration.ephemeral
      config.timeoutIntervalForRequest = 4
      config.timeoutIntervalForResource = 6
      let session = URLSession(configuration: config)
      let (data, response) = try await session.data(from: remote)
      if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
        return nil
      }
      return data
    } catch {
      return nil
    }
  }

  private static func decodeDataUri(_ uri: String) -> Data? {
    guard let comma = uri.firstIndex(of: ",") else { return nil }
    let base64 = String(uri[uri.index(after: comma)...])
    return Data(base64Encoded: base64, options: .ignoreUnknownCharacters)
  }

  /// Downsample with ImageIO (no full-size decode) and re-encode as small JPEG.
  private static func makeThumbnailJpeg(from data: Data) -> Data? {
    let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions) else {
      return nil
    }
    let thumbOptions = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceShouldCacheImmediately: true,
      kCGImageSourceThumbnailMaxPixelSize: liveThumbMaxPixelSize,
    ] as CFDictionary
    guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbOptions) else {
      return nil
    }
    return UIImage(cgImage: cgImage).jpegData(compressionQuality: 0.85)
  }

  /// Stable FNV-1a filename (Swift `Hasher` / `hashValue` are not stable across launches).
  /// `v2` prefix invalidates full-size thumbs cached by earlier builds.
  private static func stableThumbName(for urlString: String) -> String {
    var hash: UInt64 = 14695981039346656037
    for byte in urlString.utf8 {
      hash ^= UInt64(byte)
      hash = hash &* 1099511628211
    }
    return String(format: "thumb_v2_%016llx.jpg", hash)
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
    WorkoutLiveStore.persistActivityState(state, startedAt: startedAt)
  }
}
