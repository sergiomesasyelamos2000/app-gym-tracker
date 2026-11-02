import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  Bone,
  SkeletonRoot,
  skeletonBoneColor,
} from "../../common/skeleton";

export const PRODUCT_IMAGE_FALLBACK = require("../../../../assets/not-image.png");
export const PRODUCT_IMAGE_LOAD_TIMEOUT_MS = 8000;

type LoadPhase = "loading" | "loaded" | "fallback";

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  accessibilityLabel?: string;
  loadTimeoutMs?: number;
  testID?: string;
};

function resolveRemoteUri(uri?: string | null): string | null {
  const trimmed = uri?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function ProductRemoteImage({
  uri,
  style,
  containerStyle,
  borderRadius = 12,
  accessibilityLabel = "Imagen del producto",
  loadTimeoutMs = PRODUCT_IMAGE_LOAD_TIMEOUT_MS,
  testID = "product-remote-image",
}: Props) {
  const { theme } = useTheme();
  const remoteUri = useMemo(() => resolveRemoteUri(uri), [uri]);
  const [phase, setPhase] = useState<LoadPhase>(() =>
    remoteUri ? "loading" : "fallback"
  );

  const flatStyle = StyleSheet.flatten(style) ?? {};
  const width = flatStyle.width;
  const height = flatStyle.height;

  useEffect(() => {
    if (!remoteUri) {
      setPhase("fallback");
      return;
    }

    setPhase("loading");
    const timer = setTimeout(() => {
      setPhase((current) => (current === "loading" ? "fallback" : current));
    }, loadTimeoutMs);

    return () => clearTimeout(timer);
  }, [remoteUri, loadTimeoutMs]);

  const boneColor = skeletonBoneColor(theme);

  return (
    <View
      style={[
        styles.wrap,
        width != null && height != null ? { width, height } : null,
        containerStyle,
      ]}
      testID={testID}
    >
      {phase === "loading" ? (
        <SkeletonRoot
          style={[styles.skeletonFill, { borderRadius }]}
          message="Cargando imagen del producto"
          accessibilityLabel="Cargando imagen del producto"
        >
          <Bone
            style={[
              styles.skeletonFill,
              {
                borderRadius,
                backgroundColor: boneColor,
              },
            ]}
          />
        </SkeletonRoot>
      ) : null}

      {remoteUri && phase !== "fallback" ? (
        <Image
          testID={`${testID}-remote`}
          source={{ uri: remoteUri, cache: "force-cache" }}
          style={[
            styles.image,
            style,
            { opacity: phase === "loaded" ? 1 : 0 },
          ]}
          resizeMode="contain"
          accessibilityLabel={accessibilityLabel}
          onLoad={() => setPhase("loaded")}
          onError={() => setPhase("fallback")}
          fadeDuration={0}
        />
      ) : null}

      {phase === "fallback" ? (
        <Image
          testID={`${testID}-fallback`}
          source={PRODUCT_IMAGE_FALLBACK}
          style={[styles.image, style]}
          resizeMode="contain"
          accessibilityLabel={accessibilityLabel}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonFill: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
