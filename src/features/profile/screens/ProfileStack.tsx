import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import { nativeStackStatusBarStyle } from "../../../hooks/useFocusedStatusBar";
import ProfileScreen from "../../../screens/ProfileScreen";
import ExportDataScreen from "../../common/screens/ExportDataScreen";
import EditNutritionProfileScreen from "../../nutrition/screens/EditNutritionProfileScreen";
import UserProfileSetupScreen from "../../nutrition/screens/UserProfileSetupScreen";
import { CheckoutScreen } from "../../subscription/screens/CheckoutScreen";
import { PlansScreen } from "../../subscription/screens/PlansScreen";
import { StatusScreen } from "../../subscription/screens/StatusScreen";

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ExportData: undefined;
  PlansScreen: undefined;
  SubscriptionStatus: undefined;
  CheckoutScreen: { planId: string };
  EditNutritionProfileScreen: undefined;
  UserProfileSetupScreen: { userId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  const { isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        statusBarStyle: nativeStackStatusBarStyle(isDark),
        statusBarTranslucent: true,
        statusBarBackgroundColor: "transparent",
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="ExportData" component={ExportDataScreen} />
      <Stack.Screen name="PlansScreen" component={PlansScreen} />
      <Stack.Screen name="SubscriptionStatus" component={StatusScreen} />
      <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <Stack.Screen
        name="EditNutritionProfileScreen"
        component={EditNutritionProfileScreen}
      />
      <Stack.Screen
        name="UserProfileSetupScreen"
        component={UserProfileSetupScreen}
      />
    </Stack.Navigator>
  );
}
