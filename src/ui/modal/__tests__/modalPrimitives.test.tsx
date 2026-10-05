import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Modal, Text } from "react-native";
import { AppDialog } from "../AppDialog";
import { AppSheet } from "../AppSheet";
import { BlockingOverlay } from "../BlockingOverlay";
import { MODAL_DIALOG_RADIUS, MODAL_SHEET_RADIUS } from "../modalTokens";

jest.mock("../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#6C3BAA",
      onPrimary: "#fff",
      background: "#fff",
      card: "#fff",
      text: "#111",
      textSecondary: "#666",
      border: "#eee",
      overlay: "rgba(15, 23, 42, 0.45)",
      shadowColor: "#000",
    },
    isDark: false,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

describe("modal tokens", () => {
  it("uses recommended radii", () => {
    expect(MODAL_DIALOG_RADIUS).toBe(20);
    expect(MODAL_SHEET_RADIUS).toBe(24);
  });
});

describe("AppDialog", () => {
  it("does not dismiss on backdrop by default", () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <AppDialog visible onDismiss={onDismiss} testID="dialog">
        <Text>Body</Text>
      </AppDialog>
    );
    fireEvent.press(getByTestId("dialog-overlay"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("dismisses on backdrop when enabled", () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <AppDialog
        visible
        onDismiss={onDismiss}
        dismissOnBackdrop
        testID="dialog"
      >
        <Text>Body</Text>
      </AppDialog>
    );
    fireEvent.press(getByTestId("dialog-overlay"));
    expect(onDismiss).toHaveBeenCalledWith("backdrop");
  });

  it("dismisses on Android back by default and keeps statusBarTranslucent", () => {
    const onDismiss = jest.fn();
    const { UNSAFE_getByType } = render(
      <AppDialog visible onDismiss={onDismiss}>
        <Text>Body</Text>
      </AppDialog>
    );
    const modal = UNSAFE_getByType(Modal);
    expect(modal.props.statusBarTranslucent).toBe(true);
    modal.props.onRequestClose();
    expect(onDismiss).toHaveBeenCalledWith("back");
  });

  it("ignores Android back when dismissOnBack is false", () => {
    const onDismiss = jest.fn();
    const { UNSAFE_getByType } = render(
      <AppDialog visible onDismiss={onDismiss} dismissOnBack={false}>
        <Text>Body</Text>
      </AppDialog>
    );
    UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe("AppSheet", () => {
  it("dismisses on backdrop by default", () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <AppSheet visible onDismiss={onDismiss} testID="sheet">
        <Text>Options</Text>
      </AppSheet>
    );
    fireEvent.press(getByTestId("sheet-overlay"));
    expect(onDismiss).toHaveBeenCalledWith("backdrop");
  });

  it("dismisses on Android back by default and keeps statusBarTranslucent", () => {
    const onDismiss = jest.fn();
    const { UNSAFE_getByType } = render(
      <AppSheet visible onDismiss={onDismiss}>
        <Text>Options</Text>
      </AppSheet>
    );
    const modal = UNSAFE_getByType(Modal);
    expect(modal.props.statusBarTranslucent).toBe(true);
    modal.props.onRequestClose();
    expect(onDismiss).toHaveBeenCalledWith("back");
  });

  it("emits close reason from the header button", () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = render(
      <AppSheet visible onDismiss={onDismiss} title="Filtros">
        <Text>Options</Text>
      </AppSheet>
    );
    fireEvent.press(getByLabelText("Cerrar"));
    expect(onDismiss).toHaveBeenCalledWith("close");
  });

  it("does not call onDismissed when mounting closed", () => {
    jest.useFakeTimers();
    const onDismissed = jest.fn();
    render(
      <AppSheet visible={false} onDismiss={jest.fn()} onDismissed={onDismissed}>
        <Text>Options</Text>
      </AppSheet>
    );
    jest.advanceTimersByTime(500);
    expect(onDismissed).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("uses the latest onDismiss for backdrop after re-render", () => {
    const first = jest.fn();
    const second = jest.fn();
    const { getByTestId, rerender } = render(
      <AppSheet visible onDismiss={first} testID="sheet">
        <Text>Options</Text>
      </AppSheet>
    );
    rerender(
      <AppSheet visible onDismiss={second} testID="sheet">
        <Text>Options</Text>
      </AppSheet>
    );
    fireEvent.press(getByTestId("sheet-overlay"));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("backdrop");
  });
});

describe("BlockingOverlay", () => {
  it("does not dismiss on Android back", () => {
    const { UNSAFE_getByType } = render(
      <BlockingOverlay visible message="Guardando..." />
    );
    const modal = UNSAFE_getByType(Modal);
    expect(modal.props.statusBarTranslucent).toBe(true);
    expect(() => modal.props.onRequestClose()).not.toThrow();
  });

  it("renders the busy message", () => {
    const { getByText } = render(
      <BlockingOverlay visible message="Guardando rutina..." />
    );
    expect(getByText("Guardando rutina...")).toBeTruthy();
  });
});
