import React, { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { createProductSearchStyles } from "./createProductSearchStyles";

type Props = {
  message: string;
};

export function SearchStatusBanner({ message }: Props) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createProductSearchStyles(theme, isDark),
    [theme, isDark]
  );

  return (
    <View style={styles.searchStatusBanner} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={theme.primary} />
      <Text style={styles.searchStatusText}>{message}</Text>
    </View>
  );
}
