import NetInfo from "@react-native-community/netinfo";
import { apiFetch } from "../api/client";
import {
  getPendingOperations,
  removeQueueItem,
  incrementAttempts,
  getPendingCount,
  cleanupFailedOperations,
  QueueItem,
  EntityType,
} from "./offlineQueueService";
import { useSyncStore } from "../store/useSyncStore";
import { CaughtError, getErrorMessage } from "../types";

const MAX_RETRY_ATTEMPTS = 3;
const SYNC_BATCH_SIZE = 20;

export class SyncService {
  private static instance: SyncService;
  private isRunning: boolean = false;
  private syncInterval: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Inicia la sincronización automática cuando hay conexión
   */
  async startAutoSync(intervalMinutes: number = 5): Promise<void> {
    // Stop any existing interval
    this.stopAutoSync();

    // Subscribe to network changes
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        console.log("📡 Network connected, triggering sync...");
        this.sync();
      }
    });

    // Start periodic sync
    this.syncInterval = setInterval(() => {
      this.sync();
    }, intervalMinutes * 60 * 1000);

    // Run initial sync
    this.sync();

    console.log(`✅ Auto-sync started (every ${intervalMinutes} minutes)`);
  }

  /**
   * Detiene la sincronización automática
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("⏹️ Auto-sync stopped");
    }
  }

  /**
   * Ejecuta la sincronización de operaciones pendientes
   */
  async sync(): Promise<{ success: boolean; synced: number; errors: number }> {
    // Check if already running
    if (this.isRunning) {
      console.log("⏳ Sync already running, skipping...");
      return { success: false, synced: 0, errors: 0 };
    }

    // Check network status
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable) {
      console.log("📴 No internet connection, skipping sync");
      return { success: false, synced: 0, errors: 0 };
    }

    this.isRunning = true;
    useSyncStore.getState().setSyncing(true);

    let syncedCount = 0;
    let errorCount = 0;

    try {
      // Clean up old failed operations
      await cleanupFailedOperations(MAX_RETRY_ATTEMPTS);

      // Get pending operations
      const pendingOps = await getPendingOperations();

      if (pendingOps.length === 0) {
        console.log("✅ No pending operations to sync");
        useSyncStore.getState().setPendingOperations(0);
        return { success: true, synced: 0, errors: 0 };
      }

      console.log(`🔄 Syncing ${pendingOps.length} pending operations...`);

      // Process operations in batches
      for (let i = 0; i < pendingOps.length; i += SYNC_BATCH_SIZE) {
        const batch = pendingOps.slice(i, i + SYNC_BATCH_SIZE);

        for (const operation of batch) {
          try {
            await this.processOperation(operation);
            await removeQueueItem(operation.id);
            syncedCount++;
          } catch (error: CaughtError) {
            console.error(
              `❌ Failed to sync operation ${operation.id}:`,
              error
            );
            errorCount++;

            // Increment attempts
            await incrementAttempts(
              operation.id,
              getErrorMessage(error) || "Unknown error"
            );

            // Add to sync errors
            useSyncStore
              .getState()
              .addSyncError(
                `Failed to sync ${operation.entity_type}:${operation.entity_id} - ${getErrorMessage(error)}`
              );
          }
        }
      }

      // Update sync state
      const remainingCount = await getPendingCount();
      useSyncStore.getState().setPendingOperations(remainingCount);
      useSyncStore.getState().setLastSyncAt(new Date().toISOString());

      console.log(
        `✅ Sync completed: ${syncedCount} synced, ${errorCount} errors, ${remainingCount} remaining`
      );

      return {
        success: errorCount === 0,
        synced: syncedCount,
        errors: errorCount,
      };
    } catch (error: CaughtError) {
      console.error("❌ Sync failed:", error);
      useSyncStore.getState().addSyncError(`Sync failed: ${getErrorMessage(error)}`);
      return { success: false, synced: syncedCount, errors: errorCount + 1 };
    } finally {
      this.isRunning = false;
      useSyncStore.getState().setSyncing(false);
    }
  }

  /**
   * Procesa una operación individual
   */
  private async processOperation(operation: QueueItem): Promise<void> {
    const payload = JSON.parse(operation.payload);
    const { entity_type, entity_id, operation: op } = operation;

    const endpoint = this.getEndpoint(entity_type, entity_id, op);
    const method = this.getMethod(op);

    console.log(`📤 Processing ${op} for ${entity_type}:${entity_id}`);

    if (op === "DELETE") {
      // For DELETE, no body needed
      await apiFetch(endpoint, { method });
    } else {
      // For CREATE/UPDATE, send payload
      await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
    }
  }

  /**
   * Obtiene el endpoint correcto para cada tipo de entidad
   */
  private getEndpoint(
    entityType: EntityType,
    entityId: string,
    operation: string
  ): string {
    switch (entityType) {
      case "routine":
        return operation === "CREATE" ? "/routines" : `/routines/${entityId}`;

      case "routine_exercise":
        // Routine exercises are nested, need routine ID from payload
        return "/routines/exercises";

      case "set":
        // Sets are nested under routine exercises
        return "/routines/sets";

      case "routine_session":
        // Sessions need routine ID
        return `/routines/${entityId}/sessions`;

      case "food_entry":
        return operation === "CREATE"
          ? "/nutrition/diary/entries"
          : `/nutrition/diary/entries/${entityId}`;

      case "custom_product":
        return operation === "CREATE"
          ? "/nutrition/custom-products"
          : `/nutrition/custom-products/${entityId}`;

      case "custom_meal":
        return operation === "CREATE"
          ? "/nutrition/custom-meals"
          : `/nutrition/custom-meals/${entityId}`;

      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Obtiene el método HTTP correcto
   */
  private getMethod(operation: string): string {
    switch (operation) {
      case "CREATE":
        return "POST";
      case "UPDATE":
        return "PUT";
      case "DELETE":
        return "DELETE";
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Fuerza una sincronización inmediata
   */
  async forceSync(): Promise<void> {
    console.log("🔄 Forcing immediate sync...");
    await this.sync();
  }

  /**
   * Obtiene el estado de sincronización
   */
  async getSyncStatus(): Promise<{
    pending: number;
    lastSync: string | null;
    isSyncing: boolean;
  }> {
    const pending = await getPendingCount();
    const { lastSyncAt, isSyncing } = useSyncStore.getState();

    return {
      pending,
      lastSync: lastSyncAt,
      isSyncing,
    };
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
