// navigation/BottomTabs.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BarChart3, Dumbbell, Heart, Home, User } from "lucide-react-native";
import React from "react";
import NutritionStack from "../features/nutrition/screens/NutritionStack";
import WorkoutStack from "../features/routine/screens/WorkoutStack";
import HomeScreen from "../screens/HomeScreen";
import NutritionScreen from "../screens/NutritionScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useNavigationStore } from "../store/useNavigationStore";
import { useTheme } from "../contexts/ThemeContext";

const Tab = createBottomTabNavigator();

export const BottomTabs = () => {
  const hiddenTabs = useNavigationStore((state) => state.hiddenTabs);
  const { theme } = useTheme();

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
            case "Perfil":
              return <User color={color} size={size} />;
          }
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        headerShown: false,
        // Aplicar visibilidad específica por tab
        tabBarStyle: {
          display: hiddenTabs[route.name] ? "none" : "flex",
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Entreno" component={WorkoutStack} />
      <Tab.Screen name="Nutrición" component={NutritionScreen} />
      <Tab.Screen name="Macros" component={NutritionStack} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
