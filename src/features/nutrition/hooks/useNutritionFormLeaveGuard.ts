import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import type { NutritionStackParamList } from "../screens/NutritionStack";
import {
  leaveToProductList,
  type ProductListNavParams,
} from "../utils/nutritionNavigation";

type NavigationProp = NativeStackNavigationProp<NutritionStackParamList>;

interface UseNutritionFormLeaveGuardOptions {
  isDirty: () => boolean;
  productListParams?: ProductListNavParams;
}

export function useNutritionFormLeaveGuard({
  isDirty,
  productListParams,
}: UseNutritionFormLeaveGuardOptions) {
  const navigation = useNavigation<NavigationProp>();
  const allowLeaveRef = useRef(false);

  const leaveToList = useCallback(() => {
    allowLeaveRef.current = true;
    leaveToProductList(navigation, productListParams);
  }, [navigation, productListParams]);

  const confirmDiscard = useCallback(
    (onDiscard: () => void) => {
      Alert.alert(
        "¿Descartar cambios?",
        "Los cambios que no has guardado se perderán.",
        [
          { text: "Seguir editando", style: "cancel" },
          { text: "Descartar", style: "destructive", onPress: onDiscard },
        ],
      );
    },
    [],
  );

  const requestLeave = useCallback(() => {
    if (!isDirty()) {
      leaveToList();
      return;
    }

    confirmDiscard(leaveToList);
  }, [confirmDiscard, isDirty, leaveToList]);

  const completeSavedLeave = useCallback(
    (params?: ProductListNavParams) => {
      allowLeaveRef.current = true;
      leaveToProductList(navigation, params ?? productListParams);
    },
    [navigation, productListParams],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowLeaveRef.current) return;
      if (event.data.action.type === "RESET") return;
      if (!isDirty()) return;

      event.preventDefault();
      confirmDiscard(() => {
        leaveToList();
      });
    });

    return unsubscribe;
  }, [confirmDiscard, isDirty, leaveToList, navigation]);

  return {
    requestLeave,
    completeSavedLeave,
    allowLeaveRef,
  };
}
