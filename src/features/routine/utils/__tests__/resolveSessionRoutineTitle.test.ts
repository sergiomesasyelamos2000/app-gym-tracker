import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  attachRoutineSnapshot,
  buildRoutineTitleMap,
  coalesceSessionTitle,
  healSessionRoutineTitle,
  loadRoutineTitleMap,
  preserveClientRoutineTitle,
  readRoutineId,
  readRoutineTitle,
  resolveSessionRoutineTitle,
  stripRoutineForApi,
} from "../resolveSessionRoutineTitle";

describe("resolveSessionRoutineTitle helpers", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      memory.has(key) ? memory.get(key)! : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        memory.set(key, value);
      }
    );
  });

  it("readRoutineTitle trims and treats blank as missing", () => {
    expect(readRoutineTitle({ routine: { id: "r1", title: "  Push  " } })).toBe(
      "Push"
    );
    expect(readRoutineTitle({ routine: { id: "r1", title: "   " } })).toBeUndefined();
    expect(readRoutineTitle({ routineId: "r1" })).toBeUndefined();
  });

  it("readRoutineId prefers routineId then routine.id", () => {
    expect(readRoutineId({ routineId: "r1", routine: { id: "r2" } })).toBe("r1");
    expect(readRoutineId({ routine: { id: "r2", title: "X" } })).toBe("r2");
  });

  it("attachRoutineSnapshot sets routine when title is non-blank", () => {
    const result = attachRoutineSnapshot(
      { totalTime: 10, exercises: [] },
      { id: "r1", title: "  Legs  " }
    );
    expect(result).toEqual({
      totalTime: 10,
      exercises: [],
      routineId: "r1",
      routine: { id: "r1", title: "Legs" },
    });
  });

  it("attachRoutineSnapshot only sets routineId when title is blank", () => {
    const result = attachRoutineSnapshot(
      { totalTime: 10 },
      { id: "r1", title: "  " }
    );
    expect(result).toEqual({ totalTime: 10, routineId: "r1" });
    expect(result).not.toHaveProperty("routine");
  });

  it("stripRoutineForApi omits routine, id, createdAt, and _isPending", () => {
    const stripped = stripRoutineForApi({
      id: "local_session_1",
      createdAt: new Date("2026-01-01"),
      routineId: "r1",
      routine: { id: "r1", title: "Push" },
      totalTime: 60,
      totalWeight: 100,
      completedSets: 3,
      exercises: [],
      _isPending: true,
    } as never);

    expect(stripped).toEqual({
      routineId: "r1",
      totalTime: 60,
      totalWeight: 100,
      completedSets: 3,
      exercises: [],
    });
    expect(stripped).not.toHaveProperty("routine");
    expect(stripped).not.toHaveProperty("id");
    expect(stripped).not.toHaveProperty("createdAt");
    expect(stripped).not.toHaveProperty("_isPending");
  });

  it("preserveClientRoutineTitle reattaches requested title onto saved row", () => {
    const preserved = preserveClientRoutineTitle(
      { id: "srv-1", routineId: "r1", routine: { id: "r1" }, totalTime: 10 } as never,
      { routineId: "r1", routine: { id: "r1", title: "Push Day" } },
      "r1"
    );
    expect(preserved.routine).toEqual({ id: "r1", title: "Push Day" });
  });

  it("preserveClientRoutineTitle keeps saved title when present", () => {
    const preserved = preserveClientRoutineTitle(
      {
        id: "srv-1",
        routine: { id: "r1", title: "From Server" },
      } as never,
      { routine: { id: "r1", title: "From Client" } },
      "r1"
    );
    expect(preserved.routine?.title).toBe("From Server");
  });

  it("buildRoutineTitleMap skips blanks and keeps first id", () => {
    const map = buildRoutineTitleMap([
      { id: "r1", title: "Push" },
      { id: "r1", title: "Other" },
      { id: "r2", title: "  " },
      { id: "r3", title: " Pull " },
    ]);
    expect(map.get("r1")).toBe("Push");
    expect(map.has("r2")).toBe(false);
    expect(map.get("r3")).toBe("Pull");
  });

  it("resolveSessionRoutineTitle prefers existing title over map", () => {
    const map = new Map([["r1", "From Map"]]);
    expect(
      resolveSessionRoutineTitle(
        { routineId: "r1", routine: { id: "r1", title: "Stored" } },
        map
      )
    ).toBe("Stored");
    expect(resolveSessionRoutineTitle({ routineId: "r1" }, map)).toBe("From Map");
  });

  it("healSessionRoutineTitle fills blank title from map", () => {
    const healed = healSessionRoutineTitle(
      { id: "s1", routineId: "r1", totalTime: 1 } as never,
      new Map([["r1", "Healed Push"]])
    );
    expect(healed.routine).toEqual({ id: "r1", title: "Healed Push" });
  });

  it("healSessionRoutineTitle is a no-op when title already set", () => {
    const input = {
      id: "s1",
      routineId: "r1",
      routine: { id: "r1", title: "Keep" },
    };
    expect(
      healSessionRoutineTitle(input, new Map([["r1", "Other"]]))
    ).toBe(input);
  });

  it("coalesceSessionTitle copies title onto preferred when blank", () => {
    const result = coalesceSessionTitle(
      {
        id: "s1",
        routineId: "r1",
        exercises: [{ exerciseId: "e1", name: "Squat", sets: [] }],
        totalWeight: 500,
      } as never,
      { routine: { id: "r1", title: "Legs" } }
    );
    expect(result.totalWeight).toBe(500);
    expect(result.exercises).toHaveLength(1);
    expect(result.routine).toEqual({ id: "r1", title: "Legs" });
  });

  it("loadRoutineTitleMap aliases local and server ids via mapping", async () => {
    memory.set(
      "@routines_cache",
      JSON.stringify([
        { id: "server-r1", title: "Push" },
        { id: "server-r2", title: "Pull" },
      ])
    );
    memory.set(
      "@local_routines",
      JSON.stringify([{ id: "local_orphan", title: "Orphan" }])
    );
    memory.set(
      "@routine_id_mapping",
      JSON.stringify({
        local_r1: "server-r1",
        local_orphan: "server-orphan",
      })
    );

    const map = await loadRoutineTitleMap();
    expect(map.get("server-r1")).toBe("Push");
    expect(map.get("local_r1")).toBe("Push");
    expect(map.get("local_orphan")).toBe("Orphan");
    expect(map.get("server-orphan")).toBe("Orphan");
    expect(map.get("server-r2")).toBe("Pull");
  });
});
