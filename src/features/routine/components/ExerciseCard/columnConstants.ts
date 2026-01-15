// Flex values compartidos entre ExerciseSetList (headers) y ExerciseSetRow (rows)
// para asegurar alineación perfecta de columnas

export const COLUMN_FLEX = {
  // Pantallas pequeñas (< 380px)
  small: {
    serie: 0.8,
    anterior: 2.2,
    weight: 1.5,
    reps: 1.5,
    repsRange: 2.5, // Más espacio para rango
    check: 0.8,
  },
  // Pantallas normales (>= 380px)
  normal: {
    serie: 1,
    anterior: 2.5,
    weight: 2,
    reps: 2,
    repsRange: 3.5, // Más espacio para rango
    check: 1,
  },
};
