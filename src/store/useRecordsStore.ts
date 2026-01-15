import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { RecordData } from "../services/recordsService";

interface RecordsState {
  records: RecordData[];
  addRecord: (record: RecordData) => void;
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

      getRecentRecords: (limit: number = 10) => {
        const records = get().records;
        return records
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
    }
  )
);
