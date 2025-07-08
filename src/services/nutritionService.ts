import { apiFetch } from "./api";

export async function postText(text: string): Promise<any> {
  return apiFetch("nutrition", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function postPhoto(formData: FormData): Promise<any> {
  return apiFetch("nutrition/photo", {
    method: "POST",
    body: formData,
  });
}

export async function scanBarcode(code: string): Promise<any> {
  return apiFetch("nutrition/barcode", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function getProducts(page = 1, pageSize = 20): Promise<any> {
  return apiFetch(`nutrition/products?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
  });
}
