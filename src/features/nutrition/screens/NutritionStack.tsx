import React from "react";
import ProductListScreen from "./ProductListScreen";
import MacrosScreen from "./MacrosScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProductDetailScreen from "./ProductDetailScreen";
import UserProfileSetupScreen from "./UserProfileSetupScreen";
import { Product } from "../../../models/nutrition.model";

export type NutritionStackParamList = {
  MacrosScreen: undefined;
  ProductListScreen: undefined;
  ProductDetailScreen: { producto: Product };
  UserProfileSetupScreen: { userId: string };
};

const Stack = createNativeStackNavigator<NutritionStackParamList>();

export default function NutritionStack() {
  return (
    <Stack.Navigator initialRouteName="MacrosScreen">
      <Stack.Screen
        name="MacrosScreen"
        component={MacrosScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductListScreen"
        component={ProductListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductDetailScreen"
        component={ProductDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserProfileSetupScreen"
        component={UserProfileSetupScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
