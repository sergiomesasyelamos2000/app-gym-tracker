import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../../contexts/ThemeContext";
import { createProductSearchStyles } from "./createProductSearchStyles";

type Props = {
  onBack: () => void;
  title?: string;
  subtitle?: string;
};

export function ProductSearchHeader({
  onBack,
  title = "Buscar alimento",
  subtitle = "Catálogo, favoritos y productos propios",
}: Props) {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTinyScreen = width < 360;
  const styles = useMemo(
    () => createProductSearchStyles(theme, isDark),
    [theme, isDark]
  );

  const responsiveSubtitle = isTinyScreen
    ? "Catálogo y favoritos"
    : isSmallScreen
    ? "Catálogo, favoritos y propios"
    : subtitle;

  return (
    <View
      style={[
        styles.headerBlock,
        {
          paddingHorizontal: isTinyScreen ? 12 : isSmallScreen ? 16 : 20,
          paddingTop: isTinyScreen ? 4 : 8,
          paddingBottom: isTinyScreen ? 8 : 12,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[
            styles.backButton,
            isTinyScreen ? { width: 40, height: 40, borderRadius: 20 } : null,
          ]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons
            name="arrow-back"
            size={isTinyScreen ? 20 : 22}
            color={theme.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text
            style={[
              styles.headerTitle,
              {
                fontSize: RFValue(isTinyScreen ? 17 : isSmallScreen ? 18 : 20),
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { fontSize: RFValue(isTinyScreen ? 11 : 12) },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {responsiveSubtitle}
          </Text>
        </View>
      </View>
    </View>
  );
}
