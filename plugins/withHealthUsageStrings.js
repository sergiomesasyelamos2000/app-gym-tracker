const { withInfoPlist, createRunOncePlugin } = require("expo/config-plugins");

const SHARE_USAGE =
  "EvoFit lee de Apple Salud tu frecuencia cardiaca y energía activa durante el entrenamiento, y tu sueño y pasos para consejos de descanso.";
const UPDATE_USAGE =
  "EvoFit puede guardar en Apple Salud el entrenamiento completado y las calorías activas de la sesión, si activas esa opción.";

/**
 * Runs after `apple-health` so purpose strings always name sleep + steps,
 * and strips unused microphone purpose if another plugin re-adds it.
 */
function withHealthUsageStrings(config) {
  return withInfoPlist(config, (nextConfig) => {
    const infoPlist = nextConfig.modResults;
    infoPlist.NSHealthShareUsageDescription = SHARE_USAGE;
    infoPlist.NSHealthUpdateUsageDescription = UPDATE_USAGE;
    delete infoPlist.NSMicrophoneUsageDescription;
    return nextConfig;
  });
}

module.exports = createRunOncePlugin(
  withHealthUsageStrings,
  "withHealthUsageStrings",
  "1.0.0"
);
