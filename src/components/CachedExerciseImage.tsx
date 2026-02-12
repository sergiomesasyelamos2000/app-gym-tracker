import React, { useEffect, useState } from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import NetInfo from "@react-native-community/netinfo";

interface CachedExerciseImageProps {
  imageUrl: string | null | undefined;
  style: StyleProp<ImageStyle>;
  showLoader?: boolean;
}

const DEFAULT_IMAGE = require("../../assets/not-image.png");

/**
 * Simple component: if offline, show default image. If online, try to load the image.
 */
export default function CachedExerciseImage({
  imageUrl,
  style,
}: CachedExerciseImageProps) {
  const [imageSource, setImageSource] = useState<{ uri: string } | number>(
    DEFAULT_IMAGE
  );
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Check network status
    NetInfo.fetch().then((state) => {
      // Handle null cases explicitly - force boolean result
      const isConnected = state.isConnected === true;
      const isReachable = state.isInternetReachable !== false; // null or true = reachable
      const connected = isConnected && isReachable;

      if (!isMounted) return;

      setIsOnline(connected);

      // If offline, always use default image
      if (!connected) {
        setImageSource(DEFAULT_IMAGE);
        return;
      }

      // If online and no imageUrl, use default
      if (!imageUrl || !imageUrl.trim()) {
        setImageSource(DEFAULT_IMAGE);
        return;
      }

      // If online and has imageUrl, try to load it
      const trimmedUrl = imageUrl.trim();

      // Handle base64 with prefix
      if (trimmedUrl.startsWith("data:image")) {
        setImageSource({ uri: trimmedUrl });
        return;
      }

      // Handle base64 without prefix (long string, not http)
      if (!trimmedUrl.startsWith("http") && trimmedUrl.length > 50) {
        setImageSource({ uri: `data:image/png;base64,${trimmedUrl}` });
        return;
      }

      // Handle HTTP URL
      if (
        trimmedUrl.startsWith("http://") ||
        trimmedUrl.startsWith("https://")
      ) {
        setImageSource({ uri: trimmedUrl });
        return;
      }

      // Unknown format, use default
      setImageSource(DEFAULT_IMAGE);
    });

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return (
    <Image
      source={imageSource}
      style={style}
      onError={(e) => {
        setImageSource(DEFAULT_IMAGE);
      }}
    />
  );
}
