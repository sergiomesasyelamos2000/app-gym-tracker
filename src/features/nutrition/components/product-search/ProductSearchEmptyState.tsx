import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { createProductSearchStyles } from "./createProductSearchStyles";

type EmptyVariant =
  | "loading"
  | "bootstrap"
  | "empty-browse"
  | "empty-search"
  | "empty-collection";

type Props = {
  variant: EmptyVariant;
  title: string;
  subtitle: string;
  statusMessage?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  /** Override default icon for collection / browse empties */
  icon?: keyof typeof Ionicons.glyphMap;
};

function defaultIconForVariant(
  variant: EmptyVariant
): keyof typeof Ionicons.glyphMap {
  switch (variant) {
    case "bootstrap":
      return "layers-outline";
    case "empty-search":
      return "search-outline";
    case "empty-collection":
      return "cube-outline";
    default:
      return "nutrition-outline";
  }
}

export function ProductSearchEmptyState({
  variant,
  title,
  subtitle,
  statusMessage,
  actionLabel,
  onAction,
  icon,
}: Props) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createProductSearchStyles(theme, isDark),
    [theme, isDark]
  );

  const showSpinner = variant === "loading";

  return (
    <View style={styles.emptyContainer}>
      {showSpinner ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : (
        <View style={styles.emptyIconWrap}>
          <Ionicons
            name={icon ?? defaultIconForVariant(variant)}
            size={40}
            color={theme.textTertiary}
          />
        </View>
      )}
      <Text style={styles.emptyTitle}>
        {showSpinner && statusMessage ? statusMessage : title}
      </Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      {actionLabel && onAction && variant !== "loading" ? (
        <TouchableOpacity style={styles.primaryButton} onPress={onAction}>
          <Ionicons name="add-circle" size={22} color={theme.onPrimary} />
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
