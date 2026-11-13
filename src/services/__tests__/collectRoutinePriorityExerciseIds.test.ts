import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collectRoutinePriorityExerciseIds,
  extractExerciseIdsFromRoutine,
} from "../collectRoutinePriorityExerciseIds";

const memory = new Map<string, string>();

describe("extractExerciseIdsFromRoutine", () => {
  it("reads routineExercises[].exercise.id", () => {
    expect(
      extractExerciseIdsFromRoutine({
        id: "r1",
        routineExercises: [
          { id: "re1", exercise: { id: "e1" } },
          { id: "re2", exercise: { id: "e2" } },
        ],
      })
    ).toEqual(["e1", "e2"]);
  });

  it("accepts exerciseId and exercises[].id aliases", () => {
    expect(
      extractExerciseIdsFromRoutine({
        routineExercises: [{ exerciseId: "a" }],
        exercises: [{ id: "b" }, { exerciseId: "c" }],
      })
    ).toEqual(["a", "b", "c"]);
  });

  it("dedupes and ignores invalid shapes", () => {
    expect(extractExerciseIdsFromRoutine(null)).toEqual([]);
    expect(
      extractExerciseIdsFromRoutine({
        routineExercises: [
          { exercise: { id: "e1" } },
          { exercise: { id: "e1" } },
          null,
          "x",
        ],
      })
    ).toEqual(["e1"]);
  });
});

describe("collectRoutinePriorityExerciseIds", () => {
  beforeEach(() => {
    memory.clear();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      memory.has(key) ? memory.get(key)! : null
    );
    (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () =>
      Array.from(memory.keys())
    );
    (AsyncStorage.multiGet as jest.Mock).mockImplementation(
      async (keys: string[]) => keys.map((k) => [k, memory.get(k) ?? null])
    );
  });

  it("merges list, local, and detail caches; skips folders/mapping", async () => {
    memory.set(
      "@routines_cache",
      JSON.stringify([
        {
          id: "r1",
          routineExercises: [{ exercise: { id: "from-list" } }],
        },
      ])
    );
    memory.set(
      "@local_routines",
      JSON.stringify([
        {
          id: "local_1",
          routineExercises: [{ exercise: { id: "from-local" } }],
        },
      ])
    );
    memory.set(
      "@routine_detail_1",
      JSON.stringify({
        id: "detail_1",
        routineExercises: [{ exercise: { id: "from-detail" } }],
      })
    );
    memory.set("@routine_folders_cache", JSON.stringify([{ id: "f1" }]));
    memory.set("@routine_id_mapping", JSON.stringify({ local_1: "srv_1" }));

    await expect(collectRoutinePriorityExerciseIds()).resolves.toEqual([
      "from-list",
      "from-local",
      "from-detail",
    ]);
  });

  it("skips corrupt JSON without throwing", async () => {
    memory.set("@routines_cache", "{not-json");
    memory.set(
      "@local_routines",
      JSON.stringify([
        { id: "r", routineExercises: [{ exercise: { id: "ok" } }] },
      ])
    );
    await expect(collectRoutinePriorityExerciseIds()).resolves.toEqual(["ok"]);
  });
});
