import {
  applyRoutineListDrag,
  type DragListItem,
  type FolderSnapshot,
} from "../applyRoutineListDrag";

const folders = (
  entries: Array<{ id: string; title?: string; routineIds: string[] }>
): FolderSnapshot[] =>
  entries.map((entry) => ({
    id: entry.id,
    title: entry.title ?? entry.id,
    routineIds: entry.routineIds,
  }));

describe("applyRoutineListDrag", () => {
  it("keeps folder children when a folder header is moved", () => {
    const result = applyRoutineListDrag({
      flat: [
        { key: "routine:r1", type: "routine", routineId: "r1" },
        { key: "folder:f1", type: "folder", folderId: "f1" },
      ],
      dragged: { key: "folder:f1", type: "folder", folderId: "f1" },
      dropFolderId: null,
      folders: folders([{ id: "f1", routineIds: ["a", "b"] }]),
      allRoutineIds: ["r1", "a", "b"],
    });

    expect(result.folders[0].routineIds).toEqual(["a", "b"]);
    expect(result.rootOrder).toEqual(["routine:r1", "folder:f1"]);
  });

  it("ignores dropFolderId when the dragged item is a folder", () => {
    const result = applyRoutineListDrag({
      flat: [
        { key: "folder:f1", type: "folder", folderId: "f1" },
        { key: "routine:r1", type: "routine", routineId: "r1" },
      ],
      dragged: { key: "folder:f1", type: "folder", folderId: "f1" },
      dropFolderId: "f2",
      folders: folders([
        { id: "f1", routineIds: ["a"] },
        { id: "f2", routineIds: [] },
      ]),
      allRoutineIds: ["r1", "a"],
    });

    expect(result.folders.find((f) => f.id === "f1")?.routineIds).toEqual([
      "a",
    ]);
    expect(result.folders.find((f) => f.id === "f2")?.routineIds).toEqual([]);
  });

  it("appends a root routine to a folder via dropFolderId", () => {
    const result = applyRoutineListDrag({
      flat: [
        { key: "folder:f1", type: "folder", folderId: "f1" },
        { key: "nested:f1:a", type: "nested", folderId: "f1", routineId: "a" },
        { key: "routine:r1", type: "routine", routineId: "r1" },
      ],
      dragged: { key: "routine:r1", type: "routine", routineId: "r1" },
      dropFolderId: "f1",
      folders: folders([{ id: "f1", routineIds: ["a"] }]),
      allRoutineIds: ["r1", "a"],
    });

    expect(result.folders[0].routineIds).toEqual(["a", "r1"]);
    expect(result.rootOrder).toEqual(["folder:f1"]);
    expect(result.expandFolderId).toBe("f1");
  });

  it("moves a nested routine to another folder via dropFolderId", () => {
    const result = applyRoutineListDrag({
      flat: [
        { key: "folder:f1", type: "folder", folderId: "f1" },
        { key: "folder:f2", type: "folder", folderId: "f2" },
        {
          key: "nested:f1:a",
          type: "nested",
          folderId: "f1",
          routineId: "a",
        },
      ],
      dragged: {
        key: "nested:f1:a",
        type: "nested",
        folderId: "f1",
        routineId: "a",
      },
      dropFolderId: "f2",
      folders: folders([
        { id: "f1", routineIds: ["a", "b"] },
        { id: "f2", routineIds: ["c"] },
      ]),
      allRoutineIds: ["a", "b", "c"],
    });

    expect(result.folders.find((f) => f.id === "f1")?.routineIds).toEqual([
      "b",
    ]);
    expect(result.folders.find((f) => f.id === "f2")?.routineIds).toEqual([
      "c",
      "a",
    ]);
  });

  it("reorders nested routines inside one folder", () => {
    const result = applyRoutineListDrag({
      flat: [
        { key: "folder:f1", type: "folder", folderId: "f1" },
        {
          key: "nested:f1:b",
          type: "nested",
          folderId: "f1",
          routineId: "b",
        },
        {
          key: "nested:f1:a",
          type: "nested",
          folderId: "f1",
          routineId: "a",
        },
      ],
      dragged: {
        key: "nested:f1:a",
        type: "nested",
        folderId: "f1",
        routineId: "a",
      },
      dropFolderId: null,
      folders: folders([{ id: "f1", routineIds: ["a", "b"] }]),
      allRoutineIds: ["a", "b"],
    });

    expect(result.folders[0].routineIds).toEqual(["b", "a"]);
    expect(result.rootOrder).toEqual(["folder:f1"]);
  });

  it("pulls orphaned nested routine to root without ejecting siblings", () => {
    const flat: DragListItem[] = [
      {
        key: "nested:f1:a",
        type: "nested",
        folderId: "f1",
        routineId: "a",
      },
      { key: "folder:f1", type: "folder", folderId: "f1" },
      {
        key: "nested:f1:b",
        type: "nested",
        folderId: "f1",
        routineId: "b",
      },
    ];
    const result = applyRoutineListDrag({
      flat,
      dragged: {
        key: "nested:f1:a",
        type: "nested",
        folderId: "f1",
        routineId: "a",
      },
      dropFolderId: null,
      folders: folders([{ id: "f1", routineIds: ["a", "b"] }]),
      allRoutineIds: ["a", "b"],
    });

    expect(result.folders[0].routineIds).toEqual(["b"]);
    expect(result.rootOrder).toEqual(["routine:a", "folder:f1"]);
  });

  it("ignores dropFolderId on the origin folder when nested is orphaned out", () => {
    const flat: DragListItem[] = [
      {
        key: "nested:f1:a",
        type: "nested",
        folderId: "f1",
        routineId: "a",
      },
      { key: "folder:f1", type: "folder", folderId: "f1" },
      {
        key: "nested:f1:b",
        type: "nested",
        folderId: "f1",
        routineId: "b",
      },
    ];
    const result = applyRoutineListDrag({
      flat,
      dragged: {
        key: "nested:f1:a",
        type: "nested",
        folderId: "f1",
        routineId: "a",
      },
      // Dwell re-armed the same folder while dragging out.
      dropFolderId: "f1",
      folders: folders([{ id: "f1", routineIds: ["a", "b"] }]),
      allRoutineIds: ["a", "b"],
    });

    expect(result.folders[0].routineIds).toEqual(["b"]);
    expect(result.rootOrder).toEqual(["routine:a", "folder:f1"]);
    expect(result.expandFolderId).toBeNull();
  });

  it("inserts a root routine into an open folder span", () => {
    const result = applyRoutineListDrag({
      flat: [
        { key: "folder:f1", type: "folder", folderId: "f1" },
        { key: "routine:r1", type: "routine", routineId: "r1" },
        {
          key: "nested:f1:a",
          type: "nested",
          folderId: "f1",
          routineId: "a",
        },
      ],
      dragged: { key: "routine:r1", type: "routine", routineId: "r1" },
      dropFolderId: null,
      folders: folders([{ id: "f1", routineIds: ["a"] }]),
      allRoutineIds: ["r1", "a"],
    });

    expect(result.folders[0].routineIds).toEqual(["r1", "a"]);
    expect(result.rootOrder).toEqual(["folder:f1"]);
  });

  it("preserves folder members not visible in flat when reordering root", () => {
    const result = applyRoutineListDrag({
      flat: [
        { key: "routine:r2", type: "routine", routineId: "r2" },
        { key: "routine:r1", type: "routine", routineId: "r1" },
        { key: "folder:f1", type: "folder", folderId: "f1" },
      ],
      dragged: { key: "routine:r2", type: "routine", routineId: "r2" },
      dropFolderId: null,
      folders: folders([{ id: "f1", routineIds: ["a", "b"] }]),
      allRoutineIds: ["r1", "r2", "a", "b"],
    });

    expect(result.folders[0].routineIds).toEqual(["a", "b"]);
    expect(result.rootOrder).toEqual([
      "routine:r2",
      "routine:r1",
      "folder:f1",
    ]);
  });

  it("appends missing owned ids to root without duplicates", () => {
    const result = applyRoutineListDrag({
      flat: [{ key: "routine:r1", type: "routine", routineId: "r1" }],
      dragged: { key: "routine:r1", type: "routine", routineId: "r1" },
      dropFolderId: null,
      folders: folders([{ id: "f1", routineIds: ["a"] }]),
      allRoutineIds: ["r1", "a", "orphan"],
    });

    expect(result.rootOrder).toContain("routine:orphan");
    expect(result.rootOrder).toContain("folder:f1");
    expect(result.folders[0].routineIds).toEqual(["a"]);
    const all = [
      ...result.rootOrder
        .filter((k) => k.startsWith("routine:"))
        .map((k) => k.slice(8)),
      ...result.folders.flatMap((f) => f.routineIds),
    ];
    expect(new Set(all).size).toBe(all.length);
  });
});
