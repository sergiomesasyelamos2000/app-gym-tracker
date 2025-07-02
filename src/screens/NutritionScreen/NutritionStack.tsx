import React from "react";
import ProductListScreen from "./ProductListScrenn";
import MacrosScreen from "./MacrosScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProductDetailScreen from "./ProductDetailScreen";

const Stack = createNativeStackNavigator();

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
    </Stack.Navigator>
  );
}
