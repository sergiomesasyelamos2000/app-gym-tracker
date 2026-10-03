import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { NutritionStackParamList } from "../screens/NutritionStack";

export type ProductListNavParams = NonNullable<
  NutritionStackParamList["ProductListScreen"]
>;

type StackBackNav = {
  canGoBack: () => boolean;
  goBack: () => void;
  replace: (name: string) => void;
  getState: () =>
    | {
        routeNames?: string[];
        routes: Array<{ name: string }>;
      }
    | undefined;
};

function stackRouteNames(navigation: StackBackNav): string[] {
  const state = navigation.getState();
  if (!state) return [];
  if (state.routeNames?.length) return state.routeNames;
  return state.routes.map((route) => route.name);
}

/**
 * Return to the screen that opened the current stack screen.
 * Never jumps to Inicio/Home. Only uses replace as a last resort when
 * this screen was mounted as the stack root (no history).
 */
export function leaveToPreviousScreen(navigation: StackBackNav): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  const names = stackRouteNames(navigation);
  if (names.includes("ProfileMain")) {
    navigation.replace("ProfileMain");
    return;
  }
  if (names.includes("MacrosScreen")) {
    navigation.replace("MacrosScreen");
  }
}

/** @deprecated Use leaveToPreviousScreen — kept for call-site migration */
export function leaveNutritionStackToMacros(
  navigation: NativeStackNavigationProp<NutritionStackParamList>,
): void {
  leaveToPreviousScreen(navigation);
}

/**
 * After first-time nutrition profile setup: land on the Macros diary.
 * Preserves correct stack depending on whether setup lived in Macros or Perfil.
 */
export function finishNutritionProfileSetup(navigation: StackBackNav & {
  navigate: (name: string, params?: Record<string, unknown>) => void;
  getParent?: () =>
    | {
        navigate: (name: string, params?: Record<string, unknown>) => void;
      }
    | undefined;
}): void {
  const names = stackRouteNames(navigation);

  if (names.includes("MacrosScreen")) {
    navigation.replace("MacrosScreen");
    return;
  }

  // Opened from Perfil stack — switch to Macros tab and clear setup from Perfil.
  if (names.includes("ProfileMain")) {
    navigation.replace("ProfileMain");
  }
  const parent = navigation.getParent?.();
  if (parent) {
    parent.navigate("Macros", { screen: "MacrosScreen" });
    return;
  }
  navigation.navigate("Macros", { screen: "MacrosScreen" });
}

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
