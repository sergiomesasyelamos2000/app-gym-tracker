import React from "react";
import { Text, View } from "react-native";
import { render } from "@testing-library/react-native";
import { SkeletonRoot } from "../SkeletonRoot";

describe("SkeletonRoot", () => {
  it("does not render visible message text", () => {
    const { queryByText, getByLabelText } = render(
      <SkeletonRoot message="Cargando rutinas...">
        <View testID="bones" />
      </SkeletonRoot>
    );

    expect(queryByText("Cargando rutinas...")).toBeNull();
    expect(getByLabelText("Cargando rutinas...")).toBeTruthy();
  });

  it("marks the root as busy for assistive tech", () => {
    const { getByLabelText } = render(
      <SkeletonRoot message="Cargando rutinas...">
        <View />
      </SkeletonRoot>
    );

    expect(getByLabelText("Cargando rutinas...").props.accessibilityState).toEqual(
      { busy: true }
    );
  });

  it("falls back to Cargando when no message or label is provided", () => {
    const { getByLabelText } = render(
      <SkeletonRoot>
        <View />
      </SkeletonRoot>
    );

    expect(getByLabelText("Cargando")).toBeTruthy();
  });

  it("prefers accessibilityLabel over message", () => {
    const { getByLabelText, queryByLabelText } = render(
      <SkeletonRoot
        message="Cargando rutinas..."
        accessibilityLabel="Cargando lista"
      >
        <View />
      </SkeletonRoot>
    );

    expect(getByLabelText("Cargando lista")).toBeTruthy();
    expect(queryByLabelText("Cargando rutinas...")).toBeNull();
  });

  it("falls back to Cargando when message is blank", () => {
    const { getByLabelText } = render(
      <SkeletonRoot message="   ">
        <View />
      </SkeletonRoot>
    );

    expect(getByLabelText("Cargando")).toBeTruthy();
  });

  it("still renders children", () => {
    const { getByTestId, getByText } = render(
      <SkeletonRoot message="Cargando...">
        <View testID="child">
          <Text>placeholder</Text>
        </View>
      </SkeletonRoot>
    );

    expect(getByTestId("child")).toBeTruthy();
    expect(getByText("placeholder")).toBeTruthy();
  });
});
