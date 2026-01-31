import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Text, View, Button, TextInput } from "react-native";

const InteractiveComponent = ({
  onSubmit,
}: {
  onSubmit: (text: string) => void;
}) => {
  const [text, setText] = React.useState("");

  return (
    <View>
      <TextInput
        testID="input"
        value={text}
        onChangeText={setText}
        placeholder="Enter text"
      />
      <Button title="Submit" onPress={() => onSubmit(text)} />
    </View>
  );
};

describe("InteractiveComponent", () => {
  it("updates text and calls submit", () => {
    const mockSubmit = jest.fn();
    const { getByTestId, getByText } = render(
      <InteractiveComponent onSubmit={mockSubmit} />,
    );

    // Interaction with Input
    const input = getByTestId("input");
    fireEvent.changeText(input, "Hello World");

    // Interaction with Button
    fireEvent.press(getByText("Submit"));

    // Assertions
    expect(mockSubmit).toHaveBeenCalledWith("Hello World");
  });
});
