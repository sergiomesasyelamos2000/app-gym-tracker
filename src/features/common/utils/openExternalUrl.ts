import { Alert, Linking } from "react-native";

export async function openExternalUrl(
  url: string,
  errorTitle = "No se pudo abrir el enlace"
): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(errorTitle, "Inténtalo de nuevo en unos segundos.");
  }
}
