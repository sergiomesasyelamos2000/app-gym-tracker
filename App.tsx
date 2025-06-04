import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabs } from './src/navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { TailwindProvider } from 'tailwind-rn';
import "./global.css";

import 'react-native-gesture-handler';



export default function App() {
  return (
    <SafeAreaProvider>
      {/* <TailwindProvider utilities={utilities}> */}
        <NavigationContainer>
          <StatusBar barStyle="dark-content" />
          <BottomTabs />
        </NavigationContainer>
      {/* </TailwindProvider> */}
    </SafeAreaProvider>
  );
}