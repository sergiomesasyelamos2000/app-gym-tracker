const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

let config = getDefaultConfig(__dirname);

// Aplica configuración de NativeWind
config = withNativeWind(config, { input: "./global.css" });

// Envuelve también con la configuración de Reanimated
module.exports = wrapWithReanimatedMetroConfig(config);