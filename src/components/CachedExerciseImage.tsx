import React, { useEffect, useMemo, useState } from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { isAnimatedExerciseImage } from "../utils/exerciseImage";

interface CachedExerciseImageProps {
  imageUrl: string | null | undefined;
  style: StyleProp<ImageStyle>;
  showLoader?: boolean;
  onLoadEnd?: () => void;
  /** When true, GIFs are allowed (e.g. history fallback if no static exists). */
  allowAnimated?: boolean;
}

const DEFAULT_IMAGE = require("../../assets/not-image.png");

const resolveImageUri = (
  imageUrl: string | null | undefined,
  allowAnimated = false
): string | null => {
  if (!imageUrl || !imageUrl.trim()) {
    return null;
  }

  const trimmedUrl = imageUrl.trim();

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
    return trimmedUrl;
  }

  return null;
};

export default function CachedExerciseImage({
  imageUrl,
  style,
  onLoadEnd,
  allowAnimated = false,
}: CachedExerciseImageProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedUri = useMemo(
    () => resolveImageUri(imageUrl, allowAnimated),
    [imageUrl, allowAnimated]
  );
  useEffect(() => {
    setHasError(false);
  }, [resolvedUri]);

  const source =
    !hasError && resolvedUri ? ({ uri: resolvedUri } as const) : DEFAULT_IMAGE;

  return (
    <Image
      source={source}
      style={style}
      onLoadEnd={onLoadEnd}
      onError={() => setHasError(true)}
    />
  );
}
