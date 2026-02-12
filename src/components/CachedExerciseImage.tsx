import React, { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

interface CachedExerciseImageProps {
  imageUrl: string | null | undefined;
  style: StyleProp<ImageStyle>;
  showLoader?: boolean;
}

const DEFAULT_IMAGE = require('../../assets/not-image.png');

/**
 * Simple component: if offline, show default image. If online, try to load the image.
 */
export default function CachedExerciseImage({
  imageUrl,
  style,
}: CachedExerciseImageProps) {
  const [imageSource, setImageSource] = useState<{ uri: string } | number>(DEFAULT_IMAGE);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Check network status
    NetInfo.fetch().then(state => {
      const connected = state.isConnected && state.isInternetReachable !== false;

      if (!isMounted) return;

      setIsOnline(connected);

      // If offline, always use default image
      if (!connected) {
        console.log('[CachedExerciseImage] 📵 Offline - using default image');
        setImageSource(DEFAULT_IMAGE);
        return;
      }

      // If online and no imageUrl, use default
      if (!imageUrl || !imageUrl.trim()) {
        console.log('[CachedExerciseImage] No imageUrl - using default image');
        setImageSource(DEFAULT_IMAGE);
        return;
      }

      // If online and has imageUrl, try to load it
      const trimmedUrl = imageUrl.trim();

      // Handle base64 with prefix
      if (trimmedUrl.startsWith('data:image')) {
        console.log('[CachedExerciseImage] Using base64 image with prefix');
        setImageSource({ uri: trimmedUrl });
        return;
      }

      // Handle base64 without prefix (long string, not http)
      if (!trimmedUrl.startsWith('http') && trimmedUrl.length > 50) {
        console.log('[CachedExerciseImage] Using base64 image without prefix');
        setImageSource({ uri: `data:image/png;base64,${trimmedUrl}` });
        return;
      }

      // Handle HTTP URL
      if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
        console.log('[CachedExerciseImage] Using HTTP URL');
        setImageSource({ uri: trimmedUrl });
        return;
      }

      // Unknown format, use default
      console.log('[CachedExerciseImage] Unknown format - using default image');
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
        console.log('[CachedExerciseImage] Image failed to load, using default');
        setImageSource(DEFAULT_IMAGE);
      }}
    />
  );
}
