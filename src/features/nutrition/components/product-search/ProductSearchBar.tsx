import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../../contexts/ThemeContext";
import { createProductSearchStyles } from "./createProductSearchStyles";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onOpenFilters: () => void;
  onOpenScanner: () => void;
  filtersActiveCount?: number;
  placeholder?: string;
};

function getResponsiveSearchCopy(width: number) {
  if (width < 360) {
    return {
      placeholder: "Buscar alimento…",
      scanLabel: "Escanear",
      brandsLabel: "Marcas",
    };
  }
  if (width < 400) {
    return {
      placeholder: "Nombre o marca…",
      scanLabel: "Escanear",
      brandsLabel: "Marcas",
    };
  }
  return {
    placeholder: "Nombre, marca o supermercado…",
    scanLabel: "Escanear",
    brandsLabel: "Marcas / supermercados",
  };
}

export function ProductSearchBar({
  value,
  onChangeText,
  onOpenFilters,
  onOpenScanner,
  filtersActiveCount = 0,
  placeholder,
}: Props) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTinyScreen = width < 360;
  const styles = useMemo(
    () => createProductSearchStyles(theme, isDark),
    [theme, isDark]
  );
  const [focused, setFocused] = useState(false);
  const copy = useMemo(() => getResponsiveSearchCopy(width), [width]);

  const iconSize = isTinyScreen ? 18 : isSmallScreen ? 20 : 22;
  const actionIconSize = isTinyScreen ? 16 : 18;
  const inputFontSize = RFValue(isTinyScreen ? 13 : isSmallScreen ? 14 : 15);
  const barMinHeight = isTinyScreen ? 44 : isSmallScreen ? 48 : 52;
  const iconButtonSize = isTinyScreen ? 34 : isSmallScreen ? 36 : 40;
  const sectionPaddingH = isTinyScreen ? 12 : isSmallScreen ? 16 : 20;

  return (
    <View style={[styles.searchSection, { paddingHorizontal: sectionPaddingH }]}>
      <View
        style={[
          styles.searchBarOuter,
          focused ? styles.searchBarOuterFocused : null,
          {
            minHeight: barMinHeight,
            paddingHorizontal: isTinyScreen ? 10 : 14,
          },
        ]}
      >
        <Ionicons
          name="search"
          size={iconSize}
          color={theme.textTertiary}
          style={{ flexShrink: 0 }}
        />
        <TextInput
          style={[
            styles.searchInput,
            {
              fontSize: inputFontSize,
              marginLeft: isTinyScreen ? 6 : 8,
              paddingVertical: isTinyScreen ? 8 : 12,
              minWidth: 0,
              flexShrink: 1,
            },
          ]}
          placeholder={placeholder ?? copy.placeholder}
          placeholderTextColor={theme.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
          numberOfLines={1}
        />
        {value.length > 0 ? (
          <TouchableOpacity
            style={[
              styles.searchIconButton,
              { width: iconButtonSize, height: iconButtonSize },
            ]}
            onPress={() => onChangeText("")}
            accessibilityLabel="Borrar búsqueda"
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons
              name="close-circle"
              size={iconSize}
              color={theme.textTertiary}
            />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[
            styles.searchIconButton,
            { width: iconButtonSize, height: iconButtonSize },
            filtersActiveCount > 0 ? styles.searchIconButtonActive : null,
          ]}
          onPress={onOpenFilters}
          accessibilityLabel="Filtrar por marca"
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons
            name="options-outline"
            size={iconSize}
            color={
              filtersActiveCount > 0 ? theme.primary : theme.textSecondary
            }
          />
          {filtersActiveCount > 0 ? (
            <View
              style={{
                position: "absolute",
                top: isTinyScreen ? 4 : 6,
                right: isTinyScreen ? 4 : 6,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: theme.primary,
              }}
            />
          ) : null}
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsRow}
      >
        <TouchableOpacity
          style={[
            styles.quickActionChip,
            styles.quickActionChipPrimary,
            isTinyScreen ? { paddingHorizontal: 10, paddingVertical: 6 } : null,
          ]}
          onPress={onOpenScanner}
          accessibilityLabel="Escanear código de barras"
        >
          <Ionicons
            name="barcode-outline"
            size={actionIconSize}
            color={theme.onPrimary}
          />
          <Text
            style={[
              styles.quickActionText,
              styles.quickActionTextPrimary,
              { fontSize: RFValue(isTinyScreen ? 11 : 12) },
            ]}
          >
            {copy.scanLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickActionChip,
            isTinyScreen ? { paddingHorizontal: 10, paddingVertical: 6 } : null,
          ]}
          onPress={onOpenFilters}
        >
          <Ionicons
            name="storefront-outline"
            size={actionIconSize}
            color={theme.primary}
          />
          <Text
            style={[
              styles.quickActionText,
              { fontSize: RFValue(isTinyScreen ? 11 : 12) },
            ]}
            numberOfLines={1}
          >
            {copy.brandsLabel}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
