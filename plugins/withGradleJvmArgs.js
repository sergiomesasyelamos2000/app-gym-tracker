const { withGradleProperties } = require("expo/config-plugins");

/** Heap for D8/R8 mergeDexRelease on EAS (default 2g OOMs on this app). */
const JVMARGS =
  "-Xmx6g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8";

/**
 * Ensures org.gradle.jvmargs survives `expo prebuild --clean` (production profile).
 */
function withGradleJvmArgs(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults.filter(
      (item) => !(item.type === "property" && item.key === "org.gradle.jvmargs"),
    );
    props.push({
      type: "property",
      key: "org.gradle.jvmargs",
      value: JVMARGS,
    });
    cfg.modResults = props;
    return cfg;
  });
}

module.exports = withGradleJvmArgs;
