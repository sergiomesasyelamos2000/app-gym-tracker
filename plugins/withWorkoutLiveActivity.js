const {
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");
const {
  APP_GROUP,
  EXTENSION_NAME,
  detectAppFolderName,
  ensureWorkoutLiveActivityTarget,
  syncNativeSources,
} = require("./workoutLiveActivityXcode");

const EXTENSION_BUNDLE_SUFFIX = ".WorkoutLiveActivity";

/**
 * Adds Live Activity support:
 * - Info.plist Live Activities flags
 * - App Group entitlement on main app
 * - EAS appExtensions metadata
 * - Copy canonical native sources into ios/ (survives prebuild --clean)
 * - Embed WorkoutLiveActivity Widget Extension target
 * - Android FGS permissions / service merge
 */
const withWorkoutLiveActivity = (config) => {
  const bundleIdentifier = config.ios?.bundleIdentifier ?? "com.smy862.app";
  const extensionBundleId = `${bundleIdentifier}${EXTENSION_BUNDLE_SUFFIX}`;
  const marketingVersion = String(config.version ?? "1.0.0");
  const currentProjectVersion = String(config.ios?.buildNumber ?? "1");

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
                bundleIdentifier: extensionBundleId,
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
            bundleIdentifier: extensionBundleId,
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

  config = withDangerousMod(config, [
    "ios",
    async (nextConfig) => {
      syncNativeSources(nextConfig.modRequest.projectRoot);
      return nextConfig;
    },
  ]);

  config = withXcodeProject(config, (nextConfig) => {
    ensureWorkoutLiveActivityTarget(nextConfig.modResults, {
      bundleIdentifier: extensionBundleId,
      marketingVersion,
      currentProjectVersion,
      appFolderName: detectAppFolderName(nextConfig.modRequest.projectRoot),
    });
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
