import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import NetInfo from "@react-native-community/netinfo";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ImageStyle,
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
} from "react-native";
import { WebView } from "react-native-webview";
import Icon from "react-native-vector-icons/MaterialIcons";
import { RFValue } from "react-native-responsive-fontsize";
import CachedExerciseImage from "../../../components/CachedExerciseImage";
import {
  ensureExerciseMediaIndex,
  exerciseMediaDirectoryUri,
  peekExerciseLocalMedia,
  subscribeExerciseMedia,
} from "../../../services/exerciseMediaCache";
import {
  escapeMediaUrl,
  pickExerciseMediaSource,
  type MediaCandidate,
} from "../utils/pickExerciseMediaSource";
import { getStaticExerciseImageUrl } from "../utils/normalizeExerciseImage";

const MEDIA_READY_TIMEOUT_MS = 8000;

type ExerciseMediaProps = {
  exercise: ExerciseRequestDto;
  style: StyleProp<ImageStyle>;
  onLoadEnd?: () => void;
};

function buildVideoHtml(src: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
      video { width: 100%; height: 100%; object-fit: cover; }
      video::-webkit-media-controls { display: none !important; }
      video::-webkit-media-controls-enclosure { display: none !important; }
      video::-webkit-media-controls-start-playback-button {
        display: none !important;
        -webkit-appearance: none;
        opacity: 0;
        pointer-events: none;
        width: 0;
        height: 0;
      }
    </style>
  </head>
  <body>
    <video id="exerciseVideo" src="${src}" playsinline webkit-playsinline muted loop autoplay controlslist="nodownload nofullscreen noremoteplayback" disablepictureinpicture></video>
    <script>
      const video = document.getElementById('exerciseVideo');
      function sendPausedState() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ paused: video.paused }));
        }
      }
      function sendReady() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
        }
      }
      function sendError() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ error: true }));
        }
      }
      window.__togglePlayback = function () {
        if (video.paused) { video.play(); } else { video.pause(); }
        sendPausedState();
      };
      video.addEventListener('play', sendPausedState);
      video.addEventListener('pause', sendPausedState);
      video.addEventListener('loadeddata', function () { sendPausedState(); sendReady(); });
      video.addEventListener('error', sendError);
      sendPausedState();
    </script>
  </body>
</html>`;
}

function buildGifHtml(src: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
      img { width: 100%; height: 100%; object-fit: cover; display: block; }
    </style>
  </head>
  <body>
    <img id="gif" src="${src}" />
    <script>
      let paused = false;
      const originalSrc = ${JSON.stringify(src)};
      function sendState() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ paused: paused }));
        }
      }
      function sendReady() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
        }
      }
      function sendError() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ error: true }));
        }
      }
      window.__togglePlayback = function() {
        const img = document.getElementById('gif');
        if (paused) {
          img.src = originalSrc;
          paused = false;
        } else {
          img.src = '';
          paused = true;
        }
        sendState();
      };
      const img = document.getElementById('gif');
      img.addEventListener('load', sendReady);
      img.addEventListener('error', sendError);
      sendState();
    </script>
  </body>
</html>`;
}

export default function ExerciseMedia({
  exercise,
  style,
  onLoadEnd,
}: ExerciseMediaProps) {
  const webViewRef = useRef<WebView>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [localRevision, setLocalRevision] = useState(0);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const readyReported = useRef(false);
  const onLoadEndRef = useRef(onLoadEnd);
  onLoadEndRef.current = onLoadEnd;
  const candidatesRef = useRef<MediaCandidate[]>([]);

  useEffect(() => {
    let cancelled = false;
    void ensureExerciseMediaIndex().then(() => {
      if (!cancelled) setLocalRevision((n) => n + 1);
    });
    const unsub = subscribeExerciseMedia(() => {
      setLocalRevision((n) => n + 1);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [exercise.id]);

  useEffect(() => {
    let cancelled = false;
    void NetInfo.fetch().then((state) => {
      if (cancelled) return;
      const online =
        state.isConnected === true &&
        (state.isInternetReachable === true ||
          state.isInternetReachable == null);
      setIsOnline(online);
    });
    const unsub = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected === true &&
        (state.isInternetReachable === true ||
          state.isInternetReachable == null);
      setIsOnline(online);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const local = useMemo(() => {
    void localRevision;
    const peeked = peekExerciseLocalMedia(exercise.id);
    return {
      video: peeked.videoUri,
      gif: peeked.gifUri,
      static: peeked.staticUri,
    };
  }, [exercise.id, localRevision]);

  const remote = useMemo(() => {
    const giftUrl = (exercise as { giftUrl?: string }).giftUrl?.trim() || null;
    const gifUrl = (exercise as { gifUrl?: string }).gifUrl?.trim() || null;
    const onlyHttp = (value: string | null) =>
      value && (value.startsWith("http://") || value.startsWith("https://"))
        ? value
        : null;
    return {
      video: onlyHttp(exercise.videoUrl?.trim() || null),
      gif: onlyHttp(giftUrl || gifUrl),
      static: onlyHttp(getStaticExerciseImageUrl(exercise)),
    };
  }, [exercise]);

  const pickResult = useMemo(
    () => pickExerciseMediaSource({ isOnline, local, remote }),
    [isOnline, local, remote]
  );

  const candidates: MediaCandidate[] =
    pickResult.status === "ready" ? pickResult.candidates : [];
  candidatesRef.current = candidates;

  useEffect(() => {
    setCandidateIndex(0);
    setIsPaused(false);
    readyReported.current = false;
  }, [exercise.id, pickResult.status, candidates.length]);

  const active: MediaCandidate | undefined = candidates[candidateIndex];
  const activeKey =
    active && active.type !== "static"
      ? `${active.type}:${active.uri}:${active.local ? "local" : "remote"}`
      : active?.type === "static"
        ? `static:${active.uri ?? "null"}`
        : "";

  const advance = () => {
    setCandidateIndex((idx) => {
      if (idx + 1 < candidatesRef.current.length) return idx + 1;
      return idx;
    });
  };

  useEffect(() => {
    if (pickResult.status === "pending") {
      const timer = setTimeout(() => {
        onLoadEndRef.current?.();
      }, MEDIA_READY_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }

    if (!active) {
      onLoadEndRef.current?.();
      return;
    }

    if (active.type === "static") {
      return;
    }

    readyReported.current = false;
    const timer = setTimeout(() => {
      if (!readyReported.current) {
        advance();
      }
    }, MEDIA_READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by activeKey
  }, [activeKey, pickResult.status]);

  const flattenedStyle = StyleSheet.flatten(style);
  const videoContainerWidth =
    typeof flattenedStyle?.width === "number"
      ? flattenedStyle.width * 1.2
      : flattenedStyle?.width;

  if (pickResult.status === "pending" || !active) {
    return (
      <CachedExerciseImage
        imageUrl={null}
        style={style}
        onLoadEnd={() => onLoadEndRef.current?.()}
        testID="exercise-media-fallback"
      />
    );
  }

  if (active.type === "static") {
    const hasLaterCandidate = candidateIndex + 1 < candidates.length;
    return (
      <CachedExerciseImage
        imageUrl={active.uri}
        style={style}
        onLoadEnd={() => onLoadEndRef.current?.()}
        onError={hasLaterCandidate ? () => advance() : undefined}
        testID={
          active.uri ? "exercise-media-static" : "exercise-media-fallback"
        }
      />
    );
  }

  const safeUri = escapeMediaUrl(active.uri);
  const mediaRoot = exerciseMediaDirectoryUri();
  const isTrustedLocal =
    active.local &&
    Boolean(safeUri) &&
    safeUri!.startsWith("file://") &&
    safeUri!.startsWith(mediaRoot);

  if (!safeUri || (safeUri.startsWith("file://") && !isTrustedLocal)) {
    // Invalid / untrusted URI — advance once via effect-less microtask.
    queueMicrotask(() => advance());
    return (
      <CachedExerciseImage
        imageUrl={null}
        style={style}
        onLoadEnd={() => onLoadEndRef.current?.()}
        testID="exercise-media-fallback"
      />
    );
  }

  const html =
    active.type === "video" ? buildVideoHtml(safeUri) : buildGifHtml(safeUri);
  const source = isTrustedLocal
    ? {
        html,
        baseUrl: mediaRoot,
      }
    : { html };

  return (
    <View
      testID={
        active.type === "video" ? "exercise-media-video" : "exercise-media-gif"
      }
      style={[
        style,
        active.type === "video"
          ? {
              width: videoContainerWidth,
              position: "relative",
              overflow: "hidden",
            }
          : { position: "relative", overflow: "hidden" },
      ]}
    >
      <WebView
        ref={webViewRef}
        source={source}
        style={StyleSheet.absoluteFillObject}
        originWhitelist={["http://*", "https://*", "file://*"]}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        androidLayerType="hardware"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowFileAccess={isTrustedLocal}
        allowFileAccessFromFileURLs={isTrustedLocal}
        allowingReadAccessToURL={isTrustedLocal ? mediaRoot : undefined}
        pointerEvents="none"
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data);
            if (typeof payload?.paused === "boolean") {
              setIsPaused(payload.paused);
            }
            if (payload?.ready === true) {
              readyReported.current = true;
              onLoadEndRef.current?.();
            }
            if (payload?.error === true) {
              advance();
            }
          } catch {
            // no-op
          }
        }}
      />
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          webViewRef.current?.injectJavaScript(
            "window.__togglePlayback && window.__togglePlayback(); true;"
          );
        }}
        style={StyleSheet.absoluteFillObject}
      />
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          webViewRef.current?.injectJavaScript(
            "window.__togglePlayback && window.__togglePlayback(); true;"
          );
        }}
        style={{
          position: "absolute",
          right: 8,
          bottom: 8,
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <Icon
          name={isPaused ? "play-arrow" : "pause"}
          size={RFValue(14)}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}
