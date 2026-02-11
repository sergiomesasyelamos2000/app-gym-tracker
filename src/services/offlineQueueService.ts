import { execQuery, execRun, getDatabase } from '../database/sqliteClient';

export type EntityType =
  | 'routine'
  | 'routine_exercise'
  | 'set'
  | 'routine_session'
  | 'food_entry'
  | 'custom_product'
  | 'custom_meal';

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface QueueItem {
  id: number;
  entity_type: EntityType;
  entity_id: string;
  operation: OperationType;
  payload: string; // JSON stringified
  created_at: string;
  attempts: number;
  last_error: string | null;
}

/**
 * Añade una operación a la cola de sincronización
 */
export async function enqueueOperation(
  entityType: EntityType,
  entityId: string,
  operation: OperationType,
  payload: any
): Promise<void> {
  const db = await getDatabase();

  const query = `
    INSERT INTO sync_queue (entity_type, entity_id, operation, payload, created_at, attempts)
    VALUES (?, ?, ?, ?, ?, 0)
  `;

  await db.runAsync(query, [
    entityType,
    entityId,
    operation,
    JSON.stringify(payload),
    new Date().toISOString(),
  ]);

  console.log(`✅ Enqueued ${operation} operation for ${entityType}:${entityId}`);
}

/**
 * Obtiene todas las operaciones pendientes
 */
export async function getPendingOperations(): Promise<QueueItem[]> {
  const query = `
    SELECT * FROM sync_queue
    ORDER BY created_at ASC
    LIMIT 100
  `;

  return await execQuery<QueueItem>(query);
}

/**
 * Marca una operación como completada y la elimina de la cola
 */
export async function removeQueueItem(id: number): Promise<void> {
  const query = `DELETE FROM sync_queue WHERE id = ?`;
  await execRun(query, [id]);
  console.log(`✅ Removed queue item ${id}`);
}

/**
 * Incrementa el contador de intentos de una operación
 */
export async function incrementAttempts(id: number, error: string): Promise<void> {
  const query = `
    UPDATE sync_queue
    SET attempts = attempts + 1, last_error = ?
    WHERE id = ?
  `;

  await execRun(query, [error, id]);
}

/**
 * Obtiene el número de operaciones pendientes
 */
export async function getPendingCount(): Promise<number> {
  const result = await execQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue'
  );
  return result[0]?.count || 0;
}

/**
 * Limpia operaciones que han fallado muchas veces
 */
export async function cleanupFailedOperations(maxAttempts: number = 5): Promise<void> {
  const query = `DELETE FROM sync_queue WHERE attempts >= ?`;
  const result = await execRun(query, [maxAttempts]);

  if (result.changes > 0) {
    console.log(`🗑️ Cleaned up ${result.changes} failed operations`);
  }
}

/**
 * Obtiene operaciones para una entidad específica
 */
export async function getOperationsForEntity(
  entityType: EntityType,
  entityId: string
): Promise<QueueItem[]> {
  const query = `
    SELECT * FROM sync_queue
    WHERE entity_type = ? AND entity_id = ?
    ORDER BY created_at ASC
  `;

  return await execQuery<QueueItem>(query, [entityType, entityId]);
}
