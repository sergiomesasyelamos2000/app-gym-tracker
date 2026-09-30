import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NutritionStackParamList } from "../screens/NutritionStack";

export type ProductListNavParams = NonNullable<
  NutritionStackParamList["ProductListScreen"]
>;

export function leaveToProductList(
  navigation: NativeStackNavigationProp<NutritionStackParamList>,
  params?: ProductListNavParams,
): void {
  const routes = navigation.getState()?.routes ?? [];
  const hasProductList = routes.some((route) => route.name === "ProductListScreen");

  if (hasProductList) {
    navigation.popTo("ProductListScreen", params);
    return;
  }

  navigation.navigate("ProductListScreen", params);
}

export function returnFromProductSelection<
  RouteName extends keyof NutritionStackParamList,
>(
  navigation: NativeStackNavigationProp<NutritionStackParamList>,
  routeName: RouteName,
  params: NutritionStackParamList[RouteName],
): void {
  const routes = navigation.getState()?.routes ?? [];
  const hasTarget = routes.some((route) => route.name === routeName);

  if (hasTarget) {
    navigation.popTo(routeName, params);
    return;
  }

  navigation.navigate(routeName, params);
}
