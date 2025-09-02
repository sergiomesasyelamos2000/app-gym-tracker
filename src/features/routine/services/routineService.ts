import { RoutineRequestDto } from "../../../models/index.js";
import { apiFetch } from "../../../api/index";

export async function saveRoutine(
  routineRequestDto: RoutineRequestDto
): Promise<void> {
  await apiFetch("routines", {
    method: "POST",
    body: JSON.stringify(routineRequestDto),
  });
}

export async function findRoutines(): Promise<any[]> {
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
