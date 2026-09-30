import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ROW_ENTER_MS,
  ROW_ENTER_STAGGER_MAX_MS,
  ROW_ENTER_STAGGER_MS,
} from "./useListSwapAnimation";

type Props = {
  allowEntering: boolean;
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Applies FadeInDown only inside the post-swap gate window so FlatList
 * recycling does not re-trigger entering on scroll.
 */
export function AnimatedListItem({
  allowEntering,
  index = 0,
  style,
  children,
}: Props) {
  if (!allowEntering) {
    return <View style={style}>{children}</View>;
  }

  const delay = Math.min(index * ROW_ENTER_STAGGER_MS, ROW_ENTER_STAGGER_MAX_MS);

  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(ROW_ENTER_MS).delay(delay)}
    >
      {children}
    </Animated.View>
  );
}
