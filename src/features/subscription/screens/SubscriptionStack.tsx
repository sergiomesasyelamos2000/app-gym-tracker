import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { SubscriptionPlan } from "@sergiomesasyelamos2000/shared";
import { useTheme } from "../../../contexts/ThemeContext";
import { PlansScreen } from "./PlansScreen";
import { CheckoutScreen } from "./CheckoutScreen";
import { StatusScreen } from "./StatusScreen";

export type SubscriptionStackParamList = {
  PlansScreen: undefined;
  CheckoutScreen: {
    sessionId: string;
    checkoutUrl: string;
    planId: SubscriptionPlan;
  };
  StatusScreen: {
    success?: boolean;
  };
};

const Stack = createNativeStackNavigator<SubscriptionStackParamList>();

export function SubscriptionStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: theme.backgroundSecondary,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: "600",
          color: theme.text,
        },
        contentStyle: {
          backgroundColor: theme.background,
        },
      }}
    >
      <Stack.Screen
        name="PlansScreen"
        component={PlansScreen}
        options={{
          title: "Choose Your Plan",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CheckoutScreen"
        component={CheckoutScreen}
        options={{
          title: "Checkout",
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="StatusScreen"
        component={StatusScreen}
        options={{
          title: "Subscription Status",
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
