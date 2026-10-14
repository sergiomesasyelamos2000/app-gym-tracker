import type { MappedProduct as Product } from "@sergiomesasyelamos2000/shared";
import { ApiError } from "../../../api/client";
import { scanBarcode } from "../services/nutritionService";

export type BarcodeLookupOutcome =
  | { kind: "found"; product: Product }
  | { kind: "not_found"; code: string }
  | { kind: "invalid_code"; code: string }
  | { kind: "lookup_failed"; code: string };

export const BARCODE_COPY = {
  invalidTitle: "Código no válido",
  invalidBody:
    "Ese código no es un código de barras de producto. Enfoca las barras del envase, no el código QR.",
  notFoundTitle: "Producto no encontrado",
  notFoundBody: (code: string) =>
    `Hemos leído el código ${code}, pero no está en tus productos ni en el catálogo.`,
  lookupFailedTitle: "No se pudo buscar el producto",
  lookupFailedBody:
    "El código se leyó bien, pero la búsqueda ha fallado. Revisa la conexión e inténtalo de nuevo.",
  createProduct: "Crear producto",
  retry: "Reintentar",
  cancel: "Cancelar",
  close: "Cerrar",
  cameraHint: "Enfoca el código de barras del envase, no el QR",
  searching: "Buscando producto…",
} as const;

export async function lookupScannedBarcode(
  code: string,
): Promise<BarcodeLookupOutcome> {
  const trimmed = code?.trim() ?? "";
  if (!trimmed) {
    return { kind: "invalid_code", code: trimmed };
  }

  try {
    const product = await scanBarcode(trimmed);
    if (product?.code) {
      return { kind: "found", product };
    }
    return { kind: "not_found", code: trimmed };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400) {
        return { kind: "invalid_code", code: trimmed };
      }
      if (error.status === 404) {
        return { kind: "not_found", code: trimmed };
      }
    }
    return { kind: "lookup_failed", code: trimmed };
  }
}
