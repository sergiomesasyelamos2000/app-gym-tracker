import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { RecordData } from "../services/recordsService";

interface RecordsState {
  records: RecordData[];
  addRecord: (record: RecordData) => void;
  addOrUpdateRecord: (record: RecordData) => void;
  removeRecordBySetId: (setId: string) => void;
  getRecentRecords: (limit?: number) => RecordData[];
  getRecordsByExercise: (exerciseId: string) => RecordData[];
  clearRecords: () => void;
}

export const useRecordsStore = create<RecordsState>()(
  persist(
    (set, get) => ({
      records: [],

      addRecord: (record: RecordData) => {
        set((state) => ({
          records: [record, ...state.records],
        }));
      },

      addOrUpdateRecord: (record: RecordData) => {
        set((state) => {
          const existingIndex = state.records.findIndex(
            (r) => r.setId === record.setId,
          );
          if (existingIndex >= 0) {
            const updatedRecords = [...state.records];
            updatedRecords[existingIndex] = record;
            return { records: updatedRecords };
          }
          return { records: [record, ...state.records] };
        });
      },

      removeRecordBySetId: (setId: string) => {
        set((state) => ({
          records: state.records.filter((r) => r.setId !== setId),
        }));
      },

      getRecentRecords: (limit: number = 10) => {
        const records = get().records;
        return records
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          .slice(0, limit);
      },

      getRecordsByExercise: (exerciseId: string) => {
        return get().records.filter((r) => r.exerciseId === exerciseId);
      },

      clearRecords: () => {
        set({ records: [] });
      },
    }),
    {
      name: "records-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
