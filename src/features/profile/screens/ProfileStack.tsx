import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import ProfileScreen from "../../../screens/ProfileScreen";
import ExportDataScreen from "../../common/screens/ExportDataScreen";
import { CheckoutScreen } from "../../subscription/screens/CheckoutScreen";
import { PlansScreen } from "../../subscription/screens/PlansScreen";
import { StatusScreen } from "../../subscription/screens/StatusScreen";

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ExportData: undefined;
  PlansScreen: undefined;
  SubscriptionStatus: undefined;
  CheckoutScreen: { planId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="ExportData" component={ExportDataScreen} />
      <Stack.Screen name="PlansScreen" component={PlansScreen} />
      <Stack.Screen name="SubscriptionStatus" component={StatusScreen} />
      <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
    </Stack.Navigator>
  );
}
