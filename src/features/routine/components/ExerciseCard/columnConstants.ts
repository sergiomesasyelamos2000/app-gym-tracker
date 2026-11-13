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
  // serie ≥ badge (~26–28px) on narrow phones; anterior keeps room for "90kg x 15"
  small: {
    serie: 0.9,
    anterior: 1.5,
    weight: 2.05,
    reps: 1.85,
    assisted: 1.0,
    check: 0.9,
  } satisfies StartedColumnFlex,
  normal: {
    serie: 0.95,
    anterior: 1.55,
    weight: 2.15,
    reps: 1.95,
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

/**
 * Extra gutter between SERIE badge and ANTERIOR mark (mobile-first).
 * Larger than COLUMN_GAP so long marks ("90kg x 15") never sit flush on the badge.
 */
export const SERIE_ANTERIOR_GAP = {
  small: 6,
  normal: 8,
} as const;

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

/** Shared SERIE column so header and rows keep the same flex + gutter. */
export function getSerieColumnStyle(
  isSmallScreen: boolean,
  started: boolean
) {
  const flex = getColumnFlex(isSmallScreen, started).serie;
  const serieAnteriorGap = isSmallScreen
    ? SERIE_ANTERIOR_GAP.small
    : SERIE_ANTERIOR_GAP.normal;
  return {
    flex,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minWidth: 0,
    // Only when ANTERIOR is present (live workout) reserve a right gutter.
    ...(started ? { marginRight: serieAnteriorGap / 2 } : {}),
  };
}

/** Shared container style so header label and row marks share the same axis. */
export function getAnteriorColumnStyle(isSmallScreen: boolean) {
  const serieAnteriorGap = isSmallScreen
    ? SERIE_ANTERIOR_GAP.small
    : SERIE_ANTERIOR_GAP.normal;
  return {
    flex: getColumnFlex(isSmallScreen, true).anterior,
    // stretch + overflow so long marks ("64kg x 10") get a real max width
    // and cannot paint over the serie badge (header keeps textAlign center).
    alignItems: "stretch" as const,
    justifyContent: "center" as const,
    minWidth: 0,
    overflow: "hidden" as const,
    // Push mark text away from the SERIE badge on narrow phones.
    paddingLeft: serieAnteriorGap,
    paddingRight: COLUMN_GAP / 2,
  };
}
