import { Ionicons } from "@expo/vector-icons";
import { MappedProduct as Product } from "@sergiomesasyelamos2000/shared";
import React, { useMemo } from "react";
import {
  GestureResponderEvent,
  Image,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../../contexts/ThemeContext";
import { MACRO_COLORS, MACRO_LABELS } from "../../utils/macroColors";
import { getNutritionGradeColor } from "../../utils/nutritionGradeColor";
import { createProductSearchStyles } from "./createProductSearchStyles";

const FALLBACK_PRODUCT_IMAGE = require("../../../../../assets/not-image.png");

type TrailingAction = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: (event: GestureResponderEvent) => void;
};

type Props = {
  item: Product;
  onPress: () => void;
  /** Quick-add (+) — convenience for catalog items */
  onQuickAdd?: (event: GestureResponderEvent) => void;
  /** Custom trailing action (e.g. edit). Overrides onQuickAdd when set. */
  trailingAction?: TrailingAction;
  showFavoriteBadge?: boolean;
  isCustom?: boolean;
  isMeal?: boolean;
};

export function ProductListItem({
  item,
  onPress,
  onQuickAdd,
  trailingAction,
  showFavoriteBadge = false,
  isCustom = false,
  isMeal = false,
}: Props) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(
    () => createProductSearchStyles(theme, isDark),
    [theme, isDark]
  );
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const imageSize = isSmallScreen ? width * 0.17 : 72;

  const grade =
    item.nutritionGrade &&
    item.nutritionGrade.toLowerCase() !== "unknown"
      ? item.nutritionGrade.toUpperCase()
      : null;

  const resolvedTrailing: TrailingAction | null = trailingAction
    ? trailingAction
    : onQuickAdd
    ? {
        icon: "add",
        accessibilityLabel: "Añadir rápido",
        onPress: onQuickAdd,
      }
    : null;

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.productImageWrap,
          { width: imageSize, height: imageSize },
        ]}
      >
        <Image
          source={
            item.image?.trim()
              ? { uri: item.image.trim(), cache: "force-cache" }
              : FALLBACK_PRODUCT_IMAGE
          }
          defaultSource={FALLBACK_PRODUCT_IMAGE}
          style={[
            styles.productImage,
            {
              width: imageSize * 0.85,
              height: imageSize * 0.85,
            },
          ]}
          fadeDuration={80}
        />
        {grade ? (
          <View
            style={[
              styles.gradeBadge,
              { backgroundColor: getNutritionGradeColor(grade) },
            ]}
          >
            <Text style={styles.gradeBadgeText}>{grade.charAt(0)}</Text>
          </View>
        ) : null}
        {showFavoriteBadge ? (
          <View style={styles.favoriteBadge}>
            <Ionicons name="heart" size={14} color="#E94560" />
          </View>
        ) : null}
        {isCustom || isMeal ? (
          <View
            style={[
              styles.favoriteBadge,
              { bottom: undefined, top: 4, right: 4 },
            ]}
          >
            <Ionicons
              name={isMeal ? "restaurant" : "create"}
              size={14}
              color={theme.primary}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.productBody}>
        <Text
          style={[
            styles.productName,
            { fontSize: RFValue(isSmallScreen ? 13 : 15) },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {item.brand ? (
          <Text
            style={[
              styles.productBrand,
              { fontSize: RFValue(isSmallScreen ? 10 : 12) },
            ]}
            numberOfLines={1}
          >
            {item.brand}
          </Text>
        ) : null}
        <View style={styles.macroRow}>
          <View style={[styles.macroPill, styles.macroPillKcal]}>
            <Ionicons
              name="flame"
              size={12}
              color={MACRO_COLORS.calories.accent}
            />
            <Text style={[styles.macroPillText, styles.macroPillTextKcal]}>
              {Math.round(item.calories || 0)} kcal
            </Text>
          </View>
          <View style={[styles.macroPill, styles.macroPillProtein]}>
            <Text style={[styles.macroPillText, styles.macroPillTextProtein]}>
              {MACRO_LABELS.protein.short} {item.protein ?? 0}g
            </Text>
          </View>
          <View style={[styles.macroPill, styles.macroPillCarbs]}>
            <Text style={[styles.macroPillText, styles.macroPillTextCarbs]}>
              {MACRO_LABELS.carbs.short} {item.carbohydrates ?? 0}g
            </Text>
          </View>
          <View style={[styles.macroPill, styles.macroPillFat]}>
            <Text style={[styles.macroPillText, styles.macroPillTextFat]}>
              {MACRO_LABELS.fat.short} {item.fat ?? 0}g
            </Text>
          </View>
        </View>
      </View>

      {resolvedTrailing ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={resolvedTrailing.onPress}
          accessibilityLabel={resolvedTrailing.accessibilityLabel}
        >
          <Ionicons
            name={resolvedTrailing.icon}
            size={resolvedTrailing.icon === "add" ? 26 : 22}
            color={theme.primary}
          />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}
