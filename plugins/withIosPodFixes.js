const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PODFILE_MARKER = "# >>> withIosPodFixes";

const XCODE_ENV_CONTENTS = `# This \`.xcode.env\` file is versioned and is used to source the environment
# used when running script phases inside Xcode.
# To customize your local environment, you can create an \`.xcode.env.local\`
# file that is not versioned.

# NODE_BINARY variable contains the PATH to the node executable.
export NODE_BINARY=$(command -v node)

# Fallback paths if command -v node returns empty
if [ -z "$NODE_BINARY" ]; then
  export NODE_BINARY=/usr/local/bin/node
fi

if [ -z "$NODE_BINARY" ]; then
  export NODE_BINARY=/usr/bin/node
fi
`;

const PODFILE_POST_INSTALL = `
${PODFILE_MARKER}
  react_native_post_install(installer, :mac_catalyst_enabled => false)

  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
    end

    # Xcode 26: ZXingObjC (expo-camera barcode) can crash the build system.
    if target.name.start_with?('ZXingObjC')
      target.build_configurations.each do |config|
        config.build_settings['ONLY_ACTIVE_ARCH'] = 'NO'
        config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'NO'
        config.build_settings['GCC_OPTIMIZATION_LEVEL'] = '0'
        config.build_settings['SWIFT_COMPILATION_MODE'] = 'singlefile'
      end
    end
  end

  # Xcode 26: fmt consteval can break React Native pods.
  fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
  if File.exist?(fmt_base)
    content = File.read(fmt_base)
    unless content.include?('Xcode 26 workaround')
      patched = content.gsub(
        /^(#elif defined\\(__cpp_consteval\\)\\n#  define FMT_USE_CONSTEVAL) 1/,
        "// Xcode 26 workaround: disable consteval\\n\\\\1 0"
      )
      if patched != content
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
      end
    end
  end
# <<< withIosPodFixes
`;

function ensureModularHeaderPods(contents) {
  const pods = [
    `  pod 'GoogleUtilities', :modular_headers => true`,
    `  pod 'RecaptchaInterop', :modular_headers => true`,
    `  pod 'AppCheckCore', '11.2.0'`,
  ];

  let next = contents;
  for (const line of pods) {
    if (!next.includes(line)) {
      next = next.replace(
        /target ['"]EvoFit['"] do/,
        (match) => `${match}\n${line}`
      );
    }
  }
  return next;
}

function ensurePostInstallFixes(contents) {
  if (contents.includes(PODFILE_MARKER)) {
    return contents;
  }

  if (/post_install do \|installer\|[\s\S]*?\nend\s*$/m.test(contents)) {
    return contents.replace(
      /post_install do \|installer\|[\s\S]*?\nend\s*$/m,
      `post_install do |installer|${PODFILE_POST_INSTALL}\nend\n`
    );
  }

  return `${contents.trimEnd()}\n\npost_install do |installer|${PODFILE_POST_INSTALL}\nend\n`;
}

function writeUnixFile(filePath, contents) {
  fs.writeFileSync(
    filePath,
    contents.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  );
}

const withIosPodFixes = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const podfilePath = path.join(projectRoot, "Podfile");
      const xcodeEnvPath = path.join(projectRoot, ".xcode.env");

      // Always rewrite with LF — CRLF breaks bash on EAS/macOS:
      // ".xcode.env: line 5: : command not found"
      writeUnixFile(xcodeEnvPath, XCODE_ENV_CONTENTS);

      if (fs.existsSync(podfilePath)) {
        let contents = fs.readFileSync(podfilePath, "utf8");
        contents = ensureModularHeaderPods(contents);
        contents = ensurePostInstallFixes(contents);
        writeUnixFile(podfilePath, contents);
      }

      return config;
    },
  ]);
};

module.exports = withIosPodFixes;
