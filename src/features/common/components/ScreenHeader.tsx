import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  screenHeaderIconName,
  type ScreenHeaderMode,
} from "./screenHeaderIcon";

const HIT = 44;
const ICON = 24;

type HeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  mode?: ScreenHeaderMode;
  showLeading?: boolean;
  leadingDisabled?: boolean;
  accessibilityLabel?: string;
  right?: React.ReactNode;
};

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

export function ScreenHeaderIconButton({
  icon,
  color,
  onPress,
  accessibilityLabel,
  disabled,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      style={styles.hit}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={ICON} color={color} />
    </TouchableOpacity>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  mode = "back",
  showLeading = true,
  leadingDisabled = false,
  accessibilityLabel,
  right,
}: HeaderProps) {
  const { theme } = useTheme();
  const iconName = screenHeaderIconName(mode, Platform.OS);
  const label =
    accessibilityLabel ?? (mode === "close" ? "Cerrar" : "Volver");

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {showLeading ? (
        <TouchableOpacity
          style={styles.hit}
          onPress={onBack}
          disabled={leadingDisabled}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Ionicons name={iconName} size={ICON} color={theme.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.hit} />
      )}
      <View style={styles.center}>
        <Text
          style={[styles.title, { color: theme.text, fontSize: RFValue(17) }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingLeft: 4,
    paddingRight: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hit: {
    width: HIT,
    height: HIT,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  title: {
    fontWeight: "700",
  },
  subtitle: {
    fontSize: RFValue(12),
    marginTop: 1,
  },
  trailing: {
    minHeight: HIT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
});
