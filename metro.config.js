const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Polyfill for Node.js 18 compatibility
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return this.slice().reverse();
  };
}

// Define workspace root
const workspaceRoot = path.resolve(__dirname, "..");
const projectRoot = __dirname;

// Get default config
const config = getDefaultConfig(projectRoot);

// Add the extra folders to watch
config.watchFolders = [workspaceRoot];

// Configure resolver to find the shared module
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    // Mock class-validator and class-transformer for React Native
    "class-validator": path.resolve(projectRoot, "src/mocks/empty-module.js"),
    "class-transformer": path.resolve(projectRoot, "src/mocks/empty-module.js"),
  },
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
  ],
  blockList: [
    // Exclude all node_modules from the backend
    /api-gym-tracker\/node_modules\/.*/,
    // Exclude NestJS Swagger and other problematic packages
    /@nestjs\/.*/,
    // Exclude TypeORM
    /typeorm\/.*/,
  ],
};

// Apply NativeWind and Reanimated configs
module.exports = withNativeWind(config, { input: "./global.css" });
