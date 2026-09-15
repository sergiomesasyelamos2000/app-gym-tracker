import { Platform } from "react-native";
import { createAndroidHealthClient } from "./androidHealthClient";
import { createIosHealthClient } from "./iosHealthClient";
import type { HealthAuthorizationStatus, HealthClient } from "./types";

const unavailableClient: HealthClient = {
  async isAvailable() {
    return false;
  },
  async getAuthorizationStatus() {
    return "unavailable";
  },
  async requestAuthorization() {
    return "unavailable";
  },
  async getWorkoutMetrics() {
    return null;
  },
  async writeWorkout() {
    return false;
  },
  async getRestSummary() {
    return { sleepHoursLastNight: null, stepsLast7Days: null };
  },
};

let cachedClient: HealthClient | null = null;

export function getHealthClient(): HealthClient {
  if (cachedClient) return cachedClient;

  if (Platform.OS === "ios") {
    cachedClient = createIosHealthClient();
  } else if (Platform.OS === "android") {
    cachedClient = createAndroidHealthClient();
  } else {
    cachedClient = unavailableClient;
  }

  return cachedClient;
}

export async function requestHealthAuthorization(): Promise<HealthAuthorizationStatus> {
  return getHealthClient().requestAuthorization();
}

export async function getHealthAuthorizationStatus(): Promise<HealthAuthorizationStatus> {
  const client = getHealthClient();
  if (!(await client.isAvailable())) return "unavailable";
  return client.getAuthorizationStatus();
}
