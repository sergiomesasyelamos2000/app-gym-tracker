import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { initDatabase } from "../database/sqliteClient";
import {
  forceSyncNow,
  isSyncInProgress,
  startAutoSync,
  stopAutoSync,
} from "../services/autoSyncService";
import { getPendingCount } from "../services/syncQueue";
import { useSyncStore } from "../store/useSyncStore";

interface SyncProviderProps {
  children: React.ReactNode;
}

type BannerKind = "offline" | "pending" | "syncing" | null;

export function SyncProvider({ children }: SyncProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const [pendingOpsCount, setPendingOpsCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isSyncing, pendingOperations, setPendingOperations } = useSyncStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  const pendingCount = Math.max(pendingOpsCount, pendingOperations);
  const syncing = isSyncing || isSyncingNow;

  const bannerKind: BannerKind = useMemo(() => {
    if (!isOnline) return "offline";
    if (syncing && pendingCount > 0) return "syncing";
    if (pendingCount > 0) return "pending";
    return null;
  }, [isOnline, syncing, pendingCount]);

  useEffect(() => {
    async function initialize() {
      try {
        await initDatabase();
        const count = await getPendingCount();
        setPendingOpsCount(count);
        setPendingOperations(count);
        startAutoSync();
        setInitialized(true);
      } catch {
        setInitialized(true);
      }
    }

    initialize();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true;
      setIsOnline(online);
      if (online) {
        void updatePendingCount();
      }
    });

    const interval = setInterval(async () => {
      await updatePendingCount();
      setIsSyncingNow(isSyncInProgress());
    }, 5000);

    return () => {
      stopAutoSync();
      unsubscribe();
      clearInterval(interval);
    };
  }, [setPendingOperations]);

  const updatePendingCount = async () => {
    const count = await getPendingCount();
    setPendingOpsCount(count);
    setPendingOperations(count);
  };

  useEffect(() => {
    if (bannerKind) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
      ]).start();

      if (bannerKind === "syncing") {
        Animated.loop(
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ).start();
      } else {
        spinValue.stopAnimation();
        spinValue.setValue(0);
      }
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    spinValue.stopAnimation();
    spinValue.setValue(0);
  }, [bannerKind, fadeAnim, slideAnim, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert(
        "Sin conexión",
        "No hay conexión a internet. Los datos locales se sincronizarán al reconectar."
      );
      return;
    }

    if (isSyncInProgress()) {
      return;
    }

    setIsSyncingNow(true);
    try {
      const result = await forceSyncNow();
      await updatePendingCount();

      if (result.success > 0) {
        Alert.alert(
          "Sincronización completa",
          `${result.success} cambios sincronizados.${
            result.failed > 0 ? `\n${result.failed} fallaron.` : ""
          }`
        );
      } else if (result.failed > 0) {
        Alert.alert(
          "Error de sincronización",
          `No se pudieron sincronizar ${result.failed} cambios. Reintentando automáticamente.`
        );
      }
    } catch (error) {
      console.error("[SyncProvider] Manual sync failed:", error);
      Alert.alert(
        "Error",
        "Ocurrió un error durante la sincronización. Reintentando automáticamente."
      );
    } finally {
      setIsSyncingNow(false);
    }
  };

  const bannerCopy =
    bannerKind === "offline"
      ? "Sin conexión · datos locales"
      : bannerKind === "syncing"
        ? "Sincronizando..."
        : bannerKind === "pending"
          ? pendingCount === 1
            ? "1 cambio pendiente · tocar para sync"
            : `${pendingCount} cambios pendientes · tocar para sync`
          : "";

  const bannerIcon =
    bannerKind === "offline"
      ? "cloud-offline-outline"
      : bannerKind === "syncing"
        ? "sync-outline"
        : "cloud-upload-outline";

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons
          name="cloud-download-outline"
          size={48}
          color={theme.primary}
        />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Inicializando sistema offline...
        </Text>
      </View>
    );
  }

  return (
    <>
      {children}
      {bannerKind ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.syncToast,
            {
              top: Math.max(insets.top, 12) + 8,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Pressable
            onPress={
              bannerKind === "pending" || bannerKind === "offline"
                ? handleManualSync
                : undefined
            }
            style={[
              styles.syncToastContent,
              {
                backgroundColor:
                  bannerKind === "offline"
                    ? `${theme.warning ?? theme.primary}18`
                    : `${theme.primary}15`,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={bannerCopy}
          >
            {bannerKind === "syncing" ? (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name={bannerIcon} size={14} color={theme.primary} />
              </Animated.View>
            ) : (
              <Ionicons
                name={bannerIcon}
                size={14}
                color={
                  bannerKind === "offline"
                    ? theme.warning ?? theme.primary
                    : theme.primary
                }
              />
            )}
            <Text style={[styles.syncToastText, { color: theme.text }]}>
              {bannerCopy}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  syncToast: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  syncToastContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  syncToastText: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.85,
  },
});
