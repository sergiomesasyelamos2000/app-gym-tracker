import Foundation
import React

@objc(RestTimerLiveActivityModule)
class RestTimerLiveActivityModule: RCTEventEmitter {

  private var hasListeners = false
  private var darwinRegistered = false

  override static func requiresMainQueueSetup() -> Bool { true }

  override init() {
    super.init()
    registerDarwinObserver()
  }

  deinit {
    unregisterDarwinObserver()
  }

  override func supportedEvents() -> [String]! {
    ["onRestTimerIntent", "onWorkoutLiveIntent"]
  }

  override func startObserving() {
    hasListeners = true
    // Deliver anything queued while JS had no subscribers.
    emitPendingIntentIfAny()
  }

  override func stopObserving() {
    hasListeners = false
  }

  @objc
  func pollPendingIntent(
    _ resolver: RCTPromiseResolveBlock,
    rejecter: RCTPromiseRejectBlock
  ) {
    let delivered = emitPendingIntentIfAny()
    resolver(delivered)
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

  /// Returns true when an intent was emitted to JS.
  @discardableResult
  private func emitPendingIntentIfAny() -> Bool {
    guard hasListeners else { return false }
    let defaults = WorkoutLiveStore.defaults
    guard let payload = defaults.dictionary(forKey: WorkoutLiveStore.pendingIntentKey) else {
      return false
    }
    defaults.removeObject(forKey: WorkoutLiveStore.pendingIntentKey)
    sendEvent(withName: "onRestTimerIntent", body: payload)
    sendEvent(withName: "onWorkoutLiveIntent", body: payload)
    return true
  }

  private func registerDarwinObserver() {
    guard !darwinRegistered else { return }
    let observer = Unmanaged.passUnretained(self).toOpaque()
    CFNotificationCenterAddObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      observer,
      Self.darwinCallback,
      WorkoutLiveStore.intentDarwinName,
      nil,
      .deliverImmediately
    )
    darwinRegistered = true
  }

  private func unregisterDarwinObserver() {
    guard darwinRegistered else { return }
    let observer = Unmanaged.passUnretained(self).toOpaque()
    CFNotificationCenterRemoveObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      observer,
      CFNotificationName(WorkoutLiveStore.intentDarwinName),
      nil
    )
    darwinRegistered = false
  }

  private static let darwinCallback: CFNotificationCallback = { _, observer, _, _, _ in
    guard let observer else { return }
    let module = Unmanaged<RestTimerLiveActivityModule>.fromOpaque(observer).takeUnretainedValue()
    DispatchQueue.main.async {
      module.emitPendingIntentIfAny()
    }
  }
}
