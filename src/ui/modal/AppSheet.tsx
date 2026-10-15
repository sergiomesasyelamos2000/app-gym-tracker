import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { getSheetChrome } from "./modalStyles";
import {
  MODAL_SHEET_CLOSE_MS,
  MODAL_SHEET_MAX_HEIGHT_RATIO,
  MODAL_SHEET_MIN_BOTTOM_PADDING,
  MODAL_SHEET_OPEN_MS,
  MODAL_SHEET_SLIDE_DISTANCE,
  MODAL_SWIPE_DISMISS_THRESHOLD,
} from "./modalTokens";
import type { AppSheetProps, ModalDismissReason } from "./types";

const { height: windowHeight } = Dimensions.get("window");

export function AppSheet({
  visible,
  onDismiss,
  onDismissed,
  children,
  title,
  showHandle = true,
  dismissOnBackdrop = true,
  dismissOnBack = true,
  swipeToDismiss = true,
  avoidKeyboard = true,
  maxHeightRatio = MODAL_SHEET_MAX_HEIGHT_RATIO,
  scrollable = false,
  contentStyle,
  testID,
}: AppSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const chrome = useMemo(() => getSheetChrome(theme), [theme]);

  /** Keep RN Modal mounted until close animation finishes (avoids flash). */
  const [presented, setPresented] = useState(visible);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(
    new Animated.Value(MODAL_SHEET_SLIDE_DISTANCE)
  ).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  const onDismissedRef = useRef(onDismissed);
  const dismissOnBackdropRef = useRef(dismissOnBackdrop);
  const swipeToDismissRef = useRef(swipeToDismiss);

  onDismissRef.current = onDismiss;
  onDismissedRef.current = onDismissed;
  dismissOnBackdropRef.current = dismissOnBackdrop;
  swipeToDismissRef.current = swipeToDismiss;

  const dismiss = (reason: ModalDismissReason) => {
    if (closingRef.current) return;
    closingRef.current = true;
    onDismissRef.current(reason);
  };

  useEffect(() => {
    if (visible) {
      setPresented(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!presented) return;

    let animation: Animated.CompositeAnimation | undefined;

    if (visible) {
      closingRef.current = false;
      overlayOpacity.setValue(0);
      translateY.setValue(MODAL_SHEET_SLIDE_DISTANCE);
      dragY.setValue(0);
      animation = Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: MODAL_SHEET_OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: MODAL_SHEET_OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      animation.start();
    } else {
      animation = Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: MODAL_SHEET_CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: MODAL_SHEET_SLIDE_DISTANCE,
          duration: MODAL_SHEET_CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      animation.start(({ finished }) => {
        if (!finished) return;
        setPresented(false);
        onDismissedRef.current?.();
      });
    }

    return () => {
      animation?.stop();
    };
  }, [visible, presented, overlayOpacity, translateY, dragY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => swipeToDismissRef.current,
        onMoveShouldSetPanResponder: (_, gesture) =>
          swipeToDismissRef.current && gesture.dy > 4,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) dragY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > MODAL_SWIPE_DISMISS_THRESHOLD || gesture.vy > 1.1) {
            if (closingRef.current) return;
            closingRef.current = true;
            onDismissRef.current("swipe");
            return;
          }
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    [dragY]
  );

  const maxHeight =
    (windowHeight - insets.top) * Math.min(Math.max(maxHeightRatio, 0.4), 0.95);
  const bottomPad = Math.max(insets.bottom, MODAL_SHEET_MIN_BOTTOM_PADDING);

  const body = scrollable ? (
    <ScrollView
      bounces={false}
      keyboardShouldPersistTaps="handled"
      style={{ maxHeight: maxHeight - 72 }}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  const sheet = (
    <Animated.View
      style={[
        chrome.sheet,
        {
          maxHeight,
          paddingBottom: bottomPad,
          transform: [
            {
              translateY: Animated.add(translateY, dragY),
            },
          ],
        },
        contentStyle,
      ]}
      accessibilityViewIsModal
    >
      <View {...(swipeToDismiss ? panResponder.panHandlers : {})}>
        {showHandle ? <View style={chrome.handle} /> : null}
        {title ? (
          <View style={chrome.headerRow}>
            <Text style={[chrome.title, { marginBottom: 0 }]} numberOfLines={1}>
              {title}
            </Text>
            <Pressable
              style={chrome.closeHit}
              onPress={() => dismiss("close")}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
        ) : null}
      </View>
      {body}
    </Animated.View>
  );

  const content = (
    <View style={{ flex: 1 }}>
      <Animated.View style={[chrome.overlay, { opacity: overlayOpacity }]}>
        <Pressable
          style={{ flex: 1 }}
          testID={testID ? `${testID}-overlay` : undefined}
          onPress={() => {
            if (dismissOnBackdropRef.current) dismiss("backdrop");
          }}
        />
      </Animated.View>
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
      >
        {sheet}
      </View>
    </View>
  );

  if (!presented) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (dismissOnBack) dismiss("back");
      }}
      testID={testID}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  );
}
