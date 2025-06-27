import { ENV } from "../environments/environment";

const BASE_URL = ENV.API_URL;

export async function handleSend(
  text: string,
  setMessages: React.Dispatch<React.SetStateAction<any[]>>
) {}
