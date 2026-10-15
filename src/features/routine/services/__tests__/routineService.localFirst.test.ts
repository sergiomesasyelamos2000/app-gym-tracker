import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../../../../api/client";
import {
  fetchRoutineFolders,
  findAllRoutines,
  hasLocalRoutinesSnapshot,
} from "../routineService";

jest.mock("../../../../api/client", () => ({
  apiFetch: jest.fn(),
}));

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("routineService local-first reads", () => {
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
    (AsyncStorage.clear as jest.Mock).mockImplementation(async () => {
      memory.clear();
    });
  });

  it("returns cached routines immediately and refreshes in background", async () => {
    const cached = [
      {
        id: "r1",
        title: "Cached",
        sortOrder: 0,
        totalSets: 0,
        totalExercises: 0,
        isPublic: false,
        userId: "u1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    memory.set("@routines_cache", JSON.stringify(cached));

    mockedApiFetch.mockResolvedValue([
      { ...cached[0], title: "Fresh" },
    ]);

    const result = await findAllRoutines();
    expect(result).toEqual(cached);
    expect(mockedApiFetch).toHaveBeenCalled();

    // Allow background refresh to finish.
    await Promise.resolve();
    await Promise.resolve();

    expect(JSON.parse(memory.get("@routines_cache") ?? "[]")[0].title).toBe(
      "Fresh"
    );
  });

  it("awaits network when routines cache is empty", async () => {
    mockedApiFetch.mockResolvedValue([
      {
        id: "r2",
        title: "From network",
        sortOrder: 0,
        totalSets: 0,
        totalExercises: 0,
        isPublic: false,
        userId: "u1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const result = await findAllRoutines();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("From network");
  });

  it("hasLocalRoutinesSnapshot distinguishes miss vs empty hit", async () => {
    await expect(hasLocalRoutinesSnapshot()).resolves.toBe(false);
    memory.set("@routines_cache", JSON.stringify([]));
    await expect(hasLocalRoutinesSnapshot()).resolves.toBe(true);
  });

  it("returns cached folders when present", async () => {
    const folders = [
      {
        id: "f1",
        title: "Grupo",
        sortOrder: 0,
        routineIds: [] as string[],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    memory.set("@routine_folders_cache", JSON.stringify(folders));
    mockedApiFetch.mockRejectedValue(new Error("offline"));

    const result = await fetchRoutineFolders();
    expect(result).toEqual(folders);
  });
});
