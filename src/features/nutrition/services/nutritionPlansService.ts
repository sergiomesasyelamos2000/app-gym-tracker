import type {
  GenerateNutritionPlanRequestDto as GenerateNutritionPlanRequest,
  NutritionPlanResponseDto as NutritionPlan,
  UpdateNutritionPlanDto as UpdateNutritionPlanRequest,
} from "@sergiomesasyelamos2000/shared";
import { apiFetch } from "../../../api/client";
import { getCurrentUserId } from "./nutritionService";

const PLAN_GENERATION_TIMEOUT_MS = 240000;

export async function getNutritionPlans(
  userId?: string
): Promise<NutritionPlan[]> {
  const id = userId || getCurrentUserId();
  return apiFetch<NutritionPlan[]>(`nutrition/plans/${id}`, {
    method: "GET",
  });
}

export async function getActiveNutritionPlan(
  userId?: string
): Promise<NutritionPlan | null> {
  const id = userId || getCurrentUserId();
  return apiFetch<NutritionPlan | null>(`nutrition/plans/${id}/active`, {
    method: "GET",
  });
}

export async function getNutritionPlanById(
  planId: string,
  userId?: string
): Promise<NutritionPlan> {
  const id = userId || getCurrentUserId();
  return apiFetch<NutritionPlan>(`nutrition/plans/${id}/${planId}`, {
    method: "GET",
  });
}

export async function generateNutritionPlan(
  request: Omit<GenerateNutritionPlanRequest, "userId"> & {
    userId?: string;
  }
): Promise<NutritionPlan> {
  const userId = request.userId || getCurrentUserId();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, PLAN_GENERATION_TIMEOUT_MS);

  try {
    return await apiFetch<NutritionPlan>("nutrition/plans/generate", {
      method: "POST",
      body: JSON.stringify({ ...request, userId }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function updateNutritionPlan(
  planId: string,
  updates: UpdateNutritionPlanRequest
): Promise<NutritionPlan> {
  const userId = getCurrentUserId();
  return apiFetch<NutritionPlan>(`nutrition/plans/${planId}`, {
    method: "PUT",
    body: JSON.stringify({ ...updates, userId }),
  });
}

export async function activateNutritionPlan(
  planId: string,
  userId?: string
): Promise<NutritionPlan> {
  const id = userId || getCurrentUserId();
  return apiFetch<NutritionPlan>(
    `nutrition/plans/${planId}/activate?userId=${encodeURIComponent(id)}`,
    {
      method: "PUT",
    }
  );
}

export async function deleteNutritionPlan(
  planId: string,
  userId?: string
): Promise<void> {
  const id = userId || getCurrentUserId();
  return apiFetch<void>(
    `nutrition/plans/${planId}?userId=${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}
