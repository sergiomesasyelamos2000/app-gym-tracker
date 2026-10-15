import NetInfo from "@react-native-community/netinfo";
import React, { useEffect } from "react";
import { initDatabase } from "../database/sqliteClient";
import {
  startAutoSync,
  stopAutoSync,
} from "../services/autoSyncService";
import { getPendingCount } from "../services/syncQueue";
import { useSyncStore } from "../store/useSyncStore";

interface SyncProviderProps {
  children: React.ReactNode;
}

/**
 * Boots offline DB + background sync. Intentionally silent (Hevy-style):
 * no offline/pending banners — sync runs under the hood.
 */
export function SyncProvider({ children }: SyncProviderProps) {
  const setPendingOperations = useSyncStore((s) => s.setPendingOperations);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        await initDatabase();
        if (cancelled) return;
        const count = await getPendingCount();
        if (cancelled) return;
        setPendingOperations(count);
        startAutoSync();
      } catch (error) {
        console.warn("[SyncProvider] Init failed:", error);
        if (!cancelled) {
          startAutoSync();
        }
      }
    }

    void initialize();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected === true) {
        void getPendingCount().then((count) => {
          if (!cancelled) setPendingOperations(count);
        });
      }
    });

    const interval = setInterval(() => {
      void getPendingCount().then((count) => {
        if (!cancelled) setPendingOperations(count);
      });
    }, 5000);

    return () => {
      cancelled = true;
      stopAutoSync();
      unsubscribe();
      clearInterval(interval);
    };
  }, [setPendingOperations]);

  return <>{children}</>;
}
