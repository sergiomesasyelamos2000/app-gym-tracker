import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../../../../api/client";
import {
  findRoutineSessions,
  upsertRoutineSessionCaches,
} from "../routineService";

jest.mock("../../../../api/client", () => ({
  apiFetch: jest.fn(),
}));

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("findRoutineSessions local-first merge", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    mockedApiFetch.mockReset();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      memory.has(key) ? memory.get(key)! : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        memory.set(key, value);
      }
    );
  });

  it("returns per-routine cache offline without awaiting network", async () => {
    const cached = [
      {
        id: "s1",
        routineId: "r1",
        exercises: [
          {
            exerciseId: "e1",
            name: "Squat",
            sets: [{ weight: 100, reps: 5, completed: true }],
          },
        ],
        totalTime: 60,
        totalWeight: 500,
        completedSets: 1,
        createdAt: "2026-10-01T10:00:00.000Z",
      },
    ];
    memory.set("@sessions_routine_r1", JSON.stringify(cached));
    mockedApiFetch.mockRejectedValue(new Error("offline"));

    const result = await findRoutineSessions("r1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
    expect(result[0].exercises?.[0]?.sets?.[0]?.weight).toBe(100);
  });

  it("merges @local_sessions and global cache for the routine", async () => {
    memory.set(
      "@local_sessions",
      JSON.stringify([
        {
          id: "local_s1",
          routineId: "r1",
          exercises: [
            {
              exerciseId: "e1",
              name: "Squat",
              sets: [{ weight: 110, reps: 3, completed: true }],
            },
          ],
          totalTime: 50,
          totalWeight: 330,
          completedSets: 1,
          createdAt: "2026-10-14T10:00:00.000Z",
        },
      ])
    );
    memory.set(
      "@sessions_cache_v2",
      JSON.stringify([
        {
          id: "server_s1",
          routineId: "r1",
          exercises: [
            {
              exerciseId: "e1",
              name: "Squat",
              sets: [{ weight: 100, reps: 5, completed: true }],
            },
          ],
          totalTime: 60,
          totalWeight: 500,
          completedSets: 1,
          createdAt: "2026-10-01T10:00:00.000Z",
        },
        {
          id: "other",
          routineId: "r2",
          exercises: [],
          totalTime: 0,
          totalWeight: 0,
          completedSets: 0,
          createdAt: "2026-10-02T10:00:00.000Z",
        },
      ])
    );
    mockedApiFetch.mockRejectedValue(new Error("offline"));

    const result = await findRoutineSessions("r1");
    expect(result.map((s) => s.id).sort()).toEqual(["local_s1", "server_s1"]);
    expect(result[0].id).toBe("local_s1");
  });

  it("calls onNetworkUpdate when background refresh succeeds with local cache", async () => {
    memory.set(
      "@sessions_routine_r1",
      JSON.stringify([
        {
          id: "cached",
          routineId: "r1",
          exercises: [
            {
              exerciseId: "e1",
              name: "Squat",
              sets: [{ weight: 90, reps: 5, completed: true }],
            },
          ],
          totalTime: 60,
          totalWeight: 450,
          completedSets: 1,
          createdAt: "2026-10-01T10:00:00.000Z",
        },
      ])
    );
    const networkSessions = [
      {
        id: "fresh",
        routineId: "r1",
        exercises: [
          {
            exerciseId: "e1",
            name: "Squat",
            sets: [{ weight: 100, reps: 5, completed: true }],
          },
        ],
        totalTime: 60,
        totalWeight: 500,
        completedSets: 1,
        createdAt: "2026-10-14T10:00:00.000Z",
      },
    ];
    mockedApiFetch.mockResolvedValue(networkSessions as never);

    const updates: string[][] = [];
    const result = await findRoutineSessions("r1", {
      onNetworkUpdate: (sessions) => {
        updates.push(sessions.map((s) => s.id));
      },
    });

    expect(result.map((s) => s.id)).toEqual(["cached"]);
    await Promise.resolve();
    await Promise.resolve();
    expect(updates.some((ids) => ids.includes("fresh"))).toBe(true);
  });

  it("upsertRoutineSessionCaches writes local, per-routine, and global keys", async () => {
    await upsertRoutineSessionCaches({
      id: "s_new",
      routineId: "r9",
      exercises: [
        {
          exerciseId: "e1",
          name: "Bench",
          sets: [{ weight: 60, reps: 8, completed: true }],
        },
      ],
      totalTime: 40,
      totalWeight: 480,
      completedSets: 1,
      createdAt: "2026-10-15T08:00:00.000Z",
    } as never);

    expect(JSON.parse(memory.get("@local_sessions") ?? "[]")[0].id).toBe(
      "s_new"
    );
    expect(
      JSON.parse(memory.get("@sessions_routine_r9") ?? "[]")[0].id
    ).toBe("s_new");
    expect(
      JSON.parse(memory.get("@sessions_cache_v2") ?? "[]")[0].id
    ).toBe("s_new");
  });
});
