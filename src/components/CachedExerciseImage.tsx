import React, { useEffect, useMemo, useState } from "react";
import { Image, ImageStyle, StyleProp } from "react-native";

interface CachedExerciseImageProps {
  imageUrl: string | null | undefined;
  style: StyleProp<ImageStyle>;
  showLoader?: boolean;
}

const DEFAULT_IMAGE = require("../../assets/not-image.png");

const resolveImageUri = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl || !imageUrl.trim()) {
    return null;
  }

  const trimmedUrl = imageUrl.trim();

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
}: CachedExerciseImageProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedUri = useMemo(() => resolveImageUri(imageUrl), [imageUrl]);
  useEffect(() => {
    setHasError(false);
  }, [resolvedUri]);

  const source =
    !hasError && resolvedUri ? ({ uri: resolvedUri } as const) : DEFAULT_IMAGE;

  return (
    <Image
      source={source}
      style={style}
      onError={() => setHasError(true)}
    />
  );
}
