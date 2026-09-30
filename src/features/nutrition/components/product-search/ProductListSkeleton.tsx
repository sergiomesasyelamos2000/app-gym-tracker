import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  View,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { createProductSearchStyles } from "./createProductSearchStyles";

type Props = {
  count?: number;
  /** Show trailing circle stub (add/edit). Default true. */
  showTrailing?: boolean;
  /** Show brand/subtitle stub line. Default true. */
  showBrand?: boolean;
  /** Optional status line under the list of skeletons */
  message?: string;
};

function getSkeletonCount(height: number, fallback: number): number {
  const rowApprox = 110;
  const computed = Math.max(3, Math.min(7, Math.floor(height / rowApprox) - 1));
  return fallback > 0 ? Math.min(fallback, computed) : computed;
}

export function ProductListSkeleton({
  count,
  showTrailing = true,
  showBrand = true,
  message,
}: Props) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createProductSearchStyles(theme, isDark),
    [theme, isDark]
  );
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTinyScreen = width < 360;
  const imageSize = isSmallScreen ? Math.round(width * 0.17) : 72;
  const rowCount = getSkeletonCount(height, count ?? 5);
  // Pulse only bones — keep cards opaque so they don't look muddy grey.
  const boneOpacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(boneOpacity, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(boneOpacity, {
          toValue: 0.55,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [boneOpacity]);

  const pillWidths = isTinyScreen
    ? [48, 34, 34, 34]
    : isSmallScreen
    ? [52, 38, 38, 36]
    : [56, 40, 40, 36];

  const Bone = ({
    style,
  }: {
    style: React.ComponentProps<typeof Animated.View>["style"];
  }) => <Animated.View style={[style, { opacity: boneOpacity }]} />;

  return (
    <View style={styles.skeletonRoot}>
      {Array.from({ length: rowCount }).map((_, index) => (
        <View key={`sk-${index}`} style={styles.skeletonCard}>
          <Bone
            style={[
              styles.skeletonImage,
              { width: imageSize, height: imageSize },
            ]}
          />
          <View style={styles.skeletonBody}>
            <Bone
              style={[
                styles.skeletonLine,
                {
                  width: isTinyScreen ? "78%" : "82%",
                  height: isSmallScreen ? 12 : 14,
                },
              ]}
            />
            {showBrand ? (
              <Bone
                style={[
                  styles.skeletonLine,
                  {
                    width: isTinyScreen ? "38%" : "44%",
                    height: isSmallScreen ? 10 : 11,
                    marginBottom: 10,
                  },
                ]}
              />
            ) : (
              <View style={{ height: 6 }} />
            )}
            <View style={styles.skeletonPillRow}>
              {pillWidths.map((pillWidth, pillIndex) => (
                <Bone
                  key={`pill-${pillIndex}`}
                  style={[
                    styles.skeletonPill,
                    {
                      width: pillWidth,
                      height: isTinyScreen ? 20 : 22,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          {showTrailing ? <Bone style={styles.skeletonTrailing} /> : null}
        </View>
      ))}
      {message ? (
        <Animated.Text
          style={[styles.skeletonMessage, { opacity: boneOpacity }]}
          numberOfLines={2}
        >
          {message}
        </Animated.Text>
      ) : null}
    </View>
  );
}
