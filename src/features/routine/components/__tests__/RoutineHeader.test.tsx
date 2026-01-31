import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { RoutineHeader } from "../RoutineHeader";

// Mock ThemeContext
jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "blue",
      text: "black",
      card: "white",
      border: "gray",
    },
  }),
}));

describe("RoutineHeader", () => {
  const mockOnStart = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnChangeTitle = jest.fn();

  it("renders input when creating new routine (not readonly)", () => {
    const { getByPlaceholderText } = render(
      <RoutineHeader
        routineTitle=""
        started={false}
        onChangeTitle={mockOnChangeTitle}
      />,
    );
    const input = getByPlaceholderText("Nombre de la rutina");
    fireEvent.changeText(input, "New Routine");
    expect(mockOnChangeTitle).toHaveBeenCalledWith("New Routine");
  });

  it("renders title and actions when existing routine (readonly)", () => {
    const { getByText } = render(
      <RoutineHeader
        routineTitle="My Routine"
        started={false}
        routineId="123"
        readonly={true}
        onStart={mockOnStart}
        onEdit={mockOnEdit}
      />,
    );

    expect(getByText("My Routine")).toBeTruthy();
    expect(getByText("Iniciar")).toBeTruthy();

    fireEvent.press(getByText("Editar"));
    expect(mockOnEdit).toHaveBeenCalled();
  });

  it("renders nothing if started", () => {
    const { toJSON } = render(
      <RoutineHeader routineTitle="Title" started={true} />,
    );
    expect(toJSON()).toBeNull();
  });
});
