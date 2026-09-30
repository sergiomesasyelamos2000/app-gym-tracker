import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../../../contexts/ThemeContext";
import { createProductSearchStyles } from "./createProductSearchStyles";

type Props = {
  brands: string[];
  onRemove: (brand: string) => void;
  onClearAll: () => void;
};

export function ActiveBrandFiltersRow({
  brands,
  onRemove,
  onClearAll,
}: Props) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createProductSearchStyles(theme, isDark),
    [theme, isDark]
  );

  if (brands.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.activeFiltersScroll}
      contentContainerStyle={styles.activeFiltersContent}
    >
      <TouchableOpacity
        style={[
          styles.activeFilterChip,
          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
        ]}
        onPress={onClearAll}
      >
        <Text style={[styles.activeFilterText, { color: theme.textSecondary }]}>
          Limpiar
        </Text>
      </TouchableOpacity>
      {brands.map((brand) => (
        <View key={brand} style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>{brand}</Text>
          <TouchableOpacity
            onPress={() => onRemove(brand)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`Quitar filtro ${brand}`}
          >
            <Ionicons name="close" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}
