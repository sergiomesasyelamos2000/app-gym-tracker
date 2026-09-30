import React, { useState } from "react";
import {
  Image,
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  collectMealProductImageUrls,
  computeMealCollageLayout,
} from "../utils/mealCollageLayout";

type Props = {
  urls?: string[];
  products?: ReadonlyArray<{ productImage?: string | null }>;
  style?: ViewStyle;
  borderRadius?: number;
  testID?: string;
  backgroundColor?: string;
};

export function MealCollagePreview({
  urls,
  products,
  style,
  borderRadius = 16,
  testID,
  backgroundColor = "#E5E7EB",
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const imageUrls =
    urls ??
    (products ? collectMealProductImageUrls(products) : []);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };

  const cells =
    size.width > 0 && size.height > 0
      ? computeMealCollageLayout(imageUrls.length, size.width, size.height)
      : [];

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { borderRadius, backgroundColor },
        style,
      ]}
      onLayout={onLayout}
    >
      {cells.map((cell) => {
        const uri = imageUrls[cell.index];
        if (!uri) {
          return (
            <View
              key={`empty-${cell.index}`}
              style={[
                styles.cell,
                {
                  left: cell.x,
                  top: cell.y,
                  width: cell.width,
                  height: cell.height,
                  backgroundColor,
                },
              ]}
            />
          );
        }
        return (
          <Image
            key={`${uri}-${cell.index}`}
            source={{ uri }}
            style={[
              styles.cell,
              {
                left: cell.x,
                top: cell.y,
                width: cell.width,
                height: cell.height,
              },
            ]}
            resizeMode="cover"
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    position: "relative",
  },
  cell: {
    position: "absolute",
  },
});
