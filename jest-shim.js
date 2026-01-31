// Shim to mock problematic Expo internals before they cause runtime errors
jest.mock(
  "expo",
  () => {
    return {
      registerRootComponent: jest.fn(),
    };
  },
  { virtual: true },
);

jest.mock("expo/src/winter/runtime.native.ts", () => ({}), { virtual: true });
jest.mock("expo/src/winter/installGlobal.ts", () => ({}), { virtual: true });
jest.mock("expo/src/winter/installGlobal", () => ({}), { virtual: true });
