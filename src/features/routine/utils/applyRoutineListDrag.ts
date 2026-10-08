import type { RootKey } from "../../../store/useRoutineFolderStore";
import { folderKey, routineKey } from "../../../store/useRoutineFolderStore";

export type DragListItem =
  | { key: string; type: "routine"; routineId: string }
  | { key: string; type: "folder"; folderId: string }
  | { key: string; type: "nested"; folderId: string; routineId: string };

export type FolderSnapshot = {
  id: string;
  title: string;
  routineIds: string[];
};

export type DragApplyInput = {
  flat: DragListItem[];
  dragged: DragListItem;
  dropFolderId: string | null;
  folders: FolderSnapshot[];
  allRoutineIds: string[];
};

export type DragApplyResult = {
  folders: FolderSnapshot[];
  rootOrder: RootKey[];
  expandFolderId: string | null;
};

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

/** Nested row no longer sits under its folder header → treat as root. */
export function isOrphanedNested(
  flat: DragListItem[],
  item: Extract<DragListItem, { type: "nested" }>
): boolean {
  const idx = flat.findIndex((row) => row.key === item.key);
  if (idx < 0) return true;
  for (let i = idx - 1; i >= 0; i -= 1) {
    const prev = flat[i];
    if (prev.type === "folder" && prev.folderId === item.folderId) {
      return false;
    }
    if (prev.type === "nested" && prev.folderId === item.folderId) {
      continue;
    }
    return true;
  }
  return true;
}

function projectRoot(flat: DragListItem[]): RootKey[] {
  const next: RootKey[] = [];
  const seen = new Set<string>();
  for (const item of flat) {
    let key: RootKey | null = null;
    if (item.type === "folder") {
      key = folderKey(item.folderId);
    } else if (item.type === "routine") {
      key = routineKey(item.routineId);
    } else if (isOrphanedNested(flat, item)) {
      key = routineKey(item.routineId);
    }
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(key);
  }
  return next;
}

/**
 * Root/nested landed inside an expanded folder span (header … children).
 * Orphaned nested rows are not in a span.
 */
function findSpanFolderId(
  flat: DragListItem[],
  dragged: DragListItem
): string | null {
  if (dragged.type === "folder") return null;
  if (dragged.type === "nested" && isOrphanedNested(flat, dragged)) {
    return null;
  }

  const idx = flat.findIndex((item) => item.key === dragged.key);
  if (idx < 0) return null;

  const at = flat[idx];
  if (at.type === "nested") return at.folderId;

  for (let i = idx - 1; i >= 0; i -= 1) {
    const prev = flat[i];
    if (prev.type === "folder") {
      for (let j = i + 1; j < idx; j += 1) {
        const mid = flat[j];
        if (mid.type === "nested" && mid.folderId === prev.folderId) continue;
        if (
          (mid.type === "routine" || mid.type === "nested") &&
          mid.routineId === dragged.routineId
        ) {
          continue;
        }
        return null;
      }
      return prev.folderId;
    }
    if (prev.type === "routine") return null;
  }
  return null;
}

/**
 * Visible span order from flat, then preserve any folder members that were
 * not in the flat run (should not eject hidden/stale members).
 */
function collectFolderIdsFromFlat(
  flat: DragListItem[],
  folderId: string,
  movedId: string,
  previousIds: string[]
): string[] {
  const header = flat.findIndex(
    (item) => item.type === "folder" && item.folderId === folderId
  );
  const fromFlat: string[] = [];
  if (header >= 0) {
    for (let j = header + 1; j < flat.length; j += 1) {
      const item = flat[j];
      if (item.type === "folder") break;
      if (item.type === "nested" && item.folderId === folderId) {
        fromFlat.push(item.routineId);
        continue;
      }
      if (
        (item.type === "routine" || item.type === "nested") &&
        item.routineId === movedId
      ) {
        fromFlat.push(movedId);
        continue;
      }
      if (item.type === "routine") break;
      if (item.type === "nested") break;
    }
  }

  const fromFlatSet = new Set(fromFlat);
  const preserved = previousIds.filter(
    (id) => id !== movedId && !fromFlatSet.has(id)
  );
  return uniqueIds([...fromFlat, ...preserved]);
}

function finalize(
  folders: FolderSnapshot[],
  rootOrder: RootKey[],
  expandFolderId: string | null,
  allRoutineIds: string[]
): DragApplyResult {
  const folderIdSet = new Set(folders.map((f) => f.id));
  const owned = uniqueIds(allRoutineIds);

  const seenInFolder = new Set<string>();
  const nextFolders = folders.map((folder) => {
    const routineIds: string[] = [];
    for (const id of folder.routineIds) {
      if (!owned.includes(id)) continue;
      if (seenInFolder.has(id)) continue;
      seenInFolder.add(id);
      routineIds.push(id);
    }
    return { ...folder, routineIds };
  });

  let nextRoot = rootOrder.filter((key) => {
    if (key.startsWith("folder:")) {
      return folderIdSet.has(key.slice("folder:".length));
    }
    const id = key.slice("routine:".length);
    return owned.includes(id) && !seenInFolder.has(id);
  });

  nextRoot = uniqueIds(nextRoot) as RootKey[];

  nextFolders.forEach((folder) => {
    const key = folderKey(folder.id);
    if (!nextRoot.includes(key)) nextRoot.push(key);
  });

  owned.forEach((id) => {
    if (seenInFolder.has(id)) return;
    const key = routineKey(id);
    if (!nextRoot.includes(key)) nextRoot.push(key);
  });

  return {
    folders: nextFolders,
    rootOrder: nextRoot,
    expandFolderId:
      expandFolderId && folderIdSet.has(expandFolderId)
        ? expandFolderId
        : null,
  };
}

/**
 * Pure drag result for the workout routine list.
 * Folder membership is never rebuilt solely from orphaned nested rows.
 */
export function applyRoutineListDrag(
  input: DragApplyInput
): DragApplyResult {
  const { flat, dragged, dropFolderId, folders, allRoutineIds } = input;

  if (dragged.type === "folder") {
    return finalize(
      folders.map((folder) => ({
        ...folder,
        routineIds: [...folder.routineIds],
      })),
      projectRoot(flat),
      null,
      allRoutineIds
    );
  }

  const movedId = dragged.routineId;

  // Dragging a nested row clear of its folder header = pull out.
  // Ignore a dwell on the *same* folder (hover while exiting re-armed it).
  const orphanedNested =
    dragged.type === "nested" && isOrphanedNested(flat, dragged);
  const effectiveDropFolderId =
    orphanedNested && dropFolderId === dragged.folderId
      ? null
      : dropFolderId;

  if (effectiveDropFolderId) {
    const nextFolders = folders.map((folder) => {
      const without = folder.routineIds.filter((id) => id !== movedId);
      if (folder.id !== effectiveDropFolderId) {
        return { ...folder, routineIds: without };
      }
      return {
        ...folder,
        routineIds: without.includes(movedId)
          ? without
          : [...without, movedId],
      };
    });
    const rootOrder = projectRoot(flat).filter(
      (key) => key !== routineKey(movedId)
    );
    return finalize(
      nextFolders,
      rootOrder,
      effectiveDropFolderId,
      allRoutineIds
    );
  }

  const spanFolderId = findSpanFolderId(flat, dragged);

  const nextFolders = folders.map((folder) => {
    if (spanFolderId === folder.id) {
      return {
        ...folder,
        routineIds: collectFolderIdsFromFlat(
          flat,
          folder.id,
          movedId,
          folder.routineIds
        ),
      };
    }
    return {
      ...folder,
      routineIds: folder.routineIds.filter((id) => id !== movedId),
    };
  });

  const inFolders = new Set(
    nextFolders.flatMap((folder) => folder.routineIds)
  );
  const rootOrder = projectRoot(flat).filter((key) => {
    if (key.startsWith("folder:")) return true;
    return !inFolders.has(key.slice("routine:".length));
  });

  return finalize(nextFolders, rootOrder, spanFolderId, allRoutineIds);
}
