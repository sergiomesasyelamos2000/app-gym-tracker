import React, { useEffect, useMemo, useState } from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { isAnimatedExerciseImage } from "../utils/exerciseImage";
import { toCloudinaryListThumbUrl } from "../utils/cloudinaryThumbUrl";
import { peekCachedStaticUri } from "../services/exerciseMediaCache";

interface CachedExerciseImageProps {
  imageUrl: string | null | undefined;
  style: StyleProp<ImageStyle>;
  showLoader?: boolean;
  onLoadEnd?: () => void;
  /** When true, GIFs are allowed (e.g. history fallback if no static exists). */
  allowAnimated?: boolean;
  /** List rows use Cloudinary 200px thumbs; detail keeps the original URL. */
  variant?: "full" | "thumb";
  testID?: string;
  /** Called when the remote/local image fails and the default asset is shown. */
  onError?: () => void;
}

const DEFAULT_IMAGE = require("../../assets/not-image.png");

const resolveImageUri = (
  imageUrl: string | null | undefined,
  allowAnimated = false,
  variant: "full" | "thumb" = "full"
): string | null => {
  if (!imageUrl || !imageUrl.trim()) {
    return null;
  }

  const trimmedUrl = imageUrl.trim();

  // Local durable cache (offline Hevy-style).
  if (trimmedUrl.startsWith("file://")) {
    return trimmedUrl;
  }

  // Never render animated GIFs in Image thumbnails unless explicitly allowed.
  if (!allowAnimated && isAnimatedExerciseImage(trimmedUrl)) {
    return null;
  }

  // Extra safety: reject raw GIF magic bytes even if wrapped as another mime.
  if (
    !allowAnimated &&
    !trimmedUrl.startsWith("http") &&
    (trimmedUrl.includes("R0lGOD") || trimmedUrl.includes("data:image/gif"))
  ) {
    return null;
  }

  if (trimmedUrl.startsWith("data:image")) {
    return trimmedUrl;
  }

  if (!trimmedUrl.startsWith("http") && trimmedUrl.length > 50) {
    return `data:image/png;base64,${trimmedUrl}`;
  }

  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    const localStatic = peekCachedStaticUri(trimmedUrl);
    if (localStatic) {
      return localStatic;
    }
    if (variant === "thumb") {
      return toCloudinaryListThumbUrl(trimmedUrl) ?? trimmedUrl;
    }
    return trimmedUrl;
  }

  return null;
};

export default function CachedExerciseImage({
  imageUrl,
  style,
  onLoadEnd,
  allowAnimated = false,
  variant = "full",
  testID,
  onError,
}: CachedExerciseImageProps) {
  const [hasError, setHasError] = useState(false);
  const onErrorRef = React.useRef(onError);
  onErrorRef.current = onError;
  const resolvedUri = useMemo(
    () => resolveImageUri(imageUrl, allowAnimated, variant),
    [imageUrl, allowAnimated, variant]
  );
  useEffect(() => {
    setHasError(false);
  }, [resolvedUri]);

  const source =
    !hasError && resolvedUri
      ? resolvedUri.startsWith("http")
        ? ({ uri: resolvedUri, cache: "force-cache" as const } as const)
        : ({ uri: resolvedUri } as const)
      : DEFAULT_IMAGE;

  const isRemoteHttp =
    typeof resolvedUri === "string" && resolvedUri.startsWith("http");
  const useDefaultSource = variant !== "thumb" && isRemoteHttp;
  const showingFallback = hasError || !resolvedUri;

  return (
    <Image
      testID={
        testID ??
        (showingFallback
          ? "cached-exercise-image-fallback"
          : "cached-exercise-image")
      }
      source={source}
      defaultSource={useDefaultSource ? DEFAULT_IMAGE : undefined}
      style={style}
      fadeDuration={variant === "thumb" ? 0 : undefined}
      onLoadEnd={onLoadEnd}
      onError={() => {
        setHasError(true);
        onErrorRef.current?.();
      }}
    />
  );
}
