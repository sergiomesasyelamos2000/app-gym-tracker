import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { StatusBar } from "react-native";
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";
import { BottomTabs } from "./src/navigation";

import "react-native-gesture-handler";
import Toast from "react-native-toast-message";

import { Provider as PaperProvider } from "react-native-paper";
import { ToastConfigParams } from "react-native-toast-message";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "./src/store/store";
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
    <ReduxProvider store={store}>
      <PaperProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" />
            <BottomTabs />
          </NavigationContainer>
          <Toast config={toastConfig} />
        </SafeAreaProvider>
      </PaperProvider>
    </ReduxProvider>
  );
}
