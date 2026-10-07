// navigation/BottomTabs.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { BarChart3, Dumbbell, Heart, Home, User } from "lucide-react-native";
import React from "react";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import NutritionStack from "../features/nutrition/screens/NutritionStack";
import ProfileStack from "../features/profile/screens/ProfileStack";
import WorkoutStack from "../features/routine/screens/WorkoutStack";
import HomeScreen from "../screens/HomeScreen";
import NutritionScreen from "../screens/NutritionScreen";
import { useNavigationStore } from "../store/useNavigationStore";
import { shouldBlockHomeTabPress } from "./homeTabGate";

const Tab = createBottomTabNavigator();

export const BottomTabs = () => {
  const hiddenTabs = useNavigationStore((state) => state.hiddenTabs);
  const homeReady = useNavigationStore((state) => state.homeReady);
  const { theme } = useTheme();

  const isTabBarLockedForPayment = (route: any) => {
    const focusedRouteName = getFocusedRouteNameFromRoute(route);
    return focusedRouteName === "CheckoutScreen";
  };

  const shouldHideTabBar = (route: any) => {
    if (hiddenTabs[route.name] || isTabBarLockedForPayment(route)) {
      return true;
    }
    // Full-screen workout flow: hide tabs on nested Entreno screens.
    if (route.name === "Entreno") {
      const focusedRouteName = getFocusedRouteNameFromRoute(route);
      return Boolean(focusedRouteName && focusedRouteName !== "WorkoutList");
    }
    return false;
  };

  return (
    <Tab.Navigator
      screenListeners={({ route }) => ({
        tabPress: (e) => {
          if (shouldBlockHomeTabPress(route.name, homeReady)) {
            e.preventDefault();
          }
        },
      })}
      screenOptions={({ route }) => {
        const blocked = shouldBlockHomeTabPress(route.name, homeReady);
        return {
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
              default:
                return null;
            }
          },
          tabBarActiveTintColor: theme.tabBarActive,
          tabBarInactiveTintColor: theme.tabBarInactive,
          headerShown: false,
          tabBarStyle: {
            display: shouldHideTabBar(route) ? "none" : "flex",
            backgroundColor: theme.tabBarBackground,
            borderTopColor: theme.tabBarBorder,
            borderTopWidth: 1,
          },
          tabBarButton: (props) => (
            <PlatformPressable
              {...props}
              disabled={blocked}
              accessibilityState={{
                ...props.accessibilityState,
                disabled: blocked,
              }}
              style={[props.style, blocked ? { opacity: 0.4 } : null]}
            />
          ),
        };
      }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Entreno" component={WorkoutStack} />
      <Tab.Screen name="Nutrición" component={NutritionScreen} />
      <Tab.Screen name="Macros" component={NutritionStack} />
      <Tab.Screen name="Perfil" component={ProfileStack} />
    </Tab.Navigator>
  );
};
