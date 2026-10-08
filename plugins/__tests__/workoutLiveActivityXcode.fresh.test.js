const fs = require("fs");
const path = require("path");
const xcode = require("xcode");
const {
  detectAppFolderName,
  ensureWorkoutLiveActivityTarget,
  findNativeTargetByName,
  syncNativeSources,
} = require("../workoutLiveActivityXcode");

const MINIMAL_PBX = `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 54;
	objects = {

/* Begin PBXBuildFile section */
		F11748422D0307B40044C1D9 /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = F11748412D0307B40044C1D9 /* AppDelegate.swift */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		13B07F961A680F5B00A75B9A /* EvoFit.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = EvoFit.app; sourceTree = BUILT_PRODUCTS_DIR; };
		F11748412D0307B40044C1D9 /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = AppDelegate.swift; path = EvoFit/AppDelegate.swift; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		13B07F8C1A680F5B00A75B9A /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		13B07FAE1A68108700A75B9A /* EvoFit */ = {
			isa = PBXGroup;
			children = (
				F11748412D0307B40044C1D9 /* AppDelegate.swift */,
			);
			name = EvoFit;
			sourceTree = "<group>";
		};
		83CBB9F61A601CBA00E9B192 = {
			isa = PBXGroup;
			children = (
				13B07FAE1A68108700A75B9A /* EvoFit */,
				83CBBA001A601CBA00E9B192 /* Products */,
			);
			sourceTree = "<group>";
		};
		83CBBA001A601CBA00E9B192 /* Products */ = {
			isa = PBXGroup;
			children = (
				13B07F961A680F5B00A75B9A /* EvoFit.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		13B07F861A680F5B00A75B9A /* EvoFit */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 13B07F931A680F5B00A75B9A /* Build configuration list for PBXNativeTarget "EvoFit" */;
			buildPhases = (
				13B07F871A680F5B00A75B9A /* Sources */,
				13B07F8C1A680F5B00A75B9A /* Frameworks */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = EvoFit;
			productName = EvoFit;
			productReference = 13B07F961A680F5B00A75B9A /* EvoFit.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		83CBB9F71A601CBA00E9B192 /* Project object */ = {
			isa = PBXProject;
			attributes = {
				LastUpgradeCheck = 1130;
			};
			buildConfigurationList = 83CBB9FA1A601CBA00E9B192 /* Build configuration list for PBXProject "EvoFit" */;
			compatibilityVersion = "Xcode 3.2";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = 83CBB9F61A601CBA00E9B192;
			productRefGroup = 83CBBA001A601CBA00E9B192 /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				13B07F861A680F5B00A75B9A /* EvoFit */,
			);
		};
/* End PBXProject section */

/* Begin PBXSourcesBuildPhase section */
		13B07F871A680F5B00A75B9A /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				F11748422D0307B40044C1D9 /* AppDelegate.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		13B07F941A680F5B00A75B9A /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				PRODUCT_BUNDLE_IDENTIFIER = "com.smy862.app";
				PRODUCT_NAME = EvoFit;
			};
			name = Debug;
		};
		13B07F951A680F5B00A75B9A /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				PRODUCT_BUNDLE_IDENTIFIER = "com.smy862.app";
				PRODUCT_NAME = EvoFit;
			};
			name = Release;
		};
		83CBBA201A601CBA00E9B192 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
			};
			name = Debug;
		};
		83CBBA211A601CBA00E9B192 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		13B07F931A680F5B00A75B9A /* Build configuration list for PBXNativeTarget "EvoFit" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				13B07F941A680F5B00A75B9A /* Debug */,
				13B07F951A680F5B00A75B9A /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		83CBB9FA1A601CBA00E9B192 /* Build configuration list for PBXProject "EvoFit" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				83CBBA201A601CBA00E9B192 /* Debug */,
				83CBBA211A601CBA00E9B192 /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = 83CBB9F71A601CBA00E9B192 /* Project object */;
}
`;

describe("workoutLiveActivityXcode fresh prebuild", () => {
  const tmp = path.join(__dirname, "..", ".tmp-prebuild-sim");

  afterAll(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("creates extension + app bridge without doubled attributes path", () => {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(path.join(tmp, "ios", "EvoFit.xcodeproj"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "ios", "EvoFit"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "ios", "EvoFit", "AppDelegate.swift"), "//stub");
    fs.writeFileSync(
      path.join(tmp, "ios", "EvoFit.xcodeproj", "project.pbxproj"),
      MINIMAL_PBX
    );

    syncNativeSources(tmp);
    const pbxPath = path.join(tmp, "ios", "EvoFit.xcodeproj", "project.pbxproj");
    const project = xcode.project(pbxPath);
    project.parseSync();

    const created = ensureWorkoutLiveActivityTarget(project, {
      bundleIdentifier: "com.smy862.app.WorkoutLiveActivity",
      marketingVersion: "1.0.1",
      currentProjectVersion: "71",
      appFolderName: detectAppFolderName(tmp),
    });

    expect(created).toBe(true);
    expect(findNativeTargetByName(project, "WorkoutLiveActivity")).toBeTruthy();

    const workoutLiveGroup = Object.values(
      project.hash.project.objects.PBXGroup
    ).find((group) => group?.name && String(group.name).replace(/"/g, "") === "WorkoutLive");
    expect(workoutLiveGroup.path).toBeUndefined();

    const attributesRef = Object.values(project.pbxFileReferenceSection()).find(
      (ref) => ref?.path && String(ref.path).includes("WorkoutLiveAttributes")
    );
    const attributesPath = String(attributesRef.path).replace(/^"|"$/g, "");
    expect(attributesPath).toBe("EvoFit/WorkoutLive/WorkoutLiveAttributes.swift");
    expect(attributesPath).not.toContain("EvoFit/WorkoutLive/EvoFit");

    const appSources = project.hash.project.objects.PBXSourcesBuildPhase[
      "13B07F871A680F5B00A75B9A"
    ].files.map((file) => file.comment);
    expect(appSources).toEqual(
      expect.arrayContaining([
        "WorkoutLiveAttributes.swift in Sources",
        "RestTimerLiveActivity.swift in Sources",
        "RestTimerLiveActivityModule.swift in Sources",
        "RestTimerLiveActivityBridge.m in Sources",
      ])
    );

    const extension = findNativeTargetByName(project, "WorkoutLiveActivity");
    const sourcesPhaseId = extension.target.buildPhases.find(
      (phase) => phase.comment === "Sources"
    ).value;
    const extensionSources = project.hash.project.objects.PBXSourcesBuildPhase[
      sourcesPhaseId
    ].files.map((file) => file.comment);
    expect(extensionSources).toEqual(
      expect.arrayContaining([
        "WorkoutLiveActivityWidget.swift in Sources",
        "WorkoutLiveIntents.swift in Sources",
        "WorkoutLiveAttributes.swift in Sources",
      ])
    );

    expect(
      project.pbxNativeTargetSection()["13B07F861A680F5B00A75B9A"].dependencies
        .length
    ).toBeGreaterThan(0);

    const again = ensureWorkoutLiveActivityTarget(project, {
      bundleIdentifier: "com.smy862.app.WorkoutLiveActivity",
      marketingVersion: "1.0.1",
      currentProjectVersion: "71",
      appFolderName: "EvoFit",
    });
    expect(again).toBe(false);
  });
});
