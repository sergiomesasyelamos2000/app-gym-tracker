// themeStyles.ts - Utilidades de estilos globales para temas
import { ViewStyle, TextStyle } from "react-native";
import type { Theme } from "../contexts/ThemeContext";

/**
 * Obtiene un color semi-transparente a partir de un color base
 * @param color Color base en formato hex
 * @param opacity Opacidad (0-100)
 */
export const withOpacity = (color: string, opacity: number): string => {
  if (color.startsWith("rgba") || color.startsWith("rgb")) {
    return color;
  }
  const alpha = Math.round((opacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  const base = color.length === 9 ? color.slice(0, 7) : color;
  return `${base}${alpha}`;
};

export const getCardStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.card,
  borderRadius: 16,
  padding: 16,
  borderWidth: 1,
  borderColor: theme.border,
  shadowColor: theme.shadowColor,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
});

export const getInputStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.inputBackground,
  borderWidth: 1,
  borderColor: theme.inputBorder,
  borderRadius: 12,
  padding: 12,
});

export const getPrimaryButtonStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.primary,
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 24,
  alignItems: "center",
  justifyContent: "center",
});

export const getPrimaryButtonTextStyle = (theme: Theme): TextStyle => ({
  color: theme.onPrimary,
  fontSize: 16,
  fontWeight: "700",
});

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

export const getSecondaryButtonTextStyle = (theme: Theme): TextStyle => ({
  color: theme.text,
  fontSize: 16,
  fontWeight: "600",
});

export const getGhostButtonStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: "transparent",
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 24,
  alignItems: "center",
  justifyContent: "center",
});

export const getDestructiveButtonStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.destructive,
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 24,
  alignItems: "center",
  justifyContent: "center",
});

export const getDestructiveButtonTextStyle = (theme: Theme): TextStyle => ({
  color: theme.onDestructive,
  fontSize: 16,
  fontWeight: "700",
});

export const getOverlayStyle = (theme: Theme): ViewStyle => ({
  flex: 1,
  backgroundColor: theme.overlay,
  justifyContent: "flex-end",
});

export const getModalStyle = (theme: Theme) => ({
  overlay: getOverlayStyle(theme),
  content: {
    backgroundColor: theme.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: theme.border,
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

export const getDividerStyle = (theme: Theme): ViewStyle => ({
  height: 1,
  backgroundColor: theme.divider,
  marginVertical: 12,
});

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

export const getChipStyle = (
  theme: Theme,
  selected: boolean = false
): ViewStyle => ({
  backgroundColor: selected ? theme.selection : theme.backgroundSecondary,
  borderWidth: 1,
  borderColor: selected ? withOpacity(theme.primary, 40) : theme.border,
  borderRadius: 20,
  paddingVertical: 8,
  paddingHorizontal: 12,
  flexDirection: "row",
  alignItems: "center",
});

export const getOptionStyle = (theme: Theme, selected: boolean = false) => ({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: selected ? theme.selection : theme.backgroundSecondary,
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

export const getTableHeaderStyle = (theme: Theme): ViewStyle => ({
  backgroundColor: theme.backgroundSecondary,
  paddingVertical: 8,
  paddingHorizontal: 8,
  borderRadius: 8,
  marginBottom: 12,
});

export const getSelectionStyle = (theme: Theme, selected: boolean): ViewStyle => ({
  backgroundColor: selected ? theme.selection : theme.card,
  borderColor: selected ? theme.primary : theme.border,
  borderWidth: 1,
});
