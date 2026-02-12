import * as FileSystem from "expo-file-system";
import { Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getMonthlySummary } from "../features/nutrition/services/nutritionService";
import {
  findAllRoutines,
  findAllRoutineSessions,
} from "../features/routine/services/routineService";
import type {
  RoutineResponseDto,
  RoutineSessionEntity,
} from "@entity-data-models/index";
import { DailyNutritionSummary } from "../models/nutrition.model";

export type ExportFormat = "json" | "csv";
export type DataType = "workouts" | "nutrition" | "all";

export interface ExportOptions {
  startDate: Date;
  endDate: Date;
  format: ExportFormat;
  dataType: DataType;
}

export interface ExportData {
  workouts?: {
    routines: RoutineResponseDto[];
    sessions: (RoutineSessionEntity & { routineTitle: string })[];
  };
  nutrition?: DailyNutritionSummary[];
}

export const exportService = {
  async exportData(options: ExportOptions): Promise<void> {
    try {
      const data = await this.fetchData(options);
      const fileUri = await this.generateFile(data, options.format);
      await this.shareFile(fileUri);
    } catch (error) {
      console.error("Error exporting data:", error);
      throw error;
    }
  },

  async fetchData(options: ExportOptions): Promise<ExportData> {
    const { dataType } = options;
    const data: ExportData = {};

    // Normalize dates to include full days
    const startDate = new Date(options.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(options.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (dataType === "workouts" || dataType === "all") {
      const [routines, sessions] = await Promise.all([
        findAllRoutines(),
        findAllRoutineSessions(),
      ]);

      // Crear un mapa de routineId -> title para búsqueda rápida
      const routineMap = new Map<string, string>();
      routines.forEach((routine: RoutineResponseDto) => {
        routineMap.set(routine.id, routine.title);
      });

      // Filter sessions by date and attach routine title
      const filteredSessions = sessions
        .filter((session: RoutineSessionEntity) => {
          const sessionDate = new Date(session.createdAt);
          return sessionDate >= startDate && sessionDate <= endDate;
        })
        .map((session: RoutineSessionEntity) => ({
          ...session,
          routineTitle: routineMap.get(session.routineId ?? "") || "Unknown", // ✅ Buscar el título usando routineId
        }));

      data.workouts = {
        routines,
        sessions: filteredSessions,
      };
    }

    if (dataType === "nutrition" || dataType === "all") {
      // ... resto del código igual
      const nutritionData: DailyNutritionSummary[] = [];
      let currentDate = new Date(startDate);
      const endMonth = new Date(endDate);

      while (currentDate <= endMonth) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        try {
          const monthlyData = await getMonthlySummary(year, month);
          nutritionData.push(...monthlyData);
        } catch (e) {
          console.warn(
            `Could not fetch nutrition data for ${year}-${month}`,
            e
          );
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      data.nutrition = nutritionData.filter((entry: DailyNutritionSummary) => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    return data;
  },

  async generateFile(data: ExportData, format: ExportFormat): Promise<string> {
    const fileName = `gym-tracker-export-${
      new Date().toISOString().split("T")[0]
    }.${format}`;
    const fileUri = `${Paths.cache.uri}${fileName}`;

    let content = "";
    if (format === "json") {
      content = JSON.stringify(data, null, 2);
    } else {
      content = this.convertToCSV(data);
    }

    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: "utf8",
    });

    return fileUri;
  },

  convertToCSV(data: ExportData): string {
    let csv = "";

    if (data.workouts) {
      csv += "WORKOUT SESSIONS\n";
      csv += "Date,Routine,Exercise,Set,Weight (kg),Reps\n";
      data.workouts.sessions.forEach((session) => {
        const date = new Date(session.createdAt).toLocaleDateString();
        const routine = `"${session.routineTitle || "Unknown"}"`;

        if (session.exercises && Array.isArray(session.exercises)) {
          session.exercises.forEach((exercise) => {
            const exerciseName = `"${exercise.name || "Unknown"}"`;
            if (exercise.sets && Array.isArray(exercise.sets)) {
              exercise.sets.forEach((set, index: number) => {
                csv += `${date},${routine},${exerciseName},${index + 1},${
                  set.weight || 0
                },${set.reps || 0}\n`;
              });
            }
          });
        } else {
          // Fallback if no exercise data is available
          csv += `${date},${routine},No Details,0,0,0\n`;
        }
      });
      csv += "\n";
    }

    if (data.nutrition) {
      csv += "NUTRITION LOG\n";
      csv += "Date,Calories,Protein (g),Carbs (g),Fat (g)\n";
      data.nutrition.forEach((day) => {
        csv += `${day.date},${day.totals.calories},${day.totals.protein},${day.totals.carbs},${day.totals.fat}\n`;
      });
    }

    return csv;
  },

  async shareFile(fileUri: string): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Sharing is not available on this device");
    }
    await Sharing.shareAsync(fileUri);
  },
};
