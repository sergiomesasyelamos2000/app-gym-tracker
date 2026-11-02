import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import {
  ProductRemoteImage,
  PRODUCT_IMAGE_LOAD_TIMEOUT_MS,
} from "../ProductRemoteImage";

const mockTheme = {
  backgroundSecondary: "#EEF2F7",
  primary: "#6C3BAA",
};

jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: mockTheme, isDark: false }),
}));

describe("ProductRemoteImage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows fallback immediately when uri is missing", () => {
    const { getByTestId, queryByTestId } = render(
      <ProductRemoteImage uri={null} style={{ width: 80, height: 80 }} />
    );

    expect(getByTestId("product-remote-image-fallback")).toBeTruthy();
    expect(queryByTestId("product-remote-image-remote")).toBeNull();
  });

  it("shows fallback when uri is blank", () => {
    const { getByTestId } = render(
      <ProductRemoteImage uri="   " style={{ width: 80, height: 80 }} />
    );

    expect(getByTestId("product-remote-image-fallback")).toBeTruthy();
  });

  it("shows skeleton while remote image is loading", () => {
    const { getByLabelText, getByTestId, queryByTestId } = render(
      <ProductRemoteImage
        uri="https://example.com/banana.jpg"
        style={{ width: 80, height: 80 }}
      />
    );

    expect(getByLabelText("Cargando imagen del producto")).toBeTruthy();
    expect(getByTestId("product-remote-image-remote")).toBeTruthy();
    expect(queryByTestId("product-remote-image-fallback")).toBeNull();
  });

  it("hides skeleton after remote image loads", () => {
    const { getByTestId, queryByLabelText, queryByTestId } = render(
      <ProductRemoteImage
        uri="https://example.com/banana.jpg"
        style={{ width: 80, height: 80 }}
      />
    );

    fireEvent(getByTestId("product-remote-image-remote"), "load");

    expect(queryByLabelText("Cargando imagen del producto")).toBeNull();
    expect(queryByTestId("product-remote-image-fallback")).toBeNull();
    expect(getByTestId("product-remote-image-remote")).toBeTruthy();
  });

  it("falls back to not-image when remote image errors", () => {
    const { getByTestId, queryByTestId } = render(
      <ProductRemoteImage
        uri="https://example.com/broken.jpg"
        style={{ width: 80, height: 80 }}
      />
    );

    fireEvent(getByTestId("product-remote-image-remote"), "error");

    expect(getByTestId("product-remote-image-fallback")).toBeTruthy();
    expect(queryByTestId("product-remote-image-remote")).toBeNull();
  });

  it("falls back to not-image after load timeout", () => {
    const { getByTestId, queryByTestId } = render(
      <ProductRemoteImage
        uri="https://example.com/slow.jpg"
        style={{ width: 80, height: 80 }}
      />
    );

    act(() => {
      jest.advanceTimersByTime(PRODUCT_IMAGE_LOAD_TIMEOUT_MS);
    });

    expect(getByTestId("product-remote-image-fallback")).toBeTruthy();
    expect(queryByTestId("product-remote-image-remote")).toBeNull();
  });
});
