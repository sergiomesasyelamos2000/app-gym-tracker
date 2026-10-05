import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import type { Theme } from "../../contexts/ThemeContext";
import {
  MODAL_DIALOG_PADDING,
  MODAL_DIALOG_RADIUS,
  MODAL_DIALOG_TITLE_SIZE,
  MODAL_HANDLE_HEIGHT,
  MODAL_HANDLE_MARGIN_BOTTOM,
  MODAL_HANDLE_RADIUS,
  MODAL_HANDLE_WIDTH,
  MODAL_SHEET_HORIZONTAL_PADDING,
  MODAL_SHEET_RADIUS,
  MODAL_SHEET_TITLE_SIZE,
  MODAL_SHEET_TOP_PADDING,
} from "./modalTokens";

export function getDialogChrome(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    } satisfies ViewStyle,
    card: {
      width: "100%",
      backgroundColor: theme.card,
      borderRadius: MODAL_DIALOG_RADIUS,
      borderWidth: 1,
      borderColor: theme.border,
      padding: MODAL_DIALOG_PADDING,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    } satisfies ViewStyle,
    title: {
      fontSize: MODAL_DIALOG_TITLE_SIZE,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      marginBottom: 16,
    } satisfies TextStyle,
  });
}

export function getSheetChrome(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: "flex-end",
    } satisfies ViewStyle,
    sheet: {
      width: "100%",
      backgroundColor: theme.card,
      borderTopLeftRadius: MODAL_SHEET_RADIUS,
      borderTopRightRadius: MODAL_SHEET_RADIUS,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: theme.border,
      paddingHorizontal: MODAL_SHEET_HORIZONTAL_PADDING,
      paddingTop: MODAL_SHEET_TOP_PADDING,
    } satisfies ViewStyle,
    handle: {
      width: MODAL_HANDLE_WIDTH,
      height: MODAL_HANDLE_HEIGHT,
      borderRadius: MODAL_HANDLE_RADIUS,
      backgroundColor: theme.border,
      alignSelf: "center",
      marginBottom: MODAL_HANDLE_MARGIN_BOTTOM,
    } satisfies ViewStyle,
    title: {
      fontSize: MODAL_SHEET_TITLE_SIZE,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      marginBottom: 16,
    } satisfies TextStyle,
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
      minHeight: 28,
    } satisfies ViewStyle,
    closeHit: {
      position: "absolute",
      right: 0,
      top: 0,
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    } satisfies ViewStyle,
  });
}

export function getBlockingChrome(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    } satisfies ViewStyle,
    message: {
      marginTop: 16,
      fontSize: 15,
      fontWeight: "600",
      color: "#FFFFFF",
      textAlign: "center",
    } satisfies TextStyle,
  });
}
