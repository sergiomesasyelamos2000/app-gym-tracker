import { execQuery, execRun, getDatabase } from '../../database/sqliteClient';
import { enqueueOperation } from '../offlineQueueService';
import { syncService } from '../syncService';
import * as routineService from '../../features/routine/services/routineService';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { v4 as uuidv4 } from 'react-native-uuid';

/**
 * Guarda una rutina offline
 */
export async function saveRoutineOffline(routine: any): Promise<any> {
  const db = await getDatabase();

  const routineId = routine.id || uuidv4();
  const now = new Date().toISOString();

  // Save to local database
  const query = `
    INSERT OR REPLACE INTO routines (id, title, totalTime, userId, createdAt, updatedAt, synced, deleted)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0)
  `;

  await db.runAsync(query, [
    routineId,
    routine.title,
    routine.totalTime || 0,
    routine.userId,
    routine.createdAt || now,
    now,
  ]);

  // Save exercises if provided
  if (routine.exercises && routine.exercises.length > 0) {
    for (const exercise of routine.exercises) {
      await saveRoutineExerciseOffline(routineId, exercise);
    }
  }

  // Add to sync queue
  await enqueueOperation('routine', routineId, 'CREATE', {
    ...routine,
    id: routineId,
    createdAt: routine.createdAt || now,
    updatedAt: now,
  });

  // Try to sync immediately if online
  syncService.sync().catch((err) => console.log('Sync deferred:', err));

  return { ...routine, id: routineId, createdAt: routine.createdAt || now, updatedAt: now };
}

/**
 * Guarda un ejercicio de rutina offline
 */
export async function saveRoutineExerciseOffline(
  routineId: string,
  exercise: any
): Promise<void> {
  const db = await getDatabase();
  const exerciseId = exercise.id || uuidv4();

  const query = `
    INSERT OR REPLACE INTO routine_exercises
    (id, routineId, exerciseId, exerciseName, order_index, restSeconds, weightUnit, repsType, supersetWith, notes, synced, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `;

  await db.runAsync(query, [
    exerciseId,
    routineId,
    exercise.exercise?.id || exercise.exerciseId,
    exercise.exercise?.name || exercise.exerciseName,
    exercise.order || 0,
    exercise.restSeconds,
    exercise.weightUnit || 'kg',
    exercise.repsType || 'reps',
    exercise.supersetWith,
    exercise.notes ? JSON.stringify(exercise.notes) : null,
  ]);

  // Save sets if provided
  if (exercise.sets && exercise.sets.length > 0) {
    for (const set of exercise.sets) {
      await saveSetOffline(exerciseId, set);
    }
  }
}

/**
 * Guarda un set offline
 */
export async function saveSetOffline(routineExerciseId: string, set: any): Promise<void> {
  const db = await getDatabase();
  const setId = set.id || uuidv4();

  const query = `
    INSERT OR REPLACE INTO sets
    (id, routineExerciseId, order_index, weight, reps, repsMin, repsMax, completed, weightUnit, repsType, synced, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `;

  await db.runAsync(query, [
    setId,
    routineExerciseId,
    set.order || 0,
    set.weight,
    set.reps,
    set.repsMin,
    set.repsMax,
    set.completed ? 1 : 0,
    set.weightUnit || 'kg',
    set.repsType || 'reps',
  ]);
}

/**
 * Obtiene todas las rutinas (locales + sincronizadas)
 */
export async function findAllRoutinesOffline(userId: string): Promise<any[]> {
  const query = `
    SELECT * FROM routines
    WHERE userId = ? AND deleted = 0
    ORDER BY createdAt DESC
  `;

  return await execQuery(query, [userId]);
}

/**
 * Obtiene una rutina por ID
 */
export async function getRoutineByIdOffline(routineId: string): Promise<any | null> {
  const routineQuery = `
    SELECT * FROM routines
    WHERE id = ? AND deleted = 0
  `;

  const routines = await execQuery(routineQuery, [routineId]);
  if (routines.length === 0) return null;

  const routine = routines[0];

  // Get exercises
  const exercisesQuery = `
    SELECT * FROM routine_exercises
    WHERE routineId = ? AND deleted = 0
    ORDER BY order_index ASC
  `;

  const exercises = await execQuery(exercisesQuery, [routineId]);

  // Get sets for each exercise
  for (const exercise of exercises) {
    const setsQuery = `
      SELECT * FROM sets
      WHERE routineExerciseId = ? AND deleted = 0
      ORDER BY order_index ASC
    `;

    exercise.sets = await execQuery(setsQuery, [exercise.id]);
  }

  return {
    ...routine,
    exercises,
  };
}

/**
 * Actualiza una rutina
 */
export async function updateRoutineOffline(routineId: string, updates: any): Promise<void> {
  const db = await getDatabase();

  const query = `
    UPDATE routines
    SET title = ?, totalTime = ?, updatedAt = ?, synced = 0
    WHERE id = ?
  `;

  await db.runAsync(query, [
    updates.title,
    updates.totalTime || 0,
    new Date().toISOString(),
    routineId,
  ]);

  // Add to sync queue
  await enqueueOperation('routine', routineId, 'UPDATE', {
    id: routineId,
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));
}

/**
 * Elimina una rutina (soft delete)
 */
export async function deleteRoutineOffline(routineId: string): Promise<void> {
  const db = await getDatabase();

  const query = `
    UPDATE routines
    SET deleted = 1, synced = 0, updatedAt = ?
    WHERE id = ?
  `;

  await db.runAsync(query, [new Date().toISOString(), routineId]);

  // Add to sync queue
  await enqueueOperation('routine', routineId, 'DELETE', { id: routineId });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));
}

/**
 * Guarda una sesión de rutina
 */
export async function saveRoutineSessionOffline(routineId: string, session: any): Promise<any> {
  const db = await getDatabase();
  const sessionId = session.id || uuidv4();
  const now = new Date().toISOString();

  const query = `
    INSERT INTO routine_sessions (id, routineId, exercises, totalTime, totalWeight, completedSets, createdAt, synced, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
  `;

  await db.runAsync(query, [
    sessionId,
    routineId,
    JSON.stringify(session.exercises),
    session.totalTime,
    session.totalWeight,
    session.completedSets,
    now,
  ]);

  // Add to sync queue
  await enqueueOperation('routine_session', sessionId, 'CREATE', {
    ...session,
    id: sessionId,
    routineId,
    createdAt: now,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));

  return { ...session, id: sessionId, createdAt: now };
}

/**
 * Obtiene sesiones de una rutina
 */
export async function findRoutineSessionsOffline(routineId: string): Promise<any[]> {
  const query = `
    SELECT * FROM routine_sessions
    WHERE routineId = ? AND deleted = 0
    ORDER BY createdAt DESC
  `;

  const sessions = await execQuery(query, [routineId]);

  // Parse exercises JSON
  return sessions.map((session: any) => ({
    ...session,
    exercises: JSON.parse(session.exercises),
  }));
}
