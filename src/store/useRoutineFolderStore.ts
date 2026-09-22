import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type RoutineFolder = {
  id: string;
  title: string;
  routineIds: string[];
};

export type RootKey = `routine:${string}` | `folder:${string}`;

type RoutineFolderState = {
  folders: RoutineFolder[];
  rootOrder: RootKey[];
  expandedFolderIds: string[];
  migratedLocalFolders: boolean;
  syncWithRoutines: (routineIds: string[]) => void;
  hydrateFromApi: (
    folders: RoutineFolder[],
    rootOrder: RootKey[]
  ) => void;
  markLocalFoldersMigrated: () => void;
  /** Optimistic local insert; prefer server UUID from createRoutineFolder. */
  insertFolder: (folder: RoutineFolder, atFront?: boolean) => void;
  createEmptyFolder: (title?: string) => string;
  createFolderFromRoutines: (
    routineIdA: string,
    routineIdB: string,
    title?: string
  ) => string;
  addRoutineToFolder: (folderId: string, routineId: string) => void;
  removeRoutineFromFolder: (routineId: string) => void;
  reorderFolderRoutines: (folderId: string, routineIds: string[]) => void;
  renameFolder: (folderId: string, title: string) => void;
  dissolveFolder: (folderId: string) => void;
  setRootOrder: (rootOrder: RootKey[]) => void;
  toggleFolderExpanded: (folderId: string) => void;
  getFolderIdForRoutine: (routineId: string) => string | null;
};

const makeId = () =>
  `folder_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const routineKey = (id: string): RootKey => `routine:${id}`;
export const folderKey = (id: string): RootKey => `folder:${id}`;

export const parseRootKey = (
  key: RootKey
): { type: "routine" | "folder"; id: string } => {
  if (key.startsWith("folder:")) {
    return { type: "folder", id: key.slice("folder:".length) };
  }
  return { type: "routine", id: key.slice("routine:".length) };
};

export const useRoutineFolderStore = create<RoutineFolderState>()(
  persist(
    (set, get) => ({
      folders: [],
      rootOrder: [],
      expandedFolderIds: [],
      migratedLocalFolders: false,

      hydrateFromApi: (folders, rootOrder) => {
        const validFolderIds = new Set(folders.map((f) => f.id));
        set((state) => ({
          folders,
          rootOrder,
          expandedFolderIds: state.expandedFolderIds.filter((id) =>
            validFolderIds.has(id)
          ),
        }));
      },

      markLocalFoldersMigrated: () => set({ migratedLocalFolders: true }),

      insertFolder: (folder, atFront = true) => {
        set((state) => {
          const folders = [
            folder,
            ...state.folders.filter((f) => f.id !== folder.id),
          ];
          const key = folderKey(folder.id);
          const without = state.rootOrder.filter((k) => k !== key);
          return {
            folders,
            rootOrder: atFront ? [key, ...without] : [...without, key],
            expandedFolderIds: state.expandedFolderIds.includes(folder.id)
              ? state.expandedFolderIds
              : [...state.expandedFolderIds, folder.id],
          };
        });
      },

      syncWithRoutines: (routineIds) => {
        const valid = new Set(routineIds);
        const state = get();

        const folders = state.folders.map((folder) => ({
          ...folder,
          routineIds: folder.routineIds.filter((id) => valid.has(id)),
        }));

        const folderRoutineIds = new Set(
          folders.flatMap((folder) => folder.routineIds)
        );

        const nextRoot: RootKey[] = [];
        const seen = new Set<string>();

        state.rootOrder.forEach((key) => {
          const parsed = parseRootKey(key);
          if (parsed.type === "folder") {
            if (folders.some((f) => f.id === parsed.id) && !seen.has(key)) {
              nextRoot.push(key);
              seen.add(key);
            }
            return;
          }
          if (
            valid.has(parsed.id) &&
            !folderRoutineIds.has(parsed.id) &&
            !seen.has(key)
          ) {
            nextRoot.push(key);
            seen.add(key);
          }
        });

        folders.forEach((folder) => {
          const key = folderKey(folder.id);
          if (!seen.has(key)) {
            nextRoot.push(key);
            seen.add(key);
          }
        });

        routineIds.forEach((id) => {
          const key = routineKey(id);
          if (!folderRoutineIds.has(id) && !seen.has(key)) {
            nextRoot.push(key);
            seen.add(key);
          }
        });

        const expandedFolderIds = state.expandedFolderIds.filter((id) =>
          folders.some((folder) => folder.id === id)
        );

        set({ folders, rootOrder: nextRoot, expandedFolderIds });
      },

      createEmptyFolder: (title) => {
        const id = makeId();
        const folder: RoutineFolder = {
          id,
          title: (title || "Grupo").trim() || "Grupo",
          routineIds: [],
        };
        get().insertFolder(folder, true);
        return id;
      },

      createFolderFromRoutines: (routineIdA, routineIdB, title) => {
        if (routineIdA === routineIdB) return "";

        const state = get();
        const cleanedFolders = state.folders.map((folder) => ({
          ...folder,
          routineIds: folder.routineIds.filter(
            (id) => id !== routineIdA && id !== routineIdB
          ),
        }));

        const id = makeId();
        const folder: RoutineFolder = {
          id,
          title: (title || "Grupo").trim() || "Grupo",
          routineIds: [routineIdA, routineIdB],
        };

        const removeKeys = new Set([
          routineKey(routineIdA),
          routineKey(routineIdB),
        ]);

        const rootOrder = state.rootOrder.filter((key) => !removeKeys.has(key));
        const insertAt = Math.max(
          0,
          state.rootOrder.findIndex(
            (key) =>
              key === routineKey(routineIdA) || key === routineKey(routineIdB)
          )
        );
        const insertIndex = insertAt === -1 ? 0 : insertAt;
        rootOrder.splice(insertIndex, 0, folderKey(id));

        set({
          folders: [...cleanedFolders, folder],
          rootOrder,
          expandedFolderIds: [...state.expandedFolderIds, id],
        });

        return id;
      },

      addRoutineToFolder: (folderId, routineId) => {
        const state = get();
        const target = state.folders.find((f) => f.id === folderId);
        if (!target || target.routineIds.includes(routineId)) return;

        const folders = state.folders.map((folder) => {
          const without = folder.routineIds.filter((id) => id !== routineId);
          if (folder.id === folderId) {
            return { ...folder, routineIds: [...without, routineId] };
          }
          return { ...folder, routineIds: without };
        });

        const rootOrder = state.rootOrder.filter(
          (key) => key !== routineKey(routineId)
        );

        set({
          folders,
          rootOrder,
          expandedFolderIds: state.expandedFolderIds.includes(folderId)
            ? state.expandedFolderIds
            : [...state.expandedFolderIds, folderId],
        });
      },

      removeRoutineFromFolder: (routineId) => {
        const state = get();
        const folders = state.folders.map((folder) => ({
          ...folder,
          routineIds: folder.routineIds.filter((id) => id !== routineId),
        }));

        const rootOrder = [...state.rootOrder];
        const key = routineKey(routineId);
        if (!rootOrder.includes(key)) rootOrder.push(key);

        set({
          folders,
          rootOrder,
          expandedFolderIds: state.expandedFolderIds,
        });
      },

      reorderFolderRoutines: (folderId, routineIds) => {
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === folderId ? { ...folder, routineIds } : folder
          ),
        }));
      },

      renameFolder: (folderId, title) => {
        const nextTitle = title.trim() || "Grupo";
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === folderId ? { ...folder, title: nextTitle } : folder
          ),
        }));
      },

      dissolveFolder: (folderId) => {
        const state = get();
        const folder = state.folders.find((f) => f.id === folderId);
        if (!folder) return;

        const folders = state.folders.filter((f) => f.id !== folderId);
        const rootOrder = state.rootOrder.filter(
          (key) => key !== folderKey(folderId)
        );
        const insertAt = Math.max(
          0,
          state.rootOrder.findIndex((key) => key === folderKey(folderId))
        );
        const insertIndex = insertAt === -1 ? rootOrder.length : insertAt;
        folder.routineIds.forEach((routineId, offset) => {
          const key = routineKey(routineId);
          if (!rootOrder.includes(key)) {
            rootOrder.splice(insertIndex + offset, 0, key);
          }
        });

        set({
          folders,
          rootOrder,
          expandedFolderIds: state.expandedFolderIds.filter(
            (id) => id !== folderId
          ),
        });
      },

      setRootOrder: (rootOrder) => set({ rootOrder }),

      toggleFolderExpanded: (folderId) => {
        set((state) => ({
          expandedFolderIds: state.expandedFolderIds.includes(folderId)
            ? state.expandedFolderIds.filter((id) => id !== folderId)
            : [...state.expandedFolderIds, folderId],
        }));
      },

      getFolderIdForRoutine: (routineId) => {
        const folder = get().folders.find((f) =>
          f.routineIds.includes(routineId)
        );
        return folder?.id ?? null;
      },
    }),
    {
      name: "routine-folders-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        folders: state.folders,
        rootOrder: state.rootOrder,
        expandedFolderIds: state.expandedFolderIds,
        migratedLocalFolders: state.migratedLocalFolders,
      }),
    }
  )
);
