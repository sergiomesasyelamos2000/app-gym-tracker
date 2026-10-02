import {
  buildExerciseFilterIndex,
  indexedExerciseMatchesEquipment,
  indexedExerciseMatchesMuscle,
  prepareNameFilter,
  rankChipsFromIndex,
  remapFilterSelectionIds,
  withSelectedChips,
  DERIVED_MUSCLE_PREFIX,
} from "../exerciseFilterIndex";
import {
  exerciseMatchesEquipment,
  exerciseMatchesMuscle,
  filterAndSortExercises,
  getEquipmentAliasKeys,
  getMuscleAliasKeys,
  mergeFilterOptionsByAlias,
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

const exoticPress = {
  id: "4",
  name: "Press exótico",
  equipments: ["Sissy bar"],
  targetMuscles: ["Serratus anterior"],
  bodyParts: [],
  secondaryMuscles: [],
};

describe("exerciseFilterIndex", () => {
  const catalog = [chestPress, cableFly, curl, exoticPress];
  const index = buildExerciseFilterIndex(catalog, 1);

  it("matches Pecho/Pectorales via index the same as legacy matchers", () => {
    const pecho = prepareNameFilter(["Pecho"], getMuscleAliasKeys);
    const pectorales = prepareNameFilter(["Pectorales"], getMuscleAliasKeys);

    index.entries.forEach((entry) => {
      expect(indexedExerciseMatchesMuscle(entry, pecho)).toBe(
        exerciseMatchesMuscle(entry.exercise, "Pecho")
      );
      expect(indexedExerciseMatchesMuscle(entry, pectorales)).toBe(
        exerciseMatchesMuscle(entry.exercise, "Pectorales")
      );
    });
  });

  it("matches Cable/Polea via index the same as legacy matchers", () => {
    const cable = prepareNameFilter(["Cable"], getEquipmentAliasKeys);
    const polea = prepareNameFilter(["Polea"], getEquipmentAliasKeys);

    index.entries.forEach((entry) => {
      expect(indexedExerciseMatchesEquipment(entry, cable)).toBe(
        exerciseMatchesEquipment(entry.exercise, "Cable")
      );
      expect(indexedExerciseMatchesEquipment(entry, polea)).toBe(
        exerciseMatchesEquipment(entry.exercise, "Polea")
      );
    });
  });

  it("keeps ungrouped prefix/substring fuzzy parity", () => {
    expect(exerciseMatchesMuscle(exoticPress, "Serratus")).toBe(true);
    const prepared = prepareNameFilter(["Serratus"], getMuscleAliasKeys);
    const entry = index.entries.find((item) => item.exercise.id === "4")!;
    expect(indexedExerciseMatchesMuscle(entry, prepared)).toBe(true);
  });

  it("filterAndSortExercises indexed path matches unindexed path", () => {
    const cases = [
      {
        searchQuery: "",
        selectedEquipmentNames: ["Cable"],
        selectedMuscleNames: ["Pecho"],
      },
      {
        searchQuery: "press",
        selectedEquipmentNames: [] as string[],
        selectedMuscleNames: [] as string[],
      },
      {
        searchQuery: "",
        selectedEquipmentNames: [] as string[],
        selectedMuscleNames: ["Bíceps"],
      },
    ];

    cases.forEach((options) => {
      const withoutIndex = filterAndSortExercises(catalog, options);
      const withIndex = filterAndSortExercises(catalog, {
        ...options,
        index,
      });
      expect(withIndex.map((item) => item.id)).toEqual(
        withoutIndex.map((item) => item.id)
      );
    });
  });

  it("counts usage per source label (Pecho + Pectorales both increment)", () => {
    const pechoKey = "pecho";
    const pectoralesKey = "pectorales";
    // chestPress and cableFly each contribute Pecho + Pectorales labels
    expect(index.usageByMuscle.get(pechoKey)).toBeGreaterThanOrEqual(4);
    expect(index.usageByMuscle.get(pectoralesKey)).toBeGreaterThanOrEqual(4);
  });

  it("rankChipsFromIndex + withSelectedChips caps at max and appends selection", () => {
    const options = mergeFilterOptionsByAlias(
      [
        { id: "a", name: "Alpha rare" },
        { id: "b", name: "Beta common" },
        { id: "c", name: "Gamma mid" },
      ],
      [],
      getMuscleAliasKeys,
      "derived-muscle-"
    );

    const usage = new Map<string, number>([
      ["beta common", 100],
      ["gamma mid", 50],
      ["alpha rare", 1],
    ]);

    const ranked = rankChipsFromIndex(options, usage, 2, getMuscleAliasKeys);
    expect(ranked.top).toHaveLength(2);
    expect(ranked.top.map((item) => item.id)).toEqual(["b", "c"]);

    const withSelected = withSelectedChips(ranked, ["a"]);
    expect(withSelected.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("remaps derived-* selection ids onto official options", () => {
    const options = [
      { id: "m-official", name: "Pecho" },
      { id: "m-other", name: "Espalda" },
    ];
    const derivedId = `${DERIVED_MUSCLE_PREFIX}chest`;

    const remapped = remapFilterSelectionIds(
      [derivedId],
      options,
      getMuscleAliasKeys,
      DERIVED_MUSCLE_PREFIX
    );

    expect(remapped).toEqual(["m-official"]);
  });
});
