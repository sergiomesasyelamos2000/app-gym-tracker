import { apiFetch } from "../../../api/client";
import {
  RoutineRequestDto,
  RoutineResponseDto,
  RoutineEntity,
  RoutineSessionEntity,
} from "@entity-data-models/index";
import { useAuthStore } from "../../../store/useAuthStore";

/**
 * Get current user ID from auth store
 * @throws Error if user is not authenticated
 */
function getCurrentUserId(): string {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) {
    throw new Error("User not authenticated. Please log in.");
  }
  return userId;
}

export async function saveRoutine(
  routineRequestDto: RoutineRequestDto,
): Promise<RoutineResponseDto> {
  return await apiFetch<RoutineResponseDto>("routines", {
    method: "POST",
    body: JSON.stringify(routineRequestDto),
  });
}

export async function findAllRoutines(): Promise<RoutineResponseDto[]> {
  return await apiFetch<RoutineResponseDto[]>("routines", {
    method: "GET",
  });
}

export async function getRoutineById(id: string): Promise<RoutineResponseDto> {
  return await apiFetch<RoutineResponseDto>(`routines/${id}`, {
    method: "GET",
  });
}

export async function updateRoutineById(
  id: string,
  routineRequestDto: RoutineRequestDto,
): Promise<RoutineResponseDto> {
  return await apiFetch<RoutineResponseDto>(`routines/${id}`, {
    method: "PUT",
    body: JSON.stringify(routineRequestDto),
  });
}

export async function duplicateRoutine(id: string): Promise<void> {
  await apiFetch<void>(`routines/${id}/duplicate`, {
    method: "POST",
  });
}

export async function deleteRoutine(id: string): Promise<void> {
  await apiFetch<void>(`routines/${id}`, {
    method: "DELETE",
  });
}

export async function saveRoutineSession(
  id: string,
  session: Partial<RoutineSessionEntity>,
): Promise<RoutineSessionEntity> {
  return await apiFetch<RoutineSessionEntity>(`routines/${id}/sessions`, {
    method: "POST",
    body: JSON.stringify(session),
  });
}

export async function findAllRoutineSessions(): Promise<
  RoutineSessionEntity[]
> {
  return await apiFetch<RoutineSessionEntity[]>("routines/sessions", {
    method: "GET",
  });
}

export async function findRoutineSessions(
  id: string,
): Promise<RoutineSessionEntity[]> {
  return await apiFetch<RoutineSessionEntity[]>(`routines/${id}/sessions`, {
    method: "GET",
  });
}

export async function getGlobalStats(): Promise<any> {
  // TODO: Define strict type for global stats
  return await apiFetch("routines/stats/global", {
    method: "GET",
  });
}

export const reorderRoutineExercises = async (
  routineId: string,
  exerciseIds: string[],
): Promise<void> => {
  await apiFetch<void>(`routines/${routineId}/reorder`, {
    method: "PUT",
    body: JSON.stringify({ exerciseIds }),
  });
};
