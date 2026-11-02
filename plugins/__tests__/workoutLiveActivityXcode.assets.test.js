/**
 * @jest-environment node
 */
const path = require("path");
const xcode = require("xcode");
const {
  EXTENSION_NAME,
  ensureExtensionAssetCatalog,
  findNativeTargetByName,
} = require("../workoutLiveActivityXcode");

const PBX_PATH = path.join(
  __dirname,
  "..",
  "..",
  "ios",
  "EvoFit.xcodeproj",
  "project.pbxproj"
);
const CATALOG_PATH = `${EXTENSION_NAME}/Assets.xcassets`;

function loadProject() {
  const project = xcode.project(PBX_PATH);
  project.parseSync();
  return project;
}

function catalogRefs(project) {
  const refs = project.pbxFileReferenceSection();
  return Object.keys(refs).filter(
    (key) =>
      !key.endsWith("_comment") &&
      (refs[key].path || "").replace(/"/g, "") === CATALOG_PATH
  );
}

function resourcesPhaseOf(project, targetUuid) {
  return project.buildPhaseObject(
    "PBXResourcesBuildPhase",
    "Resources",
    targetUuid
  );
}

describe("ensureExtensionAssetCatalog", () => {
  it("adds the asset catalog to the extension Resources phase", () => {
    const project = loadProject();
    const extension = findNativeTargetByName(project, EXTENSION_NAME);

    ensureExtensionAssetCatalog(project, extension.uuid);

    const refs = catalogRefs(project);
    expect(refs).toHaveLength(1);
    expect(project.pbxFileReferenceSection()[refs[0]].lastKnownFileType).toBe(
      "folder.assetcatalog"
    );

    const phase = resourcesPhaseOf(project, extension.uuid);
    expect(phase).toBeTruthy();
    const buildFiles = project.pbxBuildFileSection();
    const inPhase = phase.files.filter(
      (entry) => buildFiles[entry.value]?.fileRef === refs[0]
    );
    expect(inPhase).toHaveLength(1);
  });

  it("is idempotent", () => {
    const project = loadProject();
    const extension = findNativeTargetByName(project, EXTENSION_NAME);

    ensureExtensionAssetCatalog(project, extension.uuid);
    ensureExtensionAssetCatalog(project, extension.uuid);

    expect(catalogRefs(project)).toHaveLength(1);
    const extensionTarget = project.pbxNativeTargetSection()[extension.uuid];
    const resourcePhases = extensionTarget.buildPhases.filter(
      (phase) => phase.comment === "Resources"
    );
    expect(resourcePhases).toHaveLength(1);
    expect(resourcesPhaseOf(project, extension.uuid).files).toHaveLength(1);
  });

  it("does not touch the app target Resources phase", () => {
    const project = loadProject();
    const extension = findNativeTargetByName(project, EXTENSION_NAME);
    const appUuid = project.getFirstTarget().uuid;
    const before = resourcesPhaseOf(project, appUuid).files.length;

    ensureExtensionAssetCatalog(project, extension.uuid);

    expect(resourcesPhaseOf(project, appUuid).files).toHaveLength(before);
  });
});
