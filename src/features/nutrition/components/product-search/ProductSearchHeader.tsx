import React from "react";
import { useWindowDimensions } from "react-native";
import { NutritionScreenHeader } from "../NutritionScreenHeader";

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
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTinyScreen = width < 360;

  const responsiveSubtitle = isTinyScreen
    ? "Catálogo y favoritos"
    : isSmallScreen
    ? "Catálogo, favoritos y propios"
    : subtitle;

  return (
    <NutritionScreenHeader
      title={title}
      subtitle={responsiveSubtitle}
      onBack={onBack}
    />
  );
}
