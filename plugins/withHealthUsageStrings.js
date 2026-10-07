const {
  withInfoPlist,
  withDangerousMod,
  createRunOncePlugin,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const SHARE_USAGE =
  "EvoFit lee de Apple Salud tu frecuencia cardiaca y energía activa durante el entrenamiento, y tu sueño y pasos para consejos de descanso.";
const UPDATE_USAGE =
  "EvoFit puede guardar en Apple Salud el entrenamiento completado y las calorías activas de la sesión, si activas esa opción.";

function upsertPlistString(contents, key, value) {
  const keyTag = `<key>${key}</key>`;
  const valueTag = `<string>${value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</string>`;
  if (contents.includes(keyTag)) {
    return contents.replace(
      new RegExp(
        `${keyTag}\\s*<string>[\\s\\S]*?<\\/string>`,
        "m"
      ),
      `${keyTag}\n    ${valueTag}`
    );
  }
  return contents.replace(
    "</dict>\n</plist>",
    `    ${keyTag}\n    ${valueTag}\n  </dict>\n</plist>`
  );
}

function removePlistKey(contents, key) {
  return contents.replace(
    new RegExp(`\\s*<key>${key}<\\/key>\\s*<string>[\\s\\S]*?<\\/string>`, "m"),
    ""
  );
}

/**
 * Ensures HealthKit purpose strings land in Info.plist even when EAS signs the
 * committed ios/ tree (or when another plugin races with apple-health).
 * Also strips unused microphone purpose string.
 */
function withHealthUsageStrings(config) {
  config = withInfoPlist(config, (nextConfig) => {
    const infoPlist = nextConfig.modResults;
    infoPlist.NSHealthShareUsageDescription = SHARE_USAGE;
    infoPlist.NSHealthUpdateUsageDescription = UPDATE_USAGE;
    infoPlist.ITSAppUsesNonExemptEncryption = false;
    delete infoPlist.NSMicrophoneUsageDescription;
    return nextConfig;
  });

  config = withDangerousMod(config, [
    "ios",
    async (nextConfig) => {
      const plistPath = path.join(
        nextConfig.modRequest.platformProjectRoot,
        nextConfig.modRequest.projectName || "EvoFit",
        "Info.plist"
      );
      if (!fs.existsSync(plistPath)) {
        return nextConfig;
      }
      let contents = fs.readFileSync(plistPath, "utf8");
      contents = upsertPlistString(
        contents,
        "NSHealthShareUsageDescription",
        SHARE_USAGE
      );
      contents = upsertPlistString(
        contents,
        "NSHealthUpdateUsageDescription",
        UPDATE_USAGE
      );
      contents = removePlistKey(contents, "NSMicrophoneUsageDescription");
      if (!contents.includes("ITSAppUsesNonExemptEncryption")) {
        contents = contents.replace(
          "</dict>\n</plist>",
          "    <key>ITSAppUsesNonExemptEncryption</key>\n    <false/>\n  </dict>\n</plist>"
        );
      }
      fs.writeFileSync(plistPath, contents);
      return nextConfig;
    },
  ]);

  return config;
}

module.exports = createRunOncePlugin(
  withHealthUsageStrings,
  "withHealthUsageStrings",
  "1.1.0"
);
