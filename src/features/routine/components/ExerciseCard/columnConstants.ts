// Flex values and spacing shared between ExerciseSetList (headers)
// and ExerciseSetRow (rows) so columns stay aligned.

/** Workout mode (`started`): SERIE · ANTERIOR · KG · REPS · ASIS · ✓ */
export type StartedColumnFlex = {
  serie: number;
  anterior: number;
  weight: number;
  reps: number;
  assisted: number;
  check: number;
};

/** Idle detail/edit (`!started`): SERIE · KG · REPS/RANGO */
export type IdleColumnFlex = {
  serie: number;
  weight: number;
  reps: number;
  repsRange: number;
};

export const COLUMN_FLEX_STARTED = {
  small: {
    serie: 0.7,
    anterior: 1.55,
    weight: 2.1,
    reps: 1.9,
    assisted: 1.0,
    check: 0.9,
  } satisfies StartedColumnFlex,
  normal: {
    serie: 0.7,
    anterior: 1.6,
    weight: 2.2,
    reps: 2.0,
    assisted: 1.0,
    check: 0.9,
  } satisfies StartedColumnFlex,
} as const;

export const COLUMN_FLEX_IDLE = {
  small: {
    serie: 0.9,
    weight: 2.3,
    reps: 2.3,
    repsRange: 3.0,
  } satisfies IdleColumnFlex,
  normal: {
    serie: 0.9,
    weight: 2.4,
    reps: 2.4,
    repsRange: 3.2,
  } satisfies IdleColumnFlex,
} as const;

/** @deprecated Prefer getColumnFlex(isSmall, started) */
export const COLUMN_FLEX = {
  small: {
    ...COLUMN_FLEX_STARTED.small,
    repsRange: COLUMN_FLEX_IDLE.small.repsRange,
  },
  normal: {
    ...COLUMN_FLEX_STARTED.normal,
    repsRange: COLUMN_FLEX_IDLE.normal.repsRange,
  },
};

/** Horizontal gap applied to weight / reps / asis columns in header and rows. */
export const COLUMN_GAP = 4;

/** Horizontal padding for the header bar and each set row. */
export const COLUMN_ROW_PADDING = {
  small: 4,
  normal: 8,
} as const;

export const SET_INPUT = {
  height: { small: 40, normal: 44 },
  paddingH: { small: 4, normal: 6 },
  paddingV: { small: 8, normal: 10 },
  fontSize: { small: 15, normal: 16 },
  radius: 8,
  borderWidth: 1,
} as const;

export const SET_CHECK = {
  size: { small: 28, normal: 32 },
  radius: 8,
} as const;

export const SET_BADGE = {
  size: { small: 26, normal: 28 },
  radius: 6,
} as const;

export function getColumnFlex(
  isSmallScreen: boolean,
  started: true
): StartedColumnFlex;
export function getColumnFlex(
  isSmallScreen: boolean,
  started: false
): IdleColumnFlex;
export function getColumnFlex(
  isSmallScreen: boolean,
  started?: boolean
): StartedColumnFlex | IdleColumnFlex;
export function getColumnFlex(isSmallScreen: boolean, started = true) {
  if (started) {
    return isSmallScreen
      ? COLUMN_FLEX_STARTED.small
      : COLUMN_FLEX_STARTED.normal;
  }
  return isSmallScreen ? COLUMN_FLEX_IDLE.small : COLUMN_FLEX_IDLE.normal;
}

export const getRepsColumnFlex = (
  isSmallScreen: boolean,
  repsType: "reps" | "range",
  started: boolean
) => {
  if (!started && repsType === "range") {
    const flex = getColumnFlex(isSmallScreen, false);
    return flex.repsRange;
  }
  return getColumnFlex(isSmallScreen, started).reps;
};

/** Shared container style so header label and row marks share the same axis. */
export function getAnteriorColumnStyle(isSmallScreen: boolean) {
  return {
    flex: getColumnFlex(isSmallScreen, true).anterior,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minWidth: 0,
  };
}
