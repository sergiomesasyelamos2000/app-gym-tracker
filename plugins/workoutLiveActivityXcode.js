/**
 * Idempotent helpers to embed the WorkoutLiveActivity widget extension
 * into an Expo/React Native Xcode project.
 */
const fs = require("fs");
const path = require("path");

const EXTENSION_NAME = "WorkoutLiveActivity";
const APP_GROUP = "group.com.smy862.app";

function copyDirContents(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`[withWorkoutLiveActivity] Missing source directory: ${srcDir}`);
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirContents(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function findNativeTargetByName(project, name) {
  const section = project.pbxNativeTargetSection();
  for (const key of Object.keys(section)) {
    if (key.endsWith("_comment")) continue;
    const target = section[key];
    const targetName = (target.name || "").replace(/^"|"$/g, "");
    if (targetName === name) {
      return { uuid: key, target };
    }
  }
  return null;
}

function findApplicationTarget(project) {
  const section = project.pbxNativeTargetSection();
  for (const key of Object.keys(section)) {
    if (key.endsWith("_comment")) continue;
    const target = section[key];
    const productType = (target.productType || "").replace(/^"|"$/g, "");
    if (productType === "com.apple.product-type.application") {
      return { uuid: key, target };
    }
  }
  return project.getFirstTarget()
    ? { uuid: project.getFirstTarget().uuid, target: section[project.getFirstTarget().uuid] }
    : null;
}

function findFileRefByPath(project, relativePath) {
  const section = project.pbxFileReferenceSection();
  const normalized = relativePath.replace(/\\/g, "/");
  for (const key of Object.keys(section)) {
    if (key.endsWith("_comment")) continue;
    const ref = section[key];
    const refPath = (ref.path || "").replace(/^"|"$/g, "");
    if (
      refPath === normalized ||
      refPath.endsWith(`/${normalized}`) ||
      refPath.endsWith(normalized)
    ) {
      return key;
    }
  }
  return null;
}

function findGroupByName(project, name) {
  const groups = project.hash.project.objects.PBXGroup || {};
  for (const key of Object.keys(groups)) {
    if (key.endsWith("_comment")) continue;
    const group = groups[key];
    const groupName = (group.name || group.path || "").replace(/^"|"$/g, "");
    if (groupName === name) return key;
  }
  return null;
}

function detectAppFolderName(projectRoot) {
  const iosRoot = path.join(projectRoot, "ios");
  if (!fs.existsSync(iosRoot)) return "EvoFit";
  const match = fs
    .readdirSync(iosRoot, { withFileTypes: true })
    .find(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(iosRoot, entry.name, "AppDelegate.swift"))
    );
  return match?.name ?? "EvoFit";
}

/**
 * Ensure WorkoutLive bridge + attributes are compiled into the app target.
 * Safe on committed projects (no-op when refs already exist) and on prebuild.
 */
function ensureAppBridgeSources(project, appTargetUuid, appFolderName) {
  const workoutLiveGroupKey =
    findGroupByName(project, "WorkoutLive") ||
    (() => {
      const key = project.pbxCreateGroup("WorkoutLive", undefined);
      const appGroupKey = findGroupByName(project, appFolderName);
      if (appGroupKey) {
        const appGroup = project.getPBXGroupByKey(appGroupKey);
        if (
          appGroup &&
          !appGroup.children.some((child) => child.value === key)
        ) {
          appGroup.children.push({ value: key, comment: "WorkoutLive" });
        }
      }
      return key;
    })();

  const bridgeFiles = [
    "WorkoutLiveAttributes.swift",
    "RestTimerLiveActivity.swift",
    "RestTimerLiveActivityModule.swift",
    "RestTimerLiveActivityBridge.m",
  ];

  for (const fileName of bridgeFiles) {
    const relativePath = `${appFolderName}/WorkoutLive/${fileName}`;
    let fileRef = findFileRefByPath(project, relativePath);
    if (!fileRef) {
      const added = project.addSourceFile(
        relativePath,
        { target: appTargetUuid },
        workoutLiveGroupKey
      );
      if (!added) {
        // hasFile returned null — try to locate any existing ref by basename.
        fileRef = findFileRefByPath(project, fileName);
      } else {
        fileRef = added.fileRef;
      }
    }
    if (fileRef) {
      ensureBuildFileForTargetSources(
        project,
        fileRef,
        fileName,
        appTargetUuid
      );
    }
  }

  return findFileRefByPath(
    project,
    `${appFolderName}/WorkoutLive/WorkoutLiveAttributes.swift`
  );
}

function ensureBuildFileForTargetSources(project, fileRefUuid, basename, targetUuid) {
  const sourcesPhase = project.buildPhaseObject(
    "PBXSourcesBuildPhase",
    "Sources",
    targetUuid
  );
  if (!sourcesPhase) {
    throw new Error(
      `[withWorkoutLiveActivity] Missing Sources phase for target ${targetUuid}`
    );
  }

  const buildFileSection = project.pbxBuildFileSection();
  for (const key of Object.keys(buildFileSection)) {
    if (key.endsWith("_comment")) continue;
    const buildFile = buildFileSection[key];
    if (
      buildFile.fileRef === fileRefUuid &&
      sourcesPhase.files.some((entry) => entry.value === key)
    ) {
      return key;
    }
  }

  const buildFileUuid = project.generateUuid();
  buildFileSection[buildFileUuid] = {
    isa: "PBXBuildFile",
    fileRef: fileRefUuid,
    fileRef_comment: basename,
  };
  buildFileSection[`${buildFileUuid}_comment`] = `${basename} in Sources`;
  sourcesPhase.files.push({
    value: buildFileUuid,
    comment: `${basename} in Sources`,
  });
  return buildFileUuid;
}

function ensureDependencySections(project) {
  if (!project.hash.project.objects.PBXTargetDependency) {
    project.hash.project.objects.PBXTargetDependency = {};
  }
  if (!project.hash.project.objects.PBXContainerItemProxy) {
    project.hash.project.objects.PBXContainerItemProxy = {};
  }
}

function ensureAppDependsOnExtension(project, appTargetUuid, extensionTargetUuid) {
  ensureDependencySections(project);
  const appTarget = project.pbxNativeTargetSection()[appTargetUuid];
  if (!appTarget) return;
  const already = (appTarget.dependencies || []).some((dep) => {
    const dependency =
      project.hash.project.objects.PBXTargetDependency[dep.value];
    return dependency && dependency.target === extensionTargetUuid;
  });
  if (already) return;
  project.addTargetDependency(appTargetUuid, [extensionTargetUuid]);
}

function ensureEmbedPhaseSettings(project) {
  const copyPhaseSection =
    project.hash.project.objects.PBXCopyFilesBuildPhase || {};
  for (const key of Object.keys(copyPhaseSection)) {
    if (key.endsWith("_comment")) continue;
    const phase = copyPhaseSection[key];
    if (phase.dstSubfolderSpec !== 13) continue;
    phase.name = '"Embed Foundation Extensions"';
    const commentKey = `${key}_comment`;
    if (copyPhaseSection[commentKey]) {
      copyPhaseSection[commentKey] = "Embed Foundation Extensions";
    }
    for (const fileEntry of phase.files || []) {
      const buildFile = project.pbxBuildFileSection()[fileEntry.value];
      if (!buildFile) continue;
      buildFile.settings = buildFile.settings || {};
      const attrs = buildFile.settings.ATTRIBUTES || [];
      if (!attrs.includes("RemoveHeadersOnCopy")) {
        buildFile.settings.ATTRIBUTES = [...attrs, "RemoveHeadersOnCopy"];
      }
    }
  }

  // Keep app target phase comments aligned with the section rename.
  const nativeTargets = project.pbxNativeTargetSection();
  for (const key of Object.keys(nativeTargets)) {
    if (key.endsWith("_comment")) continue;
    const target = nativeTargets[key];
    for (const phase of target.buildPhases || []) {
      if (phase.comment === "Copy Files") {
        phase.comment = "Embed Foundation Extensions";
      }
    }
  }
}

function updateExtensionBuildSettings(project, targetUuid, options) {
  const {
    bundleIdentifier,
    marketingVersion,
    currentProjectVersion,
  } = options;
  const configListId =
    project.pbxNativeTargetSection()[targetUuid].buildConfigurationList;
  const configList =
    project.pbxXCConfigurationList()[configListId];
  const buildConfigs = project.pbxXCBuildConfigurationSection();

  for (const entry of configList.buildConfigurations) {
    const config = buildConfigs[entry.value];
    if (!config || !config.buildSettings) continue;
    config.buildSettings.INFOPLIST_FILE = `${EXTENSION_NAME}/Info.plist`;
    config.buildSettings.GENERATE_INFOPLIST_FILE = "NO";
    config.buildSettings.CODE_SIGN_ENTITLEMENTS = `${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements`;
    config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = "16.2";
    config.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
    config.buildSettings.SWIFT_VERSION = "5.0";
    config.buildSettings.SKIP_INSTALL = "YES";
    config.buildSettings.APPLICATION_EXTENSION_API_ONLY = "YES";
    config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleIdentifier}"`;
    config.buildSettings.PRODUCT_NAME = `"${EXTENSION_NAME}"`;
    config.buildSettings.MARKETING_VERSION = marketingVersion;
    config.buildSettings.CURRENT_PROJECT_VERSION = currentProjectVersion;
    config.buildSettings.LD_RUNPATH_SEARCH_PATHS =
      '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
    // Drop incorrect default plist path from xcode.addTarget.
    delete config.buildSettings.GCC_PREPROCESSOR_DEFINITIONS;
  }
}

/**
 * Ensure the Widget Extension target exists and is embedded.
 * @returns {boolean} true when a new target was created
 */
function ensureWorkoutLiveActivityTarget(project, options) {
  const {
    bundleIdentifier,
    marketingVersion = "1.0.0",
    currentProjectVersion = "1",
    appFolderName = "EvoFit",
  } = options;

  const appTarget = findApplicationTarget(project);
  if (!appTarget) {
    throw new Error(
      "[withWorkoutLiveActivity] Could not find the iOS application target"
    );
  }

  ensureDependencySections(project);

  // Always keep the RN ActivityKit bridge on the app target (prebuild --clean).
  const attributesRef = ensureAppBridgeSources(
    project,
    appTarget.uuid,
    appFolderName
  );

  const existing = findNativeTargetByName(project, EXTENSION_NAME);
  if (existing) {
    updateExtensionBuildSettings(project, existing.uuid, {
      bundleIdentifier,
      marketingVersion,
      currentProjectVersion,
    });
    ensureAppDependsOnExtension(project, appTarget.uuid, existing.uuid);
    ensureEmbedPhaseSettings(project);
    if (attributesRef) {
      ensureBuildFileForTargetSources(
        project,
        attributesRef,
        "WorkoutLiveAttributes.swift",
        existing.uuid
      );
    }
    return false;
  }

  const extensionTarget = project.addTarget(
    EXTENSION_NAME,
    "app_extension",
    EXTENSION_NAME,
    bundleIdentifier
  );

  // addTargetDependency is a no-op unless the sections exist beforehand.
  ensureAppDependsOnExtension(project, appTarget.uuid, extensionTarget.uuid);
  ensureEmbedPhaseSettings(project);

  project.addBuildPhase([], "PBXSourcesBuildPhase", "Sources", extensionTarget.uuid);
  project.addBuildPhase(
    [],
    "PBXFrameworksBuildPhase",
    "Frameworks",
    extensionTarget.uuid
  );

  updateExtensionBuildSettings(project, extensionTarget.uuid, {
    bundleIdentifier,
    marketingVersion,
    currentProjectVersion,
  });

  // Group has no path; file refs use full ios/-relative paths (matches EvoFit style).
  const groupKey = project.pbxCreateGroup(EXTENSION_NAME, undefined);

  const widgetPath = `${EXTENSION_NAME}/WorkoutLiveActivityWidget.swift`;
  const intentsPath = `${EXTENSION_NAME}/WorkoutLiveIntents.swift`;
  const plistPath = `${EXTENSION_NAME}/Info.plist`;
  const entitlementsPath = `${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements`;

  project.addFile(plistPath, groupKey);
  project.addFile(entitlementsPath, groupKey);
  project.addSourceFile(widgetPath, { target: extensionTarget.uuid }, groupKey);
  project.addSourceFile(intentsPath, { target: extensionTarget.uuid }, groupKey);

  if (attributesRef) {
    ensureBuildFileForTargetSources(
      project,
      attributesRef,
      "WorkoutLiveAttributes.swift",
      extensionTarget.uuid
    );
  }

  // Ensure extension group is under the root project group.
  const mainGroupId = project.getFirstProject().firstProject.mainGroup;
  const mainGroup = project.getPBXGroupByKey(mainGroupId);
  if (
    mainGroup &&
    !mainGroup.children.some((child) => child.value === groupKey)
  ) {
    mainGroup.children.push({
      value: groupKey,
      comment: EXTENSION_NAME,
    });
  }

  return true;
}

function syncNativeSources(projectRoot) {
  const pluginRoot = path.join(__dirname, "native", "ios");
  const iosRoot = path.join(projectRoot, "ios");
  const appNameGuess = fs
    .readdirSync(iosRoot, { withFileTypes: true })
    .find(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(iosRoot, entry.name, "AppDelegate.swift"))
    )?.name;

  if (!appNameGuess) {
    throw new Error(
      "[withWorkoutLiveActivity] Could not locate AppDelegate.swift under ios/"
    );
  }

  copyDirContents(
    path.join(pluginRoot, "WorkoutLive"),
    path.join(iosRoot, appNameGuess, "WorkoutLive")
  );
  copyDirContents(
    path.join(pluginRoot, "WorkoutLiveActivity"),
    path.join(iosRoot, "WorkoutLiveActivity")
  );

  // Keep a single attributes source of truth under the app target folder.
  const dupAttributes = path.join(
    iosRoot,
    "WorkoutLiveActivity",
    "WorkoutLiveAttributes.swift"
  );
  if (fs.existsSync(dupAttributes)) {
    fs.unlinkSync(dupAttributes);
  }
}

module.exports = {
  EXTENSION_NAME,
  APP_GROUP,
  ensureWorkoutLiveActivityTarget,
  syncNativeSources,
  findNativeTargetByName,
  detectAppFolderName,
  ensureAppBridgeSources,
};
