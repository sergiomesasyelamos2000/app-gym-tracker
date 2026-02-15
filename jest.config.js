module.exports = {
  preset: "jest-expo",
  rootDir: ".",
  setupFiles: ["./jest-shim.js"],
  setupFilesAfterEnv: ["./jest-setup.ts"],
  transformIgnorePatterns: [
    // "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-modules-core|expo-.*|react-native-markdown-display|react-native-vector-icons|lucide-react-native|@react-native-async-storage|@reduxjs|zustand|immer|axios)",
  ],
  moduleNameMapper: {
    "^expo$": "<rootDir>/src/__mocks__/expo.js",
    "expo/src/Expo.fx": "<rootDir>/src/__mocks__/empty.js",
    "expo/src/winter": "<rootDir>/src/__mocks__/empty.js",
    "expo/src/winter/runtime.native.ts": "<rootDir>/src/__mocks__/empty.js",
    "expo/src/winter/installGlobal.ts": "<rootDir>/src/__mocks__/empty.js",
    "expo/src/winter/installGlobal": "<rootDir>/src/__mocks__/empty.js",
  },
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/types.ts",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "mjs"],
};
