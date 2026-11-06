import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveRoutineSession } from "../../features/routine/services/routineService";
import { processSyncQueue } from "../autoSyncService";
import { isOnline, SYNC_QUEUE_KEY } from "../syncQueue";

jest.mock("../syncQueue", () => {
  const actual = jest.requireActual("../syncQueue");
  return {
    ...actual,
    isOnline: jest.fn(),
  };
});

jest.mock("../../features/routine/services/routineService", () => {
  const actual = jest.requireActual(
    "../../features/routine/services/routineService"
  );
  return {
    ...actual,
    saveRoutineSession: jest.fn(),
  };
});

jest.mock("../../store/useSyncStore", () => ({
  useSyncStore: {
    getState: () => ({
      setSyncing: jest.fn(),
      setPendingOperations: jest.fn(),
      setLastSyncAt: jest.fn(),
    }),
  },
}));

const mockedIsOnline = isOnline as jest.MockedFunction<typeof isOnline>;
const mockedSaveRoutineSession = saveRoutineSession as jest.MockedFunction<
  typeof saveRoutineSession
>;

describe("syncCreateSession routine title", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    mockedIsOnline.mockReset();
    mockedSaveRoutineSession.mockReset();
    mockedIsOnline.mockResolvedValue(true);

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      memory.has(key) ? memory.get(key)! : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        memory.set(key, value);
      }
    );
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(
      async (key: string) => {
        memory.delete(key);
      }
    );
  });

  it("replaces local_session_* and keeps routine.title after sync", async () => {
    memory.set(
      "@local_sessions",
      JSON.stringify([
        {
          id: "local_session_1",
          routineId: "r1",
          routine: { id: "r1", title: "Push Day" },
          totalTime: 60,
          totalWeight: 200,
          completedSets: 3,
          exercises: [],
          createdAt: "2026-11-05T09:00:00.000Z",
          _isPending: true,
        },
      ])
    );
    memory.set(
      SYNC_QUEUE_KEY,
      JSON.stringify([
        {
          id: "op1",
          type: "CREATE_SESSION",
          payload: {
            routineId: "r1",
            localSessionId: "local_session_1",
            session: {
              routineId: "r1",
              routine: { id: "r1", title: "Push Day" },
              totalTime: 60,
              totalWeight: 200,
              completedSets: 3,
              exercises: [],
            },
          },
          timestamp: Date.now(),
          retries: 0,
        },
      ])
    );

    mockedSaveRoutineSession.mockResolvedValue({
      id: "srv-session-1",
      routineId: "r1",
      routine: { id: "r1" },
      totalTime: 60,
      totalWeight: 200,
      completedSets: 3,
      exercises: [],
      createdAt: "2026-11-05T10:00:00.000Z",
    } as never);

    const result = await processSyncQueue();
    expect(result.success).toBe(1);

    const posted = mockedSaveRoutineSession.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(posted).not.toHaveProperty("routine");

    const local = JSON.parse(memory.get("@local_sessions") ?? "[]");
    expect(local.map((s: { id: string }) => s.id)).toEqual(["srv-session-1"]);
    expect(local[0].routine).toEqual({ id: "r1", title: "Push Day" });

    const queue = JSON.parse(memory.get(SYNC_QUEUE_KEY) ?? "[]");
    expect(queue).toEqual([]);
  });
});
