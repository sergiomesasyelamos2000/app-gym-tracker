export function getNutritionGradeColor(grade: string): string {
  const normalizedGrade = grade.toLowerCase();
  switch (normalizedGrade) {
    case "a":
      return "#038141";
    case "b":
      return "#85BB2F";
    case "c":
      return "#FECB02";
    case "d":
      return "#EE8100";
    case "e":
      return "#E63E11";
    default:
      return "#999999";
  }
}
