import "@testing-library/jest-native/extend-expect";

// Mock React Native Reanimated
require("react-native-reanimated/lib/module/jestUtils").setUpTests();

// Mock React Navigation
jest.mock("@react-navigation/native", () => {
  const actualNav = jest.requireActual("@react-navigation/native");
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useIsFocused: () => true,
  };
});

// Mock SafeAreaContext
jest.mock("react-native-safe-area-context", () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn(
      ({ children }: { children: React.ReactNode }) => children,
    ),
    SafeAreaView: jest.fn(
      ({ children }: { children: React.ReactNode }) => children,
    ),
    useSafeAreaInsets: jest.fn(() => inset),
  };
});

// Mock Expo Modules
jest.mock("expo-font", () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(),
}));

jest.mock("expo-asset", () => ({
  Asset: {
    loadAsync: jest.fn(),
  },
}));

jest.mock("expo-constants", () => ({
  manifest: {
    extra: {},
  },
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

// Mock Vector Icons
jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => "Icon");
jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: View,
    MaterialCommunityIcons: View,
    FontAwesome: View,
  };
});

// Mock NativeWind (if used via babel plugin it usually works, but sometimes needs mocks for className)
// Assuming standard usage

// Mock Markdown
jest.mock("react-native-markdown-display", () =>
  require("./src/mocks/MarkdownDisplayMock"),
);

// Mock react-native-uuid
jest.mock("react-native-uuid", () => ({
  v4: () => "test-uuid-v4",
}));

// Mock Lucide Icons
jest.mock(
  "lucide-react-native",
  () =>
    new Proxy(
      {},
      {
        get: () => "Icon",
      },
    ),
);

// Mock React Native Modal
// Avoid using require("react") inside factory to prevent babel plugin conflicts
jest.mock(
  "react-native-modal",
  () => (props: any) => (props.isVisible ? props.children : null),
);

// Mock React Native Paper Portal
jest.mock("react-native-paper", () => ({
  Portal: (props: any) => props.children,
}));

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  mergeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  multiMerge: jest.fn(),
};
jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
