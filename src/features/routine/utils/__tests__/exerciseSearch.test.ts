import {
  buildCombinedMuscleOptions,
  exerciseMatchesEquipment,
  exerciseMatchesMuscle,
  filterAndSortExercises,
  getEquipmentAliasKeys,
  getMuscleAliasKeys,
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

  it("expands muscle/equipment alias keys for common Spanish labels", () => {
    expect(getMuscleAliasKeys("Pecho")).toEqual(
      expect.arrayContaining(["pecho", "chest", "pectorales"])
    );
    expect(getEquipmentAliasKeys("Polea")).toEqual(
      expect.arrayContaining(["polea", "cable"])
    );
    expect(getEquipmentAliasKeys("Mancuernas")).toEqual(
      expect.arrayContaining(["mancuernas", "dumbbell"])
    );
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

  it("orders by popularity when there is no text query", () => {
    const obscure = {
      ...cableFly,
      id: "2",
      name: "Band chest fly obscure",
      popularity: 0,
    };
    const staple = {
      ...chestPress,
      id: "1",
      name: "Press de banca con barra",
      popularity: 0,
    };
    const mid = {
      ...curl,
      id: "3",
      name: "Curl de bíceps con mancuernas",
      popularity: 0,
    };

    const results = filterAndSortExercises([obscure, mid, staple], {
      searchQuery: "",
      selectedEquipmentNames: [],
      selectedMuscleNames: [],
    });

    expect(results.map((item) => item.id)).toEqual(["1", "3", "2"]);
  });

  it("keeps search score first, then popularity as tiebreaker", () => {
    const weakerName = {
      ...chestPress,
      id: "a",
      name: "Apertura de pecho en máquina",
      popularity: 100,
    };
    const strongerName = {
      ...chestPress,
      id: "b",
      name: "Press de banca",
      popularity: 10,
    };

    const results = filterAndSortExercises([weakerName, strongerName], {
      searchQuery: "press banca",
      selectedEquipmentNames: [],
      selectedMuscleNames: [],
    });

    expect(results[0].id).toBe("b");
  });

  it("puts classic lifts above assisted/band variants with zero stored popularity", () => {
    const assisted = {
      id: "x",
      name: "Assisted chest dip (kneeling)",
      equipments: [],
      targetMuscles: [],
      bodyParts: [],
      popularity: 0,
    };
    const bench = {
      id: "y",
      name: "Barbell bench press",
      equipments: [],
      targetMuscles: [],
      bodyParts: [],
      popularity: 0,
    };

    const results = filterAndSortExercises([assisted, bench], {
      searchQuery: "",
      selectedEquipmentNames: [],
      selectedMuscleNames: [],
    });

    expect(results.map((item) => item.id)).toEqual(["y", "x"]);
  });
});
