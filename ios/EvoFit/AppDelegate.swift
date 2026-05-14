import Expo
import React
import ReactAppDependencyProvider
import ActivityKit
import RestTimerShared
import UserNotifications

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }

  public override func applicationWillTerminate(_ application: UIApplication) {
    markForcedTerminationAndCancelRestTimer()
    super.applicationWillTerminate(application)
  }

  private func markForcedTerminationAndCancelRestTimer() {
    let defaults = UserDefaults(suiteName: RestTimerLiveActivityShared.appGroupIdentifier)
    let terminatedAt = Date()

    defaults?.set(terminatedAt.timeIntervalSince1970 * 1000, forKey: RestTimerLiveActivityShared.appTerminatedAtKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentActivityIdKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentStartDateKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentEndDateKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentExerciseNameKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentExerciseImageKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.currentNextSetSummaryKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.pendingIntentActionKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.pendingIntentDeltaKey)
    defaults?.removeObject(forKey: RestTimerLiveActivityShared.pendingIntentEndTimestampMsKey)
    defaults?.synchronize()

    UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
      let restTimerIds = requests
        .map(\.identifier)
        .filter { $0.hasPrefix("rest-timer-") }
      guard !restTimerIds.isEmpty else { return }
      UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: restTimerIds)
      UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: restTimerIds)
    }

    guard #available(iOS 16.2, *) else { return }

    let activities = Activity<RestTimerAttributes>.activities
    guard !activities.isEmpty else { return }

    let group = DispatchGroup()
    for activity in activities {
      group.enter()
      Task.detached {
        let finalState = RestTimerAttributes.ContentState(
          endDate: terminatedAt,
          exerciseName: activity.content.state.exerciseName,
          exerciseImageFileName: activity.content.state.exerciseImageFileName,
          nextSetSummary: activity.content.state.nextSetSummary
        )
        await activity.end(ActivityContent(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
        group.leave()
      }
    }
    _ = group.wait(timeout: .now() + 1.5)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
