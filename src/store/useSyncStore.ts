import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncState {
  // Sync status
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingOperations: number;
  syncErrors: string[];

  // Actions
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncAt: (date: string) => void;
  setPendingOperations: (count: number) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
  resetSync: () => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      // Initial state
      isSyncing: false,
      lastSyncAt: null,
      pendingOperations: 0,
      syncErrors: [],

      // Actions
      setSyncing: (isSyncing) => set({ isSyncing }),

      setLastSyncAt: (date) => set({ lastSyncAt: date }),

      setPendingOperations: (count) => set({ pendingOperations: count }),

      addSyncError: (error) =>
        set((state) => ({
          syncErrors: [...state.syncErrors, error].slice(-10), // Keep last 10 errors
        })),

      clearSyncErrors: () => set({ syncErrors: [] }),

      resetSync: () =>
        set({
          isSyncing: false,
          lastSyncAt: null,
          pendingOperations: 0,
          syncErrors: [],
        }),
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastSyncAt: state.lastSyncAt,
        pendingOperations: state.pendingOperations,
      }),
    }
  )
);
