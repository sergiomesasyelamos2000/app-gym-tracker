const {
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
  IOSConfig,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const APP_GROUP = "group.com.smy862.app";
const EXTENSION_NAME = "WorkoutLiveActivity";
const EXTENSION_BUNDLE_SUFFIX = ".WorkoutLiveActivity";

/**
 * Adds Live Activity support:
 * - Info.plist Live Activities flags
 * - App Group entitlement on main app
 * - EAS appExtensions metadata
 * - Android FGS permissions / service merge notes (android/ already patched)
 * - Ensures bridge Swift sources exist under ios/EvoFit/WorkoutLive
 */
const withWorkoutLiveActivity = (config) => {
  const bundleIdentifier = config.ios?.bundleIdentifier ?? "com.smy862.app";

  config.extra = config.extra ?? {};
  config.extra.eas = config.extra.eas ?? {};
  config.extra.eas.build = config.extra.eas.build ?? {};
  config.extra.eas.build.experimental =
    config.extra.eas.build.experimental ?? {};
  config.extra.eas.build.experimental.ios =
    config.extra.eas.build.experimental.ios ?? {};

  const existingAppExtensions =
    config.extra.eas.build.experimental.ios.appExtensions ?? [];

  config.extra.eas.build.experimental.ios.appExtensions =
    existingAppExtensions.some(
      (extension) => extension.targetName === EXTENSION_NAME
    )
      ? existingAppExtensions.map((ext) =>
          ext.targetName === EXTENSION_NAME
            ? {
                ...ext,
                bundleIdentifier: `${bundleIdentifier}${EXTENSION_BUNDLE_SUFFIX}`,
                entitlements: {
                  "com.apple.security.application-groups": [APP_GROUP],
                },
              }
            : ext
        )
      : [
          ...existingAppExtensions.filter(
            (e) => e.targetName !== "RestTimerLiveActivityExtension"
          ),
          {
            targetName: EXTENSION_NAME,
            bundleIdentifier: `${bundleIdentifier}${EXTENSION_BUNDLE_SUFFIX}`,
            entitlements: {
              "com.apple.security.application-groups": [APP_GROUP],
            },
          },
        ];

  config = withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.NSSupportsLiveActivities = true;
    nextConfig.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return nextConfig;
  });

  config = withEntitlementsPlist(config, (nextConfig) => {
    const groups =
      nextConfig.modResults["com.apple.security.application-groups"] ?? [];
    if (!groups.includes(APP_GROUP)) {
      nextConfig.modResults["com.apple.security.application-groups"] = [
        ...groups,
        APP_GROUP,
      ];
    }
    return nextConfig;
  });

  // Ensure Android permissions survive prebuild.
  config.android = config.android ?? {};
  config.android.permissions = Array.from(
    new Set([
      ...(config.android.permissions ?? []),
      "android.permission.POST_NOTIFICATIONS",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
    ])
  );

  config = withDangerousMod(config, [
    "android",
    async (nextConfig) => {
      const manifestPath = path.join(
        nextConfig.modRequest.platformProjectRoot,
        "app/src/main/AndroidManifest.xml"
      );
      if (fs.existsSync(manifestPath)) {
        let xml = fs.readFileSync(manifestPath, "utf8");
        if (!xml.includes("WorkoutLiveForegroundService")) {
          xml = xml.replace(
            "</application>",
            `    <service
      android:name=".notifications.WorkoutLiveForegroundService"
      android:exported="false"
      android:foregroundServiceType="specialUse">
      <property
        android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
        android:value="workout_live_activity" />
    </service>
</application>`
          );
          fs.writeFileSync(manifestPath, xml);
        }
      }
      return nextConfig;
    },
  ]);

  return config;
};

module.exports = withWorkoutLiveActivity;
