/**
 * One-shot: sync native sources + embed extension target into committed ios/.
 * Usage: node plugins/applyWorkoutLiveActivityTarget.js
 */
const fs = require("fs");
const path = require("path");
const xcode = require("xcode");
const {
  detectAppFolderName,
  ensureWorkoutLiveActivityTarget,
  findNativeTargetByName,
  syncNativeSources,
  EXTENSION_NAME,
} = require("./workoutLiveActivityXcode");

const projectRoot = path.join(__dirname, "..");
const pbxPath = path.join(
  projectRoot,
  "ios",
  "EvoFit.xcodeproj",
  "project.pbxproj"
);

const appJsonPath = path.join(projectRoot, "app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
const expo = appJson.expo ?? appJson;
const bundleIdentifier = expo.ios?.bundleIdentifier ?? "com.smy862.app";
const marketingVersion = String(expo.version ?? "1.0.1");
const currentProjectVersion = String(expo.ios?.buildNumber ?? "71");

syncNativeSources(projectRoot);

const project = xcode.project(pbxPath);
project.parseSync();

const already = findNativeTargetByName(project, EXTENSION_NAME);
const created = ensureWorkoutLiveActivityTarget(project, {
  bundleIdentifier: `${bundleIdentifier}.WorkoutLiveActivity`,
  marketingVersion,
  currentProjectVersion,
  appFolderName: detectAppFolderName(projectRoot),
});

fs.writeFileSync(pbxPath, project.writeSync());

console.log(
  created
    ? `[applyWorkoutLiveActivityTarget] Added ${EXTENSION_NAME} target`
    : `[applyWorkoutLiveActivityTarget] Target ${EXTENSION_NAME} already present` +
        (already ? ` (${already.uuid})` : "")
);
console.log(`[applyWorkoutLiveActivityTarget] Wrote ${pbxPath}`);
