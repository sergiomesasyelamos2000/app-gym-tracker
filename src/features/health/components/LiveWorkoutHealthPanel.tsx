import React, { useEffect } from "react";
import { WorkoutHealthStrip } from "./WorkoutHealthStrip";
import { useWorkoutHealthMetrics } from "../useWorkoutHealthMetrics";
import type { WorkoutHealthSnapshot } from "../types";

type Props = {
  enabled: boolean;
  getStartTime: () => number;
  getDurationSeconds: () => number;
  /** Parent keeps a ref — do not store this in React state or the screen will re-render every poll. */
  onSnapshotChange?: (snapshot: WorkoutHealthSnapshot) => void;
};

/**
 * Owns health polling so RoutineDetailScreen does not re-render on every sample.
 */
export function LiveWorkoutHealthPanel({
  enabled,
  getStartTime,
  getDurationSeconds,
  onSnapshotChange,
}: Props) {
  const snapshot = useWorkoutHealthMetrics({
    enabled,
    getStartTime,
    getDurationSeconds,
  });

  useEffect(() => {
    onSnapshotChange?.(snapshot);
  }, [snapshot, onSnapshotChange]);

  if (!enabled) return null;

  return (
    <WorkoutHealthStrip
      heartRateBpm={snapshot.heartRateBpm}
      caloriesBurned={snapshot.caloriesBurned}
      source={snapshot.source}
    />
  );
}
