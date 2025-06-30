import { RoutineRequestDto } from "../models/index.js";
import { apiFetch } from "./api";

export async function saveRoutine(
  routineRequestDto: RoutineRequestDto
): Promise<void> {
  await apiFetch("routines", {
    method: "POST",
    body: JSON.stringify(routineRequestDto),
  });
}
