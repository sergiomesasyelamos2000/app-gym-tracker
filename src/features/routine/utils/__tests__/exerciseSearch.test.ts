import {
  buildCombinedMuscleOptions,
  exerciseMatchesEquipment,
  exerciseMatchesMuscle,
  filterAndSortExercises,
  scoreExerciseSearch,
  tokenizeSearch,
  normalizeSearchText,
} from "../exerciseSearch";

const chestPress = {
  id: "1",
  name: "Press de banca con barra",
  equipments: ["Barra"],
  targetMuscles: ["Pectorales"],
  bodyParts: ["Pecho"],
  secondaryMuscles: ["Tríceps", "Deltoides"],
};

const cableFly = {
  id: "2",
  name: "Aperturas en polea",
  equipments: ["Polea"],
  targetMuscles: ["Pectorales"],
  bodyParts: ["Pecho"],
  secondaryMuscles: [],
};

const curl = {
  id: "3",
  name: "Curl de bíceps con mancuernas",
  equipments: ["Mancuernas"],
  targetMuscles: ["Bíceps"],
  bodyParts: ["Brazos superiores"],
  secondaryMuscles: ["Antebrazos"],
};

describe("exerciseSearch", () => {
  it("matches Pecho filter to pectorales/chest exercises", () => {
    expect(exerciseMatchesMuscle(chestPress, "Pecho")).toBe(true);
    expect(exerciseMatchesMuscle(cableFly, "Pectorales")).toBe(true);
    expect(exerciseMatchesMuscle(curl, "Pecho")).toBe(false);
  });

  it("matches Cable filter to Polea equipment", () => {
    expect(exerciseMatchesEquipment(cableFly, "Cable")).toBe(true);
    expect(exerciseMatchesEquipment(cableFly, "Polea")).toBe(true);
    expect(exerciseMatchesEquipment(chestPress, "Cable")).toBe(false);
  });

  it("requires all query tokens (AND) and ranks name hits higher", () => {
    const query = "press banca";
    const tokens = tokenizeSearch(query);
    const normalized = normalizeSearchText(query);

    const pressScore = scoreExerciseSearch(chestPress, normalized, tokens);
    const flyScore = scoreExerciseSearch(cableFly, normalized, tokens);
    const curlScore = scoreExerciseSearch(curl, normalized, tokens);

    expect(pressScore).toBeGreaterThan(0);
    expect(flyScore).toBe(0);
    expect(curlScore).toBe(0);
  });

  it("finds exercises by equipment/muscle text in search", () => {
    const results = filterAndSortExercises([chestPress, cableFly, curl], {
      searchQuery: "polea",
      selectedEquipmentNames: [],
      selectedMuscleNames: [],
    });

    expect(results.map((item) => item.id)).toEqual(["2"]);
  });

  it("dedupes Pecho/Pectorales muscle chips by alias", () => {
    const options = buildCombinedMuscleOptions(
      [{ id: "m1", name: "Pecho" }],
      [chestPress, cableFly]
    );

    const pechoLike = options.filter((item) =>
      /pecho|pectoral/i.test(item.name)
    );
    expect(pechoLike).toHaveLength(1);
    expect(pechoLike[0].name).toBe("Pecho");
  });

  it("applies equipment + muscle filters together", () => {
    const results = filterAndSortExercises([chestPress, cableFly, curl], {
      searchQuery: "",
      selectedEquipmentNames: ["Cable"],
      selectedMuscleNames: ["Pecho"],
    });

    expect(results.map((item) => item.id)).toEqual(["2"]);
  });
});
