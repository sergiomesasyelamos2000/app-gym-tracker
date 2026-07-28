import { useEffect, useState } from "react";
import { Keyboard, KeyboardEvent, Platform } from "react-native";

type Listener = () => void;

let restToastKeyboardActive = false;
const restToastKeyboardListeners = new Set<Listener>();

/**
 * When rest toast is visible above an open keyboard, hide the floating
 * KeyboardDismissButton to avoid overlapping controls.
 */
export function setRestToastKeyboardActive(active: boolean): void {
  if (restToastKeyboardActive === active) return;
  restToastKeyboardActive = active;
  restToastKeyboardListeners.forEach((listener) => listener());
}

export function getRestToastKeyboardActive(): boolean {
  return restToastKeyboardActive;
}

export function subscribeRestToastKeyboardActive(listener: Listener): () => void {
  restToastKeyboardListeners.add(listener);
  return () => {
    restToastKeyboardListeners.delete(listener);
  };
}

export function useRestToastKeyboardActive(): boolean {
  const [active, setActive] = useState(restToastKeyboardActive);

  useEffect(() => {
    return subscribeRestToastKeyboardActive(() => {
      setActive(getRestToastKeyboardActive());
    });
  }, []);

  return active;
}

/**
 * Shared keyboard height for anchoring UI above the soft keyboard (Hevy-like).
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    };

    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    const metricsHeight = Keyboard.metrics?.()?.height ?? 0;
    if (metricsHeight > 0) {
      setKeyboardHeight(metricsHeight);
    }

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
}
