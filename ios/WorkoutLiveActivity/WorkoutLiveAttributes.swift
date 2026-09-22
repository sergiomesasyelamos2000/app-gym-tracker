import ActivityKit
import Foundation
import SwiftUI

@available(iOS 16.1, *)
public struct WorkoutLiveAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var exerciseName: String
    public var nextSetSummary: String
    public var isResting: Bool
    public var restEndAt: Date?
    public var imageFileName: String?
    public var restSecondsDefault: Int

    public init(
      exerciseName: String,
      nextSetSummary: String,
      isResting: Bool,
      restEndAt: Date?,
      imageFileName: String?,
      restSecondsDefault: Int
    ) {
      self.exerciseName = exerciseName
      self.nextSetSummary = nextSetSummary
      self.isResting = isResting
      self.restEndAt = restEndAt
      self.imageFileName = imageFileName
      self.restSecondsDefault = restSecondsDefault
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

  static var defaults: UserDefaults {
    UserDefaults(suiteName: appGroupId) ?? .standard
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
    defaults.set(payload, forKey: pendingIntentKey)
    if action == "completeSet" {
      defaults.set(true, forKey: pendingCompleteKey)
    }
  }
}
