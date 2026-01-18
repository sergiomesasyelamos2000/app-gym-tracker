import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  CustomMeal,
  CustomProduct,
  MealProduct,
  MealType,
  Product,
} from "../../../models/nutrition.model";
import CreateMealScreen from "./CreateMealScreen";
import CreateProductScreen from "./CreateProductScreen";
import EditMealScreen from "./EditMealScreen";
import EditNutritionProfileScreen from "./EditNutritionProfileScreen";
import EditProductScreen from "./EditProductScreen";
import MacrosScreen from "./MacrosScreen";
import ProductDetailScreen from "./ProductDetailScreen";
import ProductListScreen from "./ProductListScreen";
import ProductSelectionScreen from "./ProductSelectionScreen";
import SettingsScreen from "./SettingsScreen";
import ShoppingListScreen from "./ShoppingListScreen";
import UserProfileSetupScreen from "./UserProfileSetupScreen";

export type NutritionStackParamList = {
  MacrosScreen: undefined;
  ProductListScreen:
    | {
        refresh?: boolean;
        screen?: string;
        selectionMode?: boolean;
        returnTo?: string;
        selectedMeal?: MealType;
      }
    | undefined;
  ProductDetailScreen: {
    producto: Product;
    selectionMode?: boolean;
    returnTo?: string;
    quickAdd?: boolean;
    selectedMeal?: MealType;
  };
  UserProfileSetupScreen: { userId: string };
  EditNutritionProfileScreen: undefined;
  ShoppingListScreen: undefined;
  SettingsScreen: undefined;
  CreateProductScreen:
    | { barcode?: string; selectedMeal?: MealType }
    | undefined;
  CreateMealScreen: {
    selectedProduct?: MealProduct;
    selectedProducts?: (Product | CustomProduct | CustomMeal)[];
    draftName?: string;
    draftDescription?: string;
    draftImageUri?: string | null;
  };
  EditProductScreen: { product: CustomProduct };
  EditMealScreen: {
    meal: CustomMeal;
    selectedProduct?: MealProduct;
    selectedProducts?: (Product | CustomProduct | CustomMeal)[];
  };
  ProductSelectionScreen:
    | {
        from?: string;
        meal?: CustomMeal;
        draftName?: string;
        draftDescription?: string;
        draftImageUri?: string | null;
      }
    | undefined;
};

const Stack = createNativeStackNavigator<NutritionStackParamList>();

export default function NutritionStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="MacrosScreen"
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
      }}
    >
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
      <Stack.Screen
        name="EditNutritionProfileScreen"
        component={EditNutritionProfileScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ShoppingListScreen"
        component={ShoppingListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateProductScreen"
        component={CreateProductScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="EditProductScreen"
        component={EditProductScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="CreateMealScreen"
        component={CreateMealScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="EditMealScreen"
        component={EditMealScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ProductSelectionScreen"
        component={ProductSelectionScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
