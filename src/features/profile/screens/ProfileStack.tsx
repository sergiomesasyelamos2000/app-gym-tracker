import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import ProfileScreen from "../../../screens/ProfileScreen";
import ExportDataScreen from "../../common/screens/ExportDataScreen";

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ExportData: undefined;
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
    </Stack.Navigator>
  );
}
