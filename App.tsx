import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { StatusBar, View, Text, StyleSheet } from "react-native";
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";
import { BottomTabs } from "./src/navigation";

import "react-native-gesture-handler";
import Toast from "react-native-toast-message";

import { ToastConfigParams } from "react-native-toast-message";
import { ProgressBar } from "react-native-paper";
import CustomToast from "./src/ui/CustomToast";

const toastConfig = {
  customToast: ({ text1, props }: ToastConfigParams<any>) => (
    <CustomToast
      text1={text1 ?? ""}
      progress={props?.progress}
      onCancel={props?.onCancel}
      onAddTime={props?.onAddTime}
      onSubtractTime={props?.onSubtractTime}
    />
  ),
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" />
        <BottomTabs />
      </NavigationContainer>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}
