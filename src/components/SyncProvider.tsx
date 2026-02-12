import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { initDatabase } from "../database/sqliteClient";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import {
  forceSyncNow,
  isSyncInProgress,
  startAutoSync,
  stopAutoSync,
} from "../services/autoSyncService";
import { getPendingCount } from "../services/syncQueue";
import { syncService } from "../services/syncService";
import { useSyncStore } from "../store/useSyncStore";

interface SyncProviderProps {
  children: React.ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const [pendingOpsCount, setPendingOpsCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  const { theme } = useTheme();
  const networkStatus = useNetworkStatus();
  const { isSyncing, pendingOperations, lastSyncAt } = useSyncStore();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize SQLite database
        await initDatabase();

        // Check pending operations
        const count = await getPendingCount();
        setPendingOpsCount(count);

        // Start both sync services
        await syncService.startAutoSync(5); // Original SQLite sync
        startAutoSync(); // New AsyncStorage routine sync

        setInitialized(true);
      } catch (error) {
        setInitialized(true); // Continue anyway
      }
    }

    initialize();

    // Monitor network status
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected === true);
      if (state.isConnected) {
        updatePendingCount();
      }
    });

    // Check pending ops and sync status periodically
    const interval = setInterval(async () => {
      await updatePendingCount();
      const syncing = isSyncInProgress();
      setIsSyncingNow(syncing);
    }, 5000); // Every 5 seconds

    return () => {
      syncService.stopAutoSync();
      stopAutoSync();
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = async () => {
    const count = await getPendingCount();
    setPendingOpsCount(count);
  };

  // Animate sync banner in/out
  useEffect(() => {
    if (isSyncing || isSyncingNow) {
      setShowSyncBanner(true);

      // Fade in and slide down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
      ]).start();

      // Start spinning animation
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Fade out and slide up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowSyncBanner(false);
        spinValue.setValue(0);
      });
    }
  }, [isSyncing, isSyncingNow]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert(
        "Sin conexión",
        "No hay conexión a internet. Por favor, conéctate e intenta de nuevo."
      );
      return;
    }

    if (isSyncingNow) {
      Alert.alert("Sincronizando", "Ya hay una sincronización en progreso.");
      return;
    }

    setIsSyncingNow(true);

    try {
      // Sync both systems
      await syncService.forceSync();
      const result = await forceSyncNow();

      await updatePendingCount();

      if (result.success > 0) {
        Alert.alert(
          "✅ Sincronización completa",
          `${result.success} cambios sincronizados correctamente.${
            result.failed > 0 ? `\n${result.failed} cambios fallaron.` : ""
          }`
        );
      } else if (result.failed > 0) {
        Alert.alert(
          "⚠️ Error de sincronización",
          `No se pudieron sincronizar ${result.failed} cambios. Reintentando automáticamente.`
        );
      } else {
        Alert.alert(
          "ℹ️ Sin cambios",
          "No hay cambios pendientes para sincronizar."
        );
      }
    } catch (error) {
      console.error("[SyncProvider] Manual sync failed:", error);
      Alert.alert(
        "❌ Error",
        "Ocurrió un error durante la sincronización. Reintentando automáticamente."
      );
    } finally {
      setIsSyncingNow(false);
    }
  };

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
      {/* Subtle Sync Banner - Top positioned, auto-hide */}
      {showSyncBanner && (
        <Animated.View
          style={[
            styles.syncToast,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.syncToastContent,
              { backgroundColor: `${theme.primary}15` },
            ]}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="sync-outline" size={14} color={theme.primary} />
            </Animated.View>
            <Text style={[styles.syncToastText, { color: theme.text }]}>
              Sincronizando...
            </Text>
          </View>
        </Animated.View>
      )}
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
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
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
    opacity: 0.8,
  },
  // Deprecated styles (keeping for backwards compatibility)
  syncBanner: {
    display: "none",
  },
  syncBannerContent: {
    display: "none",
  },
  syncText: {
    display: "none",
  },
  syncButton: {
    display: "none",
  },
  syncButtonText: {
    display: "none",
  },
  spinningIcon: {
    display: "none",
  },
});
