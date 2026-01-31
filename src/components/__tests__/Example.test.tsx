import React from "react";
import { render } from "@testing-library/react-native";
import { Text, View } from "react-native";

const ExampleComponent = () => (
  <View>
    <Text>Hello Testing</Text>
  </View>
);

describe("ExampleComponent", () => {
  it("renders correctly", () => {
    const { getByText } = render(<ExampleComponent />);
    expect(getByText("Hello Testing")).toBeTruthy();
  });
});
