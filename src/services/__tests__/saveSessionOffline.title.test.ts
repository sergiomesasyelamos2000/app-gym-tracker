import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveRoutineSession } from "../../features/routine/services/routineService";
import { saveSessionOffline } from "../offlineRoutineService";
import { isOnline, getPendingOperations } from "../syncQueue";

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

jest.mock("../autoSyncService", () => ({
  processSyncQueue: jest.fn().mockResolvedValue({ success: 0, failed: 0 }),
}));

const mockedIsOnline = isOnline as jest.MockedFunction<typeof isOnline>;
const mockedSaveRoutineSession = saveRoutineSession as jest.MockedFunction<
  typeof saveRoutineSession
>;

describe("saveSessionOffline routine title", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    mockedIsOnline.mockReset();
    mockedSaveRoutineSession.mockReset();

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      memory.has(key) ? memory.get(key)! : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        memory.set(key, value);
      }
    );
  });

  it("offline cache and queue keep routine.title and localSessionId", async () => {
    mockedIsOnline.mockResolvedValue(false);

    const saved = await saveSessionOffline("r1", {
      totalTime: 60,
      totalWeight: 200,
      completedSets: 3,
      exercises: [],
      routine: { id: "r1", title: "Push Day" },
    } as never);

    expect(saved.id.startsWith("local_session_")).toBe(true);
    expect(saved.routine).toEqual({ id: "r1", title: "Push Day" });

    const local = JSON.parse(memory.get("@local_sessions") ?? "[]");
    expect(local[0].routine).toEqual({ id: "r1", title: "Push Day" });

    const queue = await getPendingOperations();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("CREATE_SESSION");
    if (queue[0].type === "CREATE_SESSION") {
      expect(queue[0].payload.localSessionId).toBe(saved.id);
      expect(queue[0].payload.session.routine).toEqual({
        id: "r1",
        title: "Push Day",
      });
    }
  });

  it("online POST strips routine and reattaches title onto cache", async () => {
    mockedIsOnline.mockResolvedValue(true);
    mockedSaveRoutineSession.mockResolvedValue({
      id: "srv-1",
      routineId: "r1",
      routine: { id: "r1" },
      totalTime: 60,
      totalWeight: 200,
      completedSets: 3,
      exercises: [],
      createdAt: "2026-11-05T10:00:00.000Z",
    } as never);

    const saved = await saveSessionOffline("r1", {
      totalTime: 60,
      totalWeight: 200,
      completedSets: 3,
      exercises: [],
      routine: { id: "r1", title: "Legs" },
    } as never);

    expect(mockedSaveRoutineSession).toHaveBeenCalledWith(
      "r1",
      expect.not.objectContaining({ routine: expect.anything() })
    );
    const posted = mockedSaveRoutineSession.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(posted).not.toHaveProperty("routine");
    expect(posted).not.toHaveProperty("id");
    expect(posted).not.toHaveProperty("_isPending");

    expect(saved.routine).toEqual({ id: "r1", title: "Legs" });
    const local = JSON.parse(memory.get("@local_sessions") ?? "[]");
    expect(local[0].routine).toEqual({ id: "r1", title: "Legs" });
  });
});
