// navigation/BottomTabs.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BarChart3, Dumbbell, Heart, Home } from "lucide-react-native";
import React from "react";
import LoginScreen from "../features/login/screens/LoginScreen";
import NutritionStack from "../features/nutrition/screens/NutritionStack";
import WorkoutStack from "../features/routine/screens/WorkoutStack";
import HomeScreen from "../screens/HomeScreen";
import NutritionScreen from "../screens/NutritionScreen";
import { useNavigationStore } from "../store/useNavigationStore";

const Tab = createBottomTabNavigator();

export const BottomTabs = () => {
  const hiddenTabs = useNavigationStore((state) => state.hiddenTabs);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case "Inicio":
              return <Home color={color} size={size} />;
            case "Entreno":
              return <Dumbbell color={color} size={size} />;
            case "Nutrición":
              return <Heart color={color} size={size} />;
            case "Macros":
              return <BarChart3 color={color} size={size} />;
          }
        },
        tabBarActiveTintColor: "#6C3BAA",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        // Aplicar visibilidad específica por tab
        tabBarStyle: {
          display: hiddenTabs[route.name] ? "none" : "flex",
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Login" component={LoginScreen} />
      <Tab.Screen name="Entreno" component={WorkoutStack} />
      <Tab.Screen name="Nutrición" component={NutritionScreen} />
      <Tab.Screen name="Macros" component={NutritionStack} />
    </Tab.Navigator>
  );
};
