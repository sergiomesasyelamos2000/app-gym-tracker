import {
  ExerciseRequestDto,
  RoutineRequestDto,
  RoutineResponseDto,
  RoutineSessionRequestDto,
  SetRequestDto,
} from "@sergiomesasyelamos2000/shared";
import uuid from "react-native-uuid";
import { execQuery, getDatabase } from "../../database/sqliteClient";
import { enqueueOperation } from "../offlineQueueService";
import { syncService } from "../syncService";

/**
 * Guarda una rutina offline
 */
export async function saveRoutineOffline(
  routine: RoutineRequestDto & {
    id?: string;
    userId?: string;
    totalTime?: number;
  }
): Promise<RoutineResponseDto> {
  const db = await getDatabase();

  const routineId =
    "id" in routine && typeof routine.id === "string"
      ? routine.id
      : (uuid.v4() as string);
  const now = new Date().toISOString();

  // Save to local database
  const query = `
    INSERT OR REPLACE INTO routines (id, title, totalTime, userId, createdAt, updatedAt, synced, deleted)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0)
  `;

  await db.runAsync(query, [
    routineId,
    routine.title,
    "totalTime" in routine && typeof routine.totalTime === "number"
      ? routine.totalTime
      : 0,
    "userId" in routine && typeof routine.userId === "string"
      ? routine.userId
      : null, // Cambio: undefined -> null
    routine.createdAt instanceof Date
      ? routine.createdAt.toISOString()
      : routine.createdAt || now, // Cambio: convertir Date a string
    now,
  ]);

  // Save exercises if provided
  if (routine.exercises && routine.exercises.length > 0) {
    for (const exercise of routine.exercises) {
      await saveRoutineExerciseOffline(routineId, exercise);
    }
  }

  // Add to sync queue
  await enqueueOperation("routine", routineId, "CREATE", {
    ...routine,
    id: routineId,
    createdAt:
      routine.createdAt instanceof Date ? routine.createdAt.toISOString() : now,
    updatedAt: now,
  });

  // Try to sync immediately if online
  syncService.sync().catch((err) => console.log("Sync deferred:", err));

  return {
    id: routineId,
    title: routine.title,
    totalSets: 0,
    totalExercises: routine.exercises?.length || 0,
    isPublic: false,
    createdAt: new Date(routine.createdAt || now),
    updatedAt: new Date(now),
    routineExercises: [],
  } as RoutineResponseDto;
}

/**
 * Guarda un ejercicio de rutina offline
 */
export async function saveRoutineExerciseOffline(
  routineId: string,
  exercise: ExerciseRequestDto
): Promise<void> {
  const db = await getDatabase();
  const exerciseId = exercise.id || (uuid.v4() as string);

  const query = `
    INSERT OR REPLACE INTO routine_exercises
    (id, routineId, exerciseId, exerciseName, order_index, restSeconds, weightUnit, repsType, supersetWith, notes, synced, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `;

  await db.runAsync(query, [
    exerciseId,
    routineId,
    exercise.id,
    exercise.name,
    exercise.order ?? 0,
    exercise.restSeconds ?? null, // Ya está bien
    exercise.weightUnit ?? "kg",
    exercise.repsType ?? "reps",
    exercise.supersetWith ?? null, // Ya está bien
    exercise.notes ? JSON.stringify(exercise.notes) : null, // Ya está bien
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
export async function saveSetOffline(
  routineExerciseId: string,
  set: SetRequestDto
): Promise<void> {
  const db = await getDatabase();
  const setId = set.id || (uuid.v4() as string);

  const query = `
    INSERT OR REPLACE INTO sets
    (id, routineExerciseId, order_index, weight, reps, repsMin, repsMax, completed, weightUnit, repsType, synced, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `;

  await db.runAsync(query, [
    setId,
    routineExerciseId,
    set.order,
    set.weight ?? 0, // Agregar ?? 0 para evitar undefined
    set.reps ?? 0, // Agregar ?? 0 para evitar undefined
    set.repsMin ?? null, // Ya está bien
    set.repsMax ?? null, // Ya está bien
    set.completed ? 1 : 0,
    set.weightUnit ?? "kg",
    set.repsType ?? "reps",
  ]);
}

/**
 * Obtiene todas las rutinas (locales + sincronizadas)
 */
export async function findAllRoutinesOffline(
  userId: string
): Promise<RoutineResponseDto[]> {
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
export async function getRoutineByIdOffline(
  routineId: string
): Promise<RoutineResponseDto | null> {
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
export async function updateRoutineOffline(
  routineId: string,
  updates: Partial<RoutineRequestDto>
): Promise<void> {
  const db = await getDatabase();

  const query = `
    UPDATE routines
    SET title = ?, totalTime = ?, updatedAt = ?, synced = 0
    WHERE id = ?
  `;

  await db.runAsync(query, [
    updates.title ?? "",
    0, // totalTime is not part of RoutineRequestDto
    new Date().toISOString(),
    routineId,
  ]);

  // Add to sync queue
  await enqueueOperation("routine", routineId, "UPDATE", {
    id: routineId,
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  // Try to sync
  syncService.sync().catch((err) => console.log("Sync deferred:", err));
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
  await enqueueOperation("routine", routineId, "DELETE", { id: routineId });

  // Try to sync
  syncService.sync().catch((err) => console.log("Sync deferred:", err));
}

/**
 * Guarda una sesión de rutina
 */
export async function saveRoutineSessionOffline(
  routineId: string,
  session: RoutineSessionRequestDto & { id?: string }
): Promise<RoutineSessionRequestDto & { id: string; createdAt: string }> {
  const db = await getDatabase();
  const sessionId =
    "id" in session && typeof session.id === "string"
      ? session.id
      : (uuid.v4() as string);
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
  await enqueueOperation("routine_session", sessionId, "CREATE", {
    ...session,
    id: sessionId,
    routineId,
    createdAt: now,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log("Sync deferred:", err));

  return { ...session, id: sessionId, createdAt: now };
}

/**
 * Obtiene sesiones de una rutina
 */
export async function findRoutineSessionsOffline(
  routineId: string
): Promise<(RoutineSessionRequestDto & { id: string; createdAt: string })[]> {
  const query = `
    SELECT * FROM routine_sessions
    WHERE routineId = ? AND deleted = 0
    ORDER BY createdAt DESC
  `;

  const sessions = await execQuery(query, [routineId]);

  // Parse exercises JSON
  return sessions.map(
    (
      session: RoutineSessionRequestDto & {
        id: string;
        createdAt: string;
        exercises: string;
      }
    ) => ({
      ...session,
      exercises: JSON.parse(
        session.exercises
      ) as RoutineSessionRequestDto["exercises"],
    })
  );
}
