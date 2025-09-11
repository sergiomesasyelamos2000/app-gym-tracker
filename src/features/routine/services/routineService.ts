import {
  RoutineRequestDto,
  RoutineResponseDto,
} from "../../../models/index.js";
import { apiFetch } from "../../../api/index";

export async function saveRoutine(
  routineRequestDto: RoutineRequestDto
): Promise<RoutineResponseDto> {
  return await apiFetch<RoutineResponseDto>("routines", {
    method: "POST",
    body: JSON.stringify(routineRequestDto),
  });
}

export async function findAllRoutines(): Promise<any[]> {
  return await apiFetch("routines", {
    method: "GET",
  });
}

export async function getRoutineById(id: string): Promise<any> {
  return await apiFetch(`routines/${id}`, {
    method: "GET",
  });
}

export async function updateRoutineById(
  id: string,
  routineRequestDto: any
): Promise<any> {
  return await apiFetch(`routines/${id}`, {
    method: "PUT",
    body: JSON.stringify(routineRequestDto),
  });
}

export async function duplicateRoutine(id: string): Promise<void> {
  await apiFetch(`routines/${id}/duplicate`, {
    method: "POST",
  });
}

export async function deleteRoutine(id: string): Promise<void> {
  await apiFetch(`routines/${id}`, {
    method: "DELETE",
  });
}

export async function saveRoutineSession(
  id: string,
  session: any
): Promise<any> {
  return await apiFetch(`routines/${id}/sessions`, {
    method: "POST",
    body: JSON.stringify(session),
  });
}

export async function findAllRoutineSessions(): Promise<any[]> {
  return await apiFetch("routines/sessions", { method: "GET" });
}

export async function findRoutineSessions(id: string): Promise<any[]> {
  return await apiFetch(`routines/${id}/sessions`, { method: "GET" });
}

export async function getGlobalStats(): Promise<any> {
  return await apiFetch("routines/stats/global", {
    method: "GET",
  });
}
