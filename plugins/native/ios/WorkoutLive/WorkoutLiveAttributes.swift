import ActivityKit
import Foundation

@available(iOS 16.2, *)
public struct WorkoutLiveAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var exerciseName: String
    public var nextSetSummary: String
    public var isResting: Bool
    public var restEndAt: Date?
    public var imageFileName: String?
    public var restSecondsDefault: Int
    // Optional so activities started by older builds still decode after an update.
    public var routineName: String?
    /// 1-based position of the current exercise in the routine.
    public var exerciseIndex: Int?
    public var exerciseCount: Int?
    public var completedSets: Int?
    public var totalSets: Int?

    public init(
      exerciseName: String,
      nextSetSummary: String,
      isResting: Bool,
      restEndAt: Date?,
      imageFileName: String?,
      restSecondsDefault: Int,
      routineName: String? = nil,
      exerciseIndex: Int? = nil,
      exerciseCount: Int? = nil,
      completedSets: Int? = nil,
      totalSets: Int? = nil
    ) {
      self.exerciseName = exerciseName
      self.nextSetSummary = nextSetSummary
      self.isResting = isResting
      self.restEndAt = restEndAt
      self.imageFileName = imageFileName
      self.restSecondsDefault = restSecondsDefault
      self.routineName = routineName
      self.exerciseIndex = exerciseIndex
      self.exerciseCount = exerciseCount
      self.completedSets = completedSets
      self.totalSets = totalSets
    }
  }

  public var workoutStartedAt: Date

  public init(workoutStartedAt: Date) {
    self.workoutStartedAt = workoutStartedAt
  }
}

enum WorkoutLiveStore {
  static let appGroupId = "group.com.smy862.app"
  static let pendingIntentKey = "workoutLive.pendingIntent"
  static let pendingCompleteKey = "workoutLive.pendingCompleteSet"
  static let appTerminatedAtKey = "workoutLive.appTerminatedAt"
  static let stateKey = "workoutLive.currentState"
  /// Darwin wake so the RN module can deliver Island intents while the app is foregrounded.
  static let intentDarwinName = "com.smy862.app.workoutLive.intentPending" as CFString

  static var defaults: UserDefaults {
    UserDefaults(suiteName: appGroupId) ?? .standard
  }

  /// CFPreferences aborts if any value is not a property-list type (e.g. Swift
  /// `Optional.none` bridged as `Any`). Only write dictionaries that serialize.
  static func setPlistDictionary(_ raw: [String: Any], forKey key: String) {
    var sanitized: [String: Any] = [:]
    sanitized.reserveCapacity(raw.count)
    for (k, value) in raw {
      if value is NSNull { continue }
      // Skip pure Optional wrappers that slipped through as Any.
      let mirror = Mirror(reflecting: value)
      if mirror.displayStyle == .optional, mirror.children.isEmpty {
        continue
      }
      sanitized[k] = value
    }
    guard JSONSerialization.isValidJSONObject(sanitized) else {
      // Fall back: drop anything that still is not plist-compatible.
      var plistSafe: [String: Any] = [:]
      for (k, value) in sanitized {
        if value is String || value is NSString ||
          value is NSNumber || value is Bool ||
          value is Int || value is Double || value is Float {
          plistSafe[k] = value
        }
      }
      defaults.set(plistSafe, forKey: key)
      return
    }
    defaults.set(sanitized, forKey: key)
  }

  @available(iOS 16.2, *)
  static func persistActivityState(
    _ state: WorkoutLiveAttributes.ContentState,
    startedAt: Date
  ) {
    var payload: [String: Any] = [
      "exerciseName": state.exerciseName,
      "nextSetSummary": state.nextSetSummary,
      "isResting": state.isResting,
      "workoutStartedAtMs": startedAt.timeIntervalSince1970 * 1000,
      "restSecondsDefault": state.restSecondsDefault,
    ]
    if let restEnd = state.restEndAt {
      payload["restEndAtMs"] = restEnd.timeIntervalSince1970 * 1000
    }
    if let imageFileName = state.imageFileName, !imageFileName.isEmpty {
      payload["imageFileName"] = imageFileName
    }
    setPlistDictionary(payload, forKey: stateKey)
  }

  static func enqueueIntent(_ action: String, delta: Int = 0, endAt: Double? = nil) {
    var payload: [String: Any] = [
      "action": action,
      "delta": delta,
      "queuedAt": Date().timeIntervalSince1970 * 1000,
    ]
    if let endAt {
      payload["endTimestampMs"] = endAt
    }
    setPlistDictionary(payload, forKey: pendingIntentKey)
    if action == "completeSet" {
      defaults.set(true, forKey: pendingCompleteKey)
    }
    notifyIntentQueued()
  }

  static func notifyIntentQueued() {
    CFNotificationCenterPostNotification(
      CFNotificationCenterGetDarwinNotifyCenter(),
      CFNotificationName(intentDarwinName),
      nil,
      nil,
      true
    )
  }
}
