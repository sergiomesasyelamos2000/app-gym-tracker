const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const {
  wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

const path = require("path");

// Define workspace root and shared libs path
const workspaceRoot = path.resolve(__dirname, "..");
const projectRoot = __dirname;
const sharedLibsDir = path.resolve(
  workspaceRoot,
  "api-gym-tracker/libs/entity-data-models/src",
);

let config = getDefaultConfig(__dirname);

// Add the extra folders to watch
config.watchFolders = [workspaceRoot];

// Configure resolver to find the shared module
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@entity-data-models": sharedLibsDir,
};

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Aplica configuración de NativeWind
config = withNativeWind(config, { input: "./global.css" });

// Envuelve también con la configuración de Reanimated
module.exports = wrapWithReanimatedMetroConfig(config);
