// themeStyles.ts - Utilidades de estilos globales para temas
import { ViewStyle, TextStyle } from "react-native";

interface Theme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  backgroundSecondary: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  divider: string;
  inputBackground: string;
  inputBorder: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  shadowColor: string;
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

/**
 * Obtiene un color semi-transparente a partir de un color base
 * @param color Color base en formato hex
 * @param opacity Opacidad (0-100)
 */
export const withOpacity = (color: string, opacity: number): string => {
  // Convertir opacidad de 0-100 a hex (0-255)
  const alpha = Math.round((opacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${color}${alpha}`;
};

/**
 * Estilos comunes para cards
 */
export const getCardStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.card,
  borderRadius: 16,
  padding: 16,
  shadowColor: theme.shadowColor,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
});

/**
 * Estilos comunes para inputs
 */
export const getInputStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.inputBackground,
  borderWidth: 1,
  borderColor: theme.inputBorder,
  borderRadius: 12,
  padding: 12,
  // fontSize is not valid for ViewStyle, so it has been removed
  // color property removed as it is not valid for ViewStyle
});

/**
 * Estilos comunes para botones primarios
 */
export const getPrimaryButtonStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.primary,
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 24,
  alignItems: "center",
  justifyContent: "center",
});

/**
 * Estilos comunes para botones secundarios
 */
export const getSecondaryButtonStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.backgroundSecondary,
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 24,
  alignItems: "center",
  justifyContent: "center",
});

/**
 * Estilos comunes para modales
 */
export const getModalStyle = (theme: Theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: withOpacity("#000000", 50),
    justifyContent: "flex-end",
  } as ViewStyle,
  content: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  } as ViewStyle,
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
    marginBottom: 20,
  } as TextStyle,
});

/**
 * Estilos para dividers
 */
export const getDividerStyle = (theme: Theme): ViewStyle => ({
  height: 1,
  backgroundColor: theme.divider,
  marginVertical: 12,
});

/**
 * Estilos para textos
 */
export const getTextStyles = (theme: Theme) => ({
  primary: {
    color: theme.text,
    fontSize: 16,
  } as TextStyle,
  secondary: {
    color: theme.textSecondary,
    fontSize: 14,
  } as TextStyle,
  tertiary: {
    color: theme.textTertiary,
    fontSize: 12,
  } as TextStyle,
  title: {
    color: theme.text,
    fontSize: 24,
    fontWeight: "700",
  } as TextStyle,
  subtitle: {
    color: theme.textSecondary,
    fontSize: 18,
    fontWeight: "600",
  } as TextStyle,
});

/**
 * Obtiene el color de estado apropiado según el tipo
 */
export const getStatusColor = (
  theme: Theme,
  status: "success" | "error" | "warning" | "info"
): string => {
  switch (status) {
    case "success":
      return theme.success;
    case "error":
      return theme.error;
    case "warning":
      return theme.warning;
    case "info":
      return theme.info;
    default:
      return theme.text;
  }
};

/**
 * Estilos para listas
 */
export const getListStyles = (theme: Theme) => ({
  container: {
    backgroundColor: theme.background,
  } as ViewStyle,
  item: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.border,
  } as ViewStyle,
  separator: {
    height: 1,
    backgroundColor: theme.divider,
  } as ViewStyle,
});

/**
 * Estilos para chips/tags
 */
export const getChipStyle = (
  theme: Theme,
  selected: boolean = false
): ViewStyle => ({
  backgroundColor: selected
    ? withOpacity(theme.primary, 20)
    : theme.backgroundSecondary,
  borderWidth: 1,
  borderColor: selected ? withOpacity(theme.primary, 40) : theme.border,
  borderRadius: 20,
  paddingVertical: 8,
  paddingHorizontal: 12,
  flexDirection: "row",
  alignItems: "center",
});

/**
 * Estilos para opciones seleccionables (usado en modales de configuración)
 */
export const getOptionStyle = (theme: Theme, selected: boolean = false) => ({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: selected
      ? withOpacity(theme.primary, 10)
      : theme.backgroundSecondary,
    borderWidth: 2,
    borderColor: selected ? theme.primary : "transparent",
  } as ViewStyle,
  text: {
    fontSize: 15,
    color: selected ? theme.primary : theme.textSecondary,
    fontWeight: selected ? "600" : "500",
  } as TextStyle,
  iconColor: selected ? theme.primary : theme.textTertiary,
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.primary,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
});

/**
 * Estilos para rows completadas (ejercicios, tareas)
 */
export const getCompletedRowStyle = (
  theme: Theme,
  completed: boolean
): ViewStyle => ({
  backgroundColor: completed
    ? withOpacity(theme.success, 15)
    : theme.backgroundSecondary,
  borderRadius: 16,
  borderWidth: completed ? 1 : 0,
  borderColor: completed ? withOpacity(theme.success, 30) : "transparent",
});

/**
 * Estilos para contenedores de columnas/headers de tablas
 */
export const getTableHeaderStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.backgroundSecondary,
  paddingVertical: 8,
  paddingHorizontal: 8,
  borderRadius: 8,
  marginBottom: 12,
});

/**
 * Estilos para botones de acción destructiva (eliminar, cancelar)
 */
export const getDestructiveButtonStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.error,
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 24,
  alignItems: "center",
  justifyContent: "center",
});
