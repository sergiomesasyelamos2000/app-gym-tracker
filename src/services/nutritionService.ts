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
