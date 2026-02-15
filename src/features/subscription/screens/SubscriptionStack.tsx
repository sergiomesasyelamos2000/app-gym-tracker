import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SubscriptionPlan } from '@sergiomesasyelamos2000/shared';
import { PlansScreen } from './PlansScreen';
import { CheckoutScreen } from './CheckoutScreen';
import { StatusScreen } from './StatusScreen';

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
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: '#f9fafb',
        },
        headerTintColor: '#111827',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="PlansScreen"
        component={PlansScreen}
        options={{
          title: 'Choose Your Plan',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CheckoutScreen"
        component={CheckoutScreen}
        options={{
          title: 'Checkout',
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="StatusScreen"
        component={StatusScreen}
        options={{
          title: 'Subscription Status',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
