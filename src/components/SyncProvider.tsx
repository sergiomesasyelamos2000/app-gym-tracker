import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase } from '../database/sqliteClient';
import { syncService } from '../services/syncService';
import { useSyncStore } from '../store/useSyncStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from '../contexts/ThemeContext';

interface SyncProviderProps {
  children: React.ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const [initialized, setInitialized] = useState(false);
  const { theme } = useTheme();
  const networkStatus = useNetworkStatus();
  const { isSyncing, pendingOperations, lastSyncAt } = useSyncStore();

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize SQLite database
        await initDatabase();
        console.log('✅ SQLite database initialized');

        // Start auto-sync (every 5 minutes)
        await syncService.startAutoSync(5);
        console.log('✅ Auto-sync started');

        setInitialized(true);
      } catch (error) {
        console.error('❌ Failed to initialize offline system:', error);
        setInitialized(true); // Continue anyway
      }
    }

    initialize();

    return () => {
      syncService.stopAutoSync();
    };
  }, []);

  const handleManualSync = async () => {
    if (!networkStatus.isConnected) {
      return;
    }
    await syncService.forceSync();
  };

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-download-outline" size={48} color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Inicializando sistema offline...
        </Text>
      </View>
    );
  }

  return (
    <>
      {children}
      {/* Sync Status Banner */}
      {(isSyncing || pendingOperations > 0) && (
        <View style={[styles.syncBanner, { backgroundColor: theme.card }]}>
          <View style={styles.syncBannerContent}>
            {isSyncing ? (
              <>
                <Ionicons name="sync" size={16} color={theme.primary} />
                <Text style={[styles.syncText, { color: theme.text }]}>
                  Sincronizando...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name={networkStatus.isConnected ? 'cloud-upload-outline' : 'cloud-offline'}
                  size={16}
                  color={networkStatus.isConnected ? theme.warning : theme.error}
                />
                <Text style={[styles.syncText, { color: theme.text }]}>
                  {pendingOperations} cambios pendientes
                </Text>
                {networkStatus.isConnected && (
                  <TouchableOpacity onPress={handleManualSync} style={styles.syncButton}>
                    <Text style={[styles.syncButtonText, { color: theme.primary }]}>
                      Sincronizar
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  syncBanner: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  syncBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
