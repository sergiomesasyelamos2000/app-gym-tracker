import { useEffect, useState } from 'react';
import { getPendingCount, isOnline } from '../services/syncQueue';
import { isSyncInProgress } from '../services/autoSyncService';

/**
 * Hook to monitor sync status
 */
export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnlineStatus, setIsOnlineStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      const count = await getPendingCount();
      const online = await isOnline();
      const syncing = isSyncInProgress();

      setPendingCount(count);
      setIsOnlineStatus(online);
      setIsSyncing(syncing);
    };

    updateStatus();

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    pendingCount,
    isOnline: isOnlineStatus,
    isSyncing,
    hasPendingChanges: pendingCount > 0,
  };
}
