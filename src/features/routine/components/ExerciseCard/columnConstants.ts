// Flex values compartidos entre ExerciseSetList (headers) y ExerciseSetRow (rows)
// para asegurar alineación perfecta de columnas

export const COLUMN_FLEX = {
  // Pantallas pequeñas (< 380px)
  small: {
    serie: 0.8,
    anterior: 2.2,
    weight: 1.35,
    reps: 1.35,
    assisted: 1.1,
    repsRange: 2.2, // Más espacio para rango
    check: 0.8,
  },
  // Pantallas normales (>= 380px)
  normal: {
    serie: 1,
    anterior: 2.5,
    weight: 1.8,
    reps: 1.8,
    assisted: 1.3,
    repsRange: 3.1, // Más espacio para rango
    check: 1,
  },
};
