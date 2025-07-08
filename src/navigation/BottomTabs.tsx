import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BarChart3, Dumbbell, Heart, Home } from "lucide-react-native";
import React from "react";
import MacrosScreen from "../screens/NutritionScreen/MacrosScreen";
import HomeScreen from "../screens/HomeScreen";
import NutritionScreen from "../screens/NutritionScreen";
import WorkoutStack from "../screens/WorkoutStack";
import ProductListScreen from "../screens/NutritionScreen/ProductListScreen";
import NutritionStack from "../screens/NutritionScreen/NutritionStack";

const Tab = createBottomTabNavigator();

export const BottomTabs = () => {
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
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Entreno" component={WorkoutStack} />
      <Tab.Screen name="Nutrición" component={NutritionScreen} />
      <Tab.Screen name="Macros" component={NutritionStack} />
    </Tab.Navigator>
  );
};
