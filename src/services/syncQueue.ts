import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import type {
  RoutineRequestDto,
  RoutineSessionEntity,
} from "@sergiomesasyelamos2000/shared";

const SYNC_QUEUE_KEY = "@sync_queue";
const PENDING_ROUTINES_KEY = "@pending_routines";

export type OperationPayload =
  | { type: "CREATE_ROUTINE"; data: RoutineRequestDto }
  | { type: "UPDATE_ROUTINE"; data: { id: string; routine: RoutineRequestDto } }
  | {
      type: "CREATE_SESSION";
      data: { routineId: string; session: Partial<RoutineSessionEntity> };
    };

export interface PendingOperation {
  id: string;
  type: "CREATE_ROUTINE" | "UPDATE_ROUTINE" | "CREATE_SESSION";
  payload: OperationPayload["data"];
  timestamp: number;
  retries: number;
}

/**
 * Add operation to sync queue
 */
export async function addToSyncQueue(
  type: PendingOperation["type"],
  payload: OperationPayload["data"]
): Promise<string> {
  const operation: PendingOperation = {
    id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };

  try {
    const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: PendingOperation[] = queueStr ? JSON.parse(queueStr) : [];
    queue.push(operation);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    return operation.id;
  } catch (error) {
    console.error("[SyncQueue] Failed to add operation:", error);
    throw error;
  }
}

/**
 * Get all pending operations
 */
export async function getPendingOperations(): Promise<PendingOperation[]> {
  try {
    const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return queueStr ? JSON.parse(queueStr) : [];
  } catch (error) {
    console.error("[SyncQueue] Failed to get queue:", error);
    return [];
  }
}

/**
 * Remove operation from queue
 */
export async function removeFromSyncQueue(operationId: string): Promise<void> {
  try {
    const queue = await getPendingOperations();
    const filtered = queue.filter((op) => op.id !== operationId);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("[SyncQueue] Failed to remove operation:", error);
  }
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable === true;
}

/**
 * Get pending operations count
 */
export async function getPendingCount(): Promise<number> {
  const queue = await getPendingOperations();
  return queue.length;
}
