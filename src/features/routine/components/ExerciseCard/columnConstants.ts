// Flex values and spacing shared between ExerciseSetList (headers)
// and ExerciseSetRow (rows) so columns stay aligned.

export const COLUMN_FLEX = {
  // Pantallas pequeñas (< 380px)
  small: {
    serie: 0.8,
    anterior: 2.2,
    weight: 1.35,
    reps: 1.35,
    assisted: 1.1,
    repsRange: 2.2,
    check: 0.8,
  },
  // Pantallas normales (>= 380px)
  normal: {
    serie: 1,
    anterior: 2.5,
    weight: 1.8,
    reps: 1.8,
    assisted: 1.3,
    repsRange: 3.1,
    check: 1,
  },
};

/** Horizontal gap applied to weight / reps / asis columns in header and rows. */
export const COLUMN_GAP = 1;

/** Horizontal padding for the header bar and each set row. */
export const COLUMN_ROW_PADDING = {
  small: 8,
  normal: 12,
} as const;

export const getColumnFlex = (isSmallScreen: boolean) =>
  isSmallScreen ? COLUMN_FLEX.small : COLUMN_FLEX.normal;

export const getRepsColumnFlex = (
  isSmallScreen: boolean,
  repsType: "reps" | "range",
  started: boolean
) => {
  const flex = getColumnFlex(isSmallScreen);
  return !started && repsType === "range" ? flex.repsRange : flex.reps;
};
