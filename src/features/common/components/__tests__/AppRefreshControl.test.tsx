import React from "react";
import { render } from "@testing-library/react-native";
import { AppRefreshControl } from "../AppRefreshControl";

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { RefreshControl } = require("react-native");
  return {
    RefreshControl: (props: Record<string, unknown>) => (
      <RefreshControl testID="gh-refresh-control" {...props} />
    ),
  };
});

jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#6C3BAA",
      card: "#FFFFFF",
    },
  }),
}));

describe("AppRefreshControl", () => {
  it("applies theme primary as iOS tintColor by default", () => {
    const { UNSAFE_getByType } = render(
      <AppRefreshControl refreshing={false} onRefresh={jest.fn()} />
    );
    const { RefreshControl } = require("react-native");
    const control = UNSAFE_getByType(RefreshControl);
    expect(control.props.tintColor).toBe("#6C3BAA");
    expect(control.props.colors).toEqual(["#6C3BAA"]);
  });

  it("allows tintColor override", () => {
    const { UNSAFE_getByType } = render(
      <AppRefreshControl
        refreshing={false}
        onRefresh={jest.fn()}
        tintColor="#FFFFFF"
      />
    );
    const { RefreshControl } = require("react-native");
    expect(UNSAFE_getByType(RefreshControl).props.tintColor).toBe("#FFFFFF");
  });
});
