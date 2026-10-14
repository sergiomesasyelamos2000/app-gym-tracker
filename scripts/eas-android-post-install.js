/**
 * EAS post-install: drop Windows-path autolinking cache and force
 * configure-on-demand off (EAS workers sometimes re-enable it).
 * @see https://github.com/expo/expo/issues/42370
 * @see https://github.com/expo/eas-cli/issues/3311
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const androidBuild = path.join("android", "build");
fs.rmSync(androidBuild, { recursive: true, force: true });
console.log("[eas-android-post-install] removed", androidBuild);

const gradleHome = path.join(os.homedir(), ".gradle");
fs.mkdirSync(gradleHome, { recursive: true });
const userProps = path.join(gradleHome, "gradle.properties");
const line = "org.gradle.configureondemand=false";
let existing = "";
try {
  existing = fs.readFileSync(userProps, "utf8");
} catch {
  existing = "";
}
if (!existing.includes(line)) {
  fs.appendFileSync(
    userProps,
    `${existing.endsWith("\n") || existing.length === 0 ? "" : "\n"}${line}\n`
  );
  console.log("[eas-android-post-install] wrote", userProps);
} else {
  console.log("[eas-android-post-install] already set in", userProps);
}
