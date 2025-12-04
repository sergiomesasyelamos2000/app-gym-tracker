import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { apiFetch } from "../api";

export const parseMarkdownTableToCSV = (content: string): string => {
  const lines = content.split("\n");
  const csvLines: string[] = [];

  for (const line of lines) {
    if (line.includes("|")) {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell);

      if (cells.every((cell) => /^-+$/.test(cell))) {
        continue;
      }

      csvLines.push(
        cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      );
    }
  }

  return csvLines.join("\n");
};

export const exportToCSV = async (
  content: string,
  fileName: string = "dieta"
): Promise<void> => {
  try {
    const csv = parseMarkdownTableToCSV(content);

    if (!csv) {
      Alert.alert("Error", "No se encontraron tablas para exportar");
      return;
    }

    const fileUri = `${
      FileSystem.documentDirectory
    }${fileName}_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Sharing is not available on this device");
    }
    await Sharing.shareAsync(fileUri);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    Alert.alert("Error", "No se pudo exportar el archivo CSV");
  }
};

export const exportToPDF = async (
  content: string,
  title: string = "Plan de Nutrición",
  userName?: string
): Promise<void> => {
  try {
    console.log("Iniciando exportación PDF...");

    const arrayBuffer = await apiFetch<ArrayBuffer>("export/pdf", {
      method: "POST",
      body: JSON.stringify({
        title,
        content,
        userName,
      }),
    });

    console.log("ArrayBuffer recibido, tamaño:", arrayBuffer.byteLength);

    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    console.log("PDF convertido a base64");

    const fileName = `${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    console.log("Guardando PDF en:", fileUri);

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log("PDF guardado exitosamente");

    // NOTA: shareAsync se queda colgado en Expo Go con PDFs
    // El archivo ya está guardado en el dispositivo
    Alert.alert(
      "PDF Exportado",
      "Tu plan de nutrición se ha guardado correctamente en tu dispositivo.",
      [{ text: "OK" }]
    );

    console.log("Exportación completada");
  } catch (error) {
    console.error("Error exporting PDF:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    Alert.alert("Error", "No se pudo exportar el PDF: " + errorMessage);
  }
};

export const isExportableContent = (content: string): boolean => {
  if (
    content.includes("|") &&
    content.split("\n").filter((line) => line.includes("|")).length > 2
  ) {
    return true;
  }

  const dietKeywords = [
    "dieta",
    "plan de alimentación",
    "menú",
    "desayuno",
    "almuerzo",
    "cena",
    "merienda",
    "calorías",
    "macros",
    "proteínas",
    "carbohidratos",
    "grasas",
  ];

  const lowerContent = content.toLowerCase();
  const hasKeywords = dietKeywords.some((keyword) =>
    lowerContent.includes(keyword)
  );

  const hasLists =
    content
      .split("\n")
      .filter(
        (line) =>
          line.trim().startsWith("-") ||
          line.trim().startsWith("*") ||
          /^\d+\./.test(line.trim())
      ).length > 3;

  return hasKeywords && (hasLists || content.includes("|"));
};
