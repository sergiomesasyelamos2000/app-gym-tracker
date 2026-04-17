import Foundation
import ActivityKit

public enum RestTimerLiveActivityShared {
  public static let appGroupIdentifier = "group.com.smy862.app.shared"
  public static let currentActivityIdKey = "restTimer.currentActivityId"
  public static let currentStartDateKey = "restTimer.currentStartDate"
  public static let currentExerciseNameKey = "restTimer.currentExerciseName"
  public static let currentExerciseImageKey = "restTimer.currentExerciseImage"
  public static let currentNextSetSummaryKey = "restTimer.currentNextSetSummary"
  public static let pendingIntentActionKey = "restTimer.pendingIntent.action"
  public static let pendingIntentDeltaKey = "restTimer.pendingIntent.delta"
  public static let pendingIntentSequenceKey = "restTimer.pendingIntent.sequence"
  public static let pendingIntentNotificationName = "group.com.smy862.app.shared.restTimer.intent"
}

public struct RestTimerAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var endDate: Date
    public var exerciseName: String?
    public var exerciseImageFileName: String?
    public var nextSetSummary: String?

    public init(
      endDate: Date,
      exerciseName: String?,
      exerciseImageFileName: String?,
      nextSetSummary: String?
    ) {
      self.endDate = endDate
      self.exerciseName = exerciseName
      self.exerciseImageFileName = exerciseImageFileName
      self.nextSetSummary = nextSetSummary
    }
  }

  public var startDate: Date

  public init(startDate: Date) {
    self.startDate = startDate
  }
}
