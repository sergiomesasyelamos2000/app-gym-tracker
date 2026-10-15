import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import type {
  CreateCustomMealDto,
  CreateCustomProductDto,
  CreateFoodEntryDto,
  FavoriteProductResponseDto,
  RoutineLayoutRequestDto,
  RoutineRequestDto,
  RoutineSessionEntity,
  UpdateCustomMealDto,
  UpdateCustomProductDto,
  UpdateFoodEntryDto,
} from "@sergiomesasyelamos2000/shared";

export const SYNC_QUEUE_KEY = "@sync_queue";

export type SyncOperationType =
  | "CREATE_ROUTINE"
  | "UPDATE_ROUTINE"
  | "DELETE_ROUTINE"
  | "CREATE_SESSION"
  | "CREATE_FOLDER"
  | "RENAME_FOLDER"
  | "DELETE_FOLDER"
  | "UPSERT_LAYOUT"
  | "CREATE_FOOD_ENTRY"
  | "UPDATE_FOOD_ENTRY"
  | "DELETE_FOOD_ENTRY"
  | "CREATE_CUSTOM_PRODUCT"
  | "UPDATE_CUSTOM_PRODUCT"
  | "DELETE_CUSTOM_PRODUCT"
  | "CREATE_CUSTOM_MEAL"
  | "UPDATE_CUSTOM_MEAL"
  | "DELETE_CUSTOM_MEAL"
  | "ADD_FAVORITE"
  | "REMOVE_FAVORITE";

export const NUTRITION_SYNC_OPERATION_TYPES: readonly SyncOperationType[] = [
  "CREATE_FOOD_ENTRY",
  "UPDATE_FOOD_ENTRY",
  "DELETE_FOOD_ENTRY",
  "CREATE_CUSTOM_PRODUCT",
  "UPDATE_CUSTOM_PRODUCT",
  "DELETE_CUSTOM_PRODUCT",
  "CREATE_CUSTOM_MEAL",
  "UPDATE_CUSTOM_MEAL",
  "DELETE_CUSTOM_MEAL",
  "ADD_FAVORITE",
  "REMOVE_FAVORITE",
] as const;

export const ROUTINE_SYNC_OPERATION_TYPES: readonly SyncOperationType[] = [
  "CREATE_ROUTINE",
  "UPDATE_ROUTINE",
  "DELETE_ROUTINE",
  "CREATE_SESSION",
  "CREATE_FOLDER",
  "RENAME_FOLDER",
  "DELETE_FOLDER",
  "UPSERT_LAYOUT",
] as const;

export type OperationPayload =
  | { type: "CREATE_ROUTINE"; data: RoutineRequestDto & { id?: string } }
  | { type: "UPDATE_ROUTINE"; data: { id: string; routine: RoutineRequestDto } }
  | { type: "DELETE_ROUTINE"; data: { id: string } }
  | {
      type: "CREATE_SESSION";
      data: { routineId: string; session: Partial<RoutineSessionEntity> };
    }
  | { type: "CREATE_FOLDER"; data: { localId: string; title: string } }
  | { type: "RENAME_FOLDER"; data: { id: string; title: string } }
  | { type: "DELETE_FOLDER"; data: { id: string } }
  | { type: "UPSERT_LAYOUT"; data: RoutineLayoutRequestDto }
  | {
      type: "CREATE_FOOD_ENTRY";
      data: CreateFoodEntryDto & { id?: string };
    }
  | {
      type: "UPDATE_FOOD_ENTRY";
      data: { id: string } & UpdateFoodEntryDto;
    }
  | { type: "DELETE_FOOD_ENTRY"; data: { id: string } }
  | {
      type: "CREATE_CUSTOM_PRODUCT";
      data: CreateCustomProductDto & { id?: string };
    }
  | {
      type: "UPDATE_CUSTOM_PRODUCT";
      data: { id: string } & UpdateCustomProductDto;
    }
  | { type: "DELETE_CUSTOM_PRODUCT"; data: { id: string } }
  | {
      type: "CREATE_CUSTOM_MEAL";
      data: CreateCustomMealDto & { id?: string };
    }
  | {
      type: "UPDATE_CUSTOM_MEAL";
      data: { id: string } & UpdateCustomMealDto;
    }
  | { type: "DELETE_CUSTOM_MEAL"; data: { id: string } }
  | {
      type: "ADD_FAVORITE";
      data: Omit<FavoriteProductResponseDto, "id" | "createdAt"> & {
        id?: string;
        createdAt?: string | Date;
      };
    }
  | { type: "REMOVE_FAVORITE"; data: { productCode: string } };

export type PendingOperation = {
  [K in SyncOperationType]: {
    id: string;
    type: K;
    payload: Extract<OperationPayload, { type: K }>["data"];
    timestamp: number;
    retries: number;
  };
}[SyncOperationType];

export function isNutritionSyncOperation(
  op: Pick<PendingOperation, "type">
): boolean {
  return (NUTRITION_SYNC_OPERATION_TYPES as readonly string[]).includes(
    op.type
  );
}

export function isRoutineSyncOperation(
  op: Pick<PendingOperation, "type">
): boolean {
  return (ROUTINE_SYNC_OPERATION_TYPES as readonly string[]).includes(op.type);
}

/**
 * Add operation to sync queue.
 * UPSERT_LAYOUT is coalesced (only the latest layout op is kept).
 */
export async function addToSyncQueue<T extends SyncOperationType>(
  type: T,
  payload: Extract<OperationPayload, { type: T }>["data"]
): Promise<string> {
  const operation = {
    id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  } as PendingOperation;

  try {
    const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    let queue: PendingOperation[] = queueStr ? JSON.parse(queueStr) : [];

    if (type === "UPSERT_LAYOUT") {
      queue = queue.filter((op) => op.type !== "UPSERT_LAYOUT");
    }

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
 * Drop queue ops that match a predicate (e.g. cancel CREATE for a deleted local entity).
 */
export async function filterSyncQueue(
  keep: (op: PendingOperation) => boolean
): Promise<void> {
  const queue = await getPendingOperations();
  await AsyncStorage.setItem(
    SYNC_QUEUE_KEY,
    JSON.stringify(queue.filter(keep))
  );
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  // Treat null isInternetReachable as "maybe online" when connected (common on iOS).
  return (
    state.isConnected === true &&
    (state.isInternetReachable === true || state.isInternetReachable == null)
  );
}

/**
 * Get pending operations count
 */
export async function getPendingCount(): Promise<number> {
  const queue = await getPendingOperations();
  return queue.length;
}
