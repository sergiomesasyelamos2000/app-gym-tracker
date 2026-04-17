const { withInfoPlist } = require("expo/config-plugins");

const withRestTimerLiveActivity = (config) => {
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
  const targetName = "RestTimerLiveActivityExtension";

  config.extra.eas.build.experimental.ios.appExtensions =
    existingAppExtensions.some(
      (extension) => extension.targetName === targetName
    )
      ? existingAppExtensions
      : [
          ...existingAppExtensions,
          {
            targetName,
            bundleIdentifier: `${bundleIdentifier}.RestTimerLiveActivity`,
          },
        ];

  return withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.NSSupportsLiveActivities = true;
    nextConfig.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return nextConfig;
  });
};

module.exports = withRestTimerLiveActivity;
