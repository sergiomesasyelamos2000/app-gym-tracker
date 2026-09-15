import Foundation
import React

@objc(RestTimerLiveActivityModule)
class RestTimerLiveActivityModule: RCTEventEmitter {

  private var hasListeners = false

  override static func requiresMainQueueSetup() -> Bool { true }

  override func supportedEvents() -> [String]! {
    ["onRestTimerIntent", "onWorkoutLiveIntent"]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  @objc
  func pollPendingIntent(
    _ resolver: RCTPromiseResolveBlock,
    rejecter: RCTPromiseRejectBlock
  ) {
    let defaults = WorkoutLiveStore.defaults
    guard let payload = defaults.dictionary(forKey: WorkoutLiveStore.pendingIntentKey) else {
      resolver(false)
      return
    }
    defaults.removeObject(forKey: WorkoutLiveStore.pendingIntentKey)

    if hasListeners {
      sendEvent(withName: "onRestTimerIntent", body: payload)
      sendEvent(withName: "onWorkoutLiveIntent", body: payload)
    }
    resolver(true)
  }

  @objc
  func consumePendingCompleteSet(
    _ resolver: RCTPromiseResolveBlock,
    rejecter: RCTPromiseRejectBlock
  ) {
    let defaults = WorkoutLiveStore.defaults
    let pending = defaults.bool(forKey: WorkoutLiveStore.pendingCompleteKey)
    if pending {
      defaults.set(false, forKey: WorkoutLiveStore.pendingCompleteKey)
    }
    resolver(pending)
  }

  @objc
  func consumeAppTerminatedAt(
    _ resolver: RCTPromiseResolveBlock,
    rejecter: RCTPromiseRejectBlock
  ) {
    let defaults = WorkoutLiveStore.defaults
    let value = defaults.double(forKey: WorkoutLiveStore.appTerminatedAtKey)
    if value > 0 {
      defaults.removeObject(forKey: WorkoutLiveStore.appTerminatedAtKey)
      resolver(value)
    } else {
      resolver(NSNull())
    }
  }
}
