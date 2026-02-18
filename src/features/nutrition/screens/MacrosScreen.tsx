import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import Icon from "react-native-vector-icons/MaterialIcons";
import type {
  FoodEntryResponseDto,
  MealType,
  UserMacroGoals,
} from "@sergiomesasyelamos2000/shared";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { useAuthStore } from "../../../store/useAuthStore";
import { useNavigationStore } from "../../../store/useNavigationStore";
import { useNutritionStore } from "../../../store/useNutritionStore";
import {
  CaughtError,
  getErrorMessage,
  getErrorStatusCode,
} from "../../../types";
import ReusableCameraView from "../../common/components/ReusableCameraView";
import { DailyCalorieChart } from "../components/DailyCalorieChart";
import { MacroDistributionChart } from "../components/MacroDistributionChart";
import * as nutritionService from "../services/nutritionService";
import {
  deleteFoodEntry,
  getProductDetail,
  scanBarcode,
} from "../services/nutritionService";

// Configurar calendario en español
LocaleConfig.locales["es"] = {
  monthNames: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  monthNamesShort: [
    "Ene.",
    "Feb.",
    "Mar.",
    "Abr.",
    "May.",
    "Jun.",
    "Jul.",
    "Ago.",
    "Sep.",
    "Oct.",
    "Nov.",
    "Dic.",
  ],
  dayNames: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
  dayNamesShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  today: "Hoy",
};
LocaleConfig.defaultLocale = "es";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MEAL_CONFIG: Record<
  MealType,
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }
> = {
  breakfast: { icon: "cafe-outline", label: "Desayuno", color: "#FF9800" },
  lunch: { icon: "restaurant-outline", label: "Almuerzo", color: "#4CAF50" },
  dinner: { icon: "moon-outline", label: "Cena", color: "#673AB7" },
  snack: { icon: "pizza-outline", label: "Snack", color: "#2196F3" },
};

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { NutritionStackParamList } from "./NutritionStack";

type Props = NativeStackScreenProps<NutritionStackParamList, "MacrosScreen">;
type FoodEntry = FoodEntryResponseDto;

export default function MacrosScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const user = useAuthStore((state) => state.user);
  const userProfile = useNutritionStore((state) => state.userProfile);
  const todayEntries = useNutritionStore((state) => state.todayEntries);
  const setTodayEntries = useNutritionStore((state) => state.setTodayEntries);
  const removeFoodEntry = useNutritionStore((state) => state.removeFoodEntry);
  const setUserProfile = useNutritionStore((state) => state.setUserProfile);
  const hasProfile = useNutritionStore((state) => state.hasProfile);
  const setHasProfile = useNutritionStore((state) => state.setHasProfile);
  const setTabVisibility = useNavigationStore(
    (state) => state.setTabVisibility
  );

  const [calendarKey, setCalendarKey] = useState(0);
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(
    new Set()
  );
  const [notEatenEntries, setNotEatenEntries] = useState<Set<string>>(
    new Set()
  );
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expandedMeals, setExpandedMeals] = useState<Record<MealType, boolean>>(
    {
      breakfast: true,
      lunch: true,
      dinner: true,
      snack: true,
    }
  );

  // Animation logic moved to MacroDistributionChart
  const [actionBarAnim] = useState(new Animated.Value(0));
  const [addButtonAnim] = useState(new Animated.Value(1));
  const calendarSlideAnim = useRef(new Animated.Value(0)).current;
  const calendarModalAnim = useRef(new Animated.Value(0)).current;
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const isSelectionMode = selectedEntries.size > 0;
  const isAllNotEatenSelected = Array.from(selectedEntries).every((id) =>
    notEatenEntries.has(id)
  );
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  // ✅ Verificar perfil al montar y cuando cambia el usuario
  useEffect(() => {
    if (user?.id) {
      checkUserProfile();
    }
  }, [user]);

  // ✅ Función para verificar si existe perfil
  const checkUserProfile = async () => {
    if (!user?.id) return;

    try {
      setCheckingProfile(true);
      const profile = await nutritionService.getUserProfile(user.id);
      setUserProfile(profile);
      setHasProfile(true);
      setShowSetupPrompt(false);
    } catch (error: CaughtError) {
      // ✅ Check if it's a 401 Unauthorized error (real auth issue)
      const statusCode = getErrorStatusCode(error);
      if (statusCode === 401) {
        const messageLower = getErrorMessage(error)?.toLowerCase() || "";

        // Check if it's truly an auth error (token expired, invalid, etc)
        // Generic "Unauthorized" without context is treated as missing profile
        const isAuthError =
          (messageLower.includes("token") ||
            messageLower.includes("authentication") ||
            messageLower.includes("jwt") ||
            messageLower.includes("expired") ||
            messageLower.includes("invalid")) &&
          messageLower !== "unauthorized";

        if (isAuthError) {
          // True auth error - session expired, redirect to login
          Alert.alert(
            "Sesión Expirada",
            "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
            [
              {
                text: "OK",
                onPress: () => {
                  // Resetea la navegación completa al stack de Auth/Login
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: "Auth" as never }], // o 'Login' dependiendo de tu estructura
                    })
                  );
                },
              },
            ]
          );
          return;
        }
      }

      // ✅ 404 Not Found or any other error = Missing profile
      // Show setup prompt to guide user to configuration
      setHasProfile(false);
      setUserProfile(null);
      setShowSetupPrompt(true);
    } finally {
      setCheckingProfile(false);
    }
  };

  // Animation listeners removed (moved to component)

  useEffect(() => {
    setTabVisibility("Macros", !isSelectionMode);

    if (isSelectionMode) {
      Animated.parallel([
        Animated.spring(actionBarAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(addButtonAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(actionBarAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(addButtonAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
      ]).start();
    }

    return () => setTabVisibility("Macros", true);
  }, [isSelectionMode, setTabVisibility]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadEntriesForDate(selectedDate);
      }
      setTabVisibility("Macros", true);
      return () => setTabVisibility("Macros", true);
    }, [selectedDate, user, setTabVisibility])
  );

  // Animar apertura/cierre del calendario con efecto fluido
  useEffect(() => {
    if (showCalendar) {
      Animated.spring(calendarModalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else {
      Animated.timing(calendarModalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }).start();
    }
  }, [showCalendar]);

  const loadEntriesForDate = async (date: string) => {
    if (!user?.id) return;

    try {
      const data = await nutritionService.getDailyEntries(user.id, date);
      setTodayEntries(data.entries);
      setHasProfile(data.hasProfile);

      // Si no tiene perfil, mostrar prompt
      if (!data.hasProfile) {
        setShowSetupPrompt(true);
      }
    } catch (error: CaughtError) {
      // ✅ Handle 401 Unauthorized (real authentication error)
      const statusCode = getErrorStatusCode(error);
      if (statusCode === 401) {
        const messageLower = getErrorMessage(error)?.toLowerCase() || "";

        // Check if it's truly an auth error (token expired, invalid, etc)
        // Generic "Unauthorized" without context is treated as missing profile
        const isAuthError =
          (messageLower.includes("token") ||
            messageLower.includes("authentication") ||
            messageLower.includes("jwt") ||
            messageLower.includes("expired") ||
            messageLower.includes("invalid")) &&
          messageLower !== "unauthorized";

        if (isAuthError) {
          // True auth error - session expired, redirect to login
          Alert.alert(
            "Sesión Expirada",
            "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
            [
              {
                text: "OK",
                onPress: () => {
                  // Resetea la navegación completa al stack de Auth/Login
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: "Auth" as never }], // o 'Login' dependiendo de tu estructura
                    })
                  );
                },
              },
            ]
          );
          return;
        }
      }

      // ✅ Any other error (404, 500, etc) or non-auth 401 = Show setup prompt
      setHasProfile(false);
      setShowSetupPrompt(true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEntriesForDate(selectedDate);
    setRefreshing(false);
  };

  const toggleSelectEntry = (entryId: string) => {
    setSelectedEntries((prev) => {
      const newSet = new Set(prev);
      newSet.has(entryId) ? newSet.delete(entryId) : newSet.add(entryId);
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedEntries(new Set());
    setTabVisibility("Macros", true);
  };

  const toggleNotEaten = () => {
    setNotEatenEntries((prev) => {
      const updated = new Set(prev);
      selectedEntries.forEach((id) => {
        updated.has(id) ? updated.delete(id) : updated.add(id);
      });
      return updated;
    });
    clearSelection();
  };

  const handleDeleteSelected = async () => {
    Alert.alert(
      "Eliminar alimentos",
      `¿Estás seguro de que quieres eliminar ${selectedEntries.size} alimento(s)?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              for (const id of selectedEntries) {
                await deleteFoodEntry(id);
                removeFoodEntry(id);
              }
              clearSelection();
            } catch (error) {
              Alert.alert("Error", "No se pudieron eliminar los alimentos");
            }
          },
        },
      ]
    );
  };

  const handleDuplicateSelected = async () => {
    if (!user?.id) return;

    Alert.alert(
      "Duplicar alimentos",
      `¿Deseas duplicar ${selectedEntries.size} alimento(s)?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Duplicar",
          onPress: async () => {
            try {
              setDuplicating(true);

              const entriesToDuplicate = todayEntries.filter((entry) =>
                selectedEntries.has(entry.id || "")
              );

              for (const entry of entriesToDuplicate) {
                await nutritionService.addFoodEntry({
                  userId: user.id,
                  date: selectedDate,
                  mealType: entry.mealType,
                  productCode: entry.productCode,
                  productName: entry.productName,
                  productImage: entry.productImage,
                  quantity: entry.quantity,
                  unit: entry.unit,
                  calories: entry.calories,
                  protein: entry.protein,
                  carbs: entry.carbs,
                  fat: entry.fat,
                });
              }

              await loadEntriesForDate(selectedDate);
              clearSelection();

              Alert.alert(
                "¡Éxito!",
                `${entriesToDuplicate.length} alimento(s) duplicado(s) correctamente`
              );
            } catch (error) {
              console.error("Error duplicating entries:", error);
              Alert.alert("Error", "No se pudieron duplicar los alimentos");
            } finally {
              setDuplicating(false);
            }
          },
        },
      ]
    );
  };

  const handleNavigateToDetail = async (entry: FoodEntry) => {
    if (isSelectionMode) return;
    if ((entry.productCode || "").startsWith("ai-")) {
      Alert.alert(
        "Entrada de IA",
        "Este alimento fue añadido desde análisis de foto y no tiene ficha de producto para abrir detalle."
      );
      return;
    }

    setLoadingProduct(true);
    try {
      const productDetail = await getProductDetail(entry.productCode!);

      navigation.navigate("ProductDetailScreen", {
        producto: productDetail,
        fromDiary: true,
        selectedMeal: entry.mealType,
        quantity: entry.quantity,
        unit: entry.unit,
        entryId: entry.id,
      });
    } catch (error) {
      console.error("Error cargando producto:", error);
      Alert.alert("Error", "No se pudo cargar el detalle del producto");
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleAddToMeal = (mealType: MealType) => {
    navigation.navigate("ProductListScreen", {
      selectedMeal: mealType,
      returnTo: "MacrosScreen",
    });
  };

  const handleBarCodeScanned = async (code: string) => {
    setShowScanner(false);
    try {
      const producto = await scanBarcode(code);

      if (producto) {
        navigation.navigate("ProductDetailScreen", { producto });
      } else {
        Alert.alert(
          "Producto no encontrado",
          "No se pudo encontrar el producto con ese código de barras"
        );
      }
    } catch (error) {
      console.error("Error escaneando código:", error);
      Alert.alert("Error", "No se pudo escanear el código de barras");
    }
  };

  const toggleMeal = (meal: MealType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMeals((prev) => ({ ...prev, [meal]: !prev[meal] }));
  };

  const handleDateSelect = (day: { dateString: string }) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        150,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setSelectedDate(day.dateString);
    setCalendarKey((prev) => prev + 1);
  };

  const handleTodayPress = () => {
    const today = new Date().toISOString().split("T")[0];
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        150,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setSelectedDate(today);
    setCalendarKey((prev) => prev + 1);
  };

  const formatDisplayDate = () => {
    const date = new Date(selectedDate + "T00:00:00");
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const formatShortDate = () => {
    const date = new Date(selectedDate + "T00:00:00");
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  const formatHeaderDate = () => {
    const date = new Date(selectedDate + "T00:00:00");
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  // ✅ Loading inicial mientras verifica perfil
  if (checkingProfile) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Cargando...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ Renderizar prompt de configuración
  if (showSetupPrompt && !hasProfile) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View
          style={[
            styles.setupPromptContainer,
            { backgroundColor: theme.background },
          ]}
        >
          <Ionicons name="nutrition-outline" size={80} color={theme.primary} />
          <Text style={[styles.setupPromptTitle, { color: theme.text }]}>
            ¡Bienvenido a Nutrición! 🎯
          </Text>
          <Text
            style={[styles.setupPromptText, { color: theme.textSecondary }]}
          >
            Para comenzar a usar esta sección y calcular tus macros
            personalizados, necesitas configurar tu perfil nutricional. Solo te
            tomará unos minutos y podrás ajustarlo cuando quieras.
          </Text>

          <View style={[styles.setupFeaturesList, { marginVertical: 20 }]}>
            <View style={styles.setupFeatureItem}>
              <Ionicons name="fitness" size={24} color={theme.success} />
              <Text style={[styles.setupFeatureText, { color: theme.text }]}>
                Objetivos personalizados según tu meta
              </Text>
            </View>
            <View style={styles.setupFeatureItem}>
              <Ionicons name="calculator" size={24} color={theme.success} />
              <Text style={[styles.setupFeatureText, { color: theme.text }]}>
                Cálculo automático de macros
              </Text>
            </View>
            <View style={styles.setupFeatureItem}>
              <Ionicons name="stats-chart" size={24} color={theme.success} />
              <Text style={[styles.setupFeatureText, { color: theme.text }]}>
                Seguimiento diario de calorías
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.setupPromptButton,
              { backgroundColor: theme.primary },
            ]}
            onPress={() => {
              navigation.navigate("UserProfileSetupScreen", {
                userId: user!.id,
              });
            }}
          >
            <Ionicons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.setupPromptButtonText}>
              Configurar Mi Perfil
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.setupPromptSkipButton}
            onPress={() => {
              setShowSetupPrompt(false);
            }}
          >
            <Text
              style={[
                styles.setupPromptSkipText,
                { color: theme.textSecondary },
              ]}
            >
              Continuar sin configurar
            </Text>
          </TouchableOpacity>

          <Text style={[styles.setupPromptNote, { color: theme.textTertiary }]}>
            💡 Podrás configurarlo más tarde desde tu perfil
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ Usar valores por defecto si no hay perfil
  const goals: UserMacroGoals = userProfile?.macroGoals || {
    dailyCalories: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
  };

  const effectiveEntries = todayEntries.filter(
    (entry) => !notEatenEntries.has(entry.id || "")
  );

  const totals = effectiveEntries.reduce(
    (
      acc: { calories: number; protein: number; carbs: number; fat: number },
      entry: FoodEntry
    ) => ({
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein || 0),
      carbs: acc.carbs + (entry.carbs || 0),
      fat: acc.fat + (entry.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remaining = {
    calories: goals.dailyCalories - totals.calories,
    protein: goals.protein - totals.protein,
    carbs: goals.carbs - totals.carbs,
    fat: goals.fat - totals.fat,
  };

  const percentages = {
    calories: Math.min(100, (totals.calories / goals.dailyCalories) * 100),
  };

  const entriesByMeal = todayEntries.reduce(
    (acc: Record<MealType, FoodEntry[]>, entry: FoodEntry) => {
      if (!acc[entry.mealType]) acc[entry.mealType] = [];
      acc[entry.mealType].push(entry);
      return acc;
    },
    {} as Record<MealType, FoodEntry[]>
  );

  const renderFoodEntry = (entry: FoodEntry) => {
    const isSelected = selectedEntries.has(entry.id || "");
    const isNotEaten = notEatenEntries.has(entry.id || "");

    return (
      <View
        key={entry.id}
        style={[
          styles.foodEntry,
          isSelected && styles.foodEntrySelected,
          isNotEaten && styles.foodEntryNotEaten,
        ]}
      >
        <TouchableOpacity
          style={styles.foodEntryContent}
          activeOpacity={0.7}
          onPress={() => {
            isSelectionMode
              ? toggleSelectEntry(entry.id!)
              : handleNavigateToDetail(entry);
          }}
          disabled={loadingProduct}
        >
          <View style={styles.foodEntryLeft}>
            <Text
              style={[
                styles.foodEntryName,
                isNotEaten && styles.foodEntryNameNotEaten,
              ]}
            >
              {entry.productName}
            </Text>
            <Text
              style={[
                styles.foodEntryDetails,
                isNotEaten && styles.foodEntryDetailsNotEaten,
              ]}
            >
              {entry.quantity} {entry.unit} • {Math.round(entry.calories)} kcal
            </Text>
          </View>
          <View style={styles.foodEntryMacros}>
            {[
              { key: "carbs", label: "C", color: "#FFF3E0" },
              { key: "protein", label: "P", color: "#E3F2FD" },
              { key: "fat", label: "G", color: "#FFE0B2" },
            ].map(({ key, label, color }) => (
              <View
                key={key}
                style={[styles.macroChip, { backgroundColor: color }]}
              >
                <Text style={styles.macroChipText}>
                  {label} {Math.round(entry[key as keyof FoodEntry] as number)}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => toggleSelectEntry(entry.id!)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isSelected ? "checkbox" : "square-outline"}
            size={24}
            color={isSelected ? theme.primary : theme.textTertiary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderMealSection = (mealType: MealType) => {
    const entries = entriesByMeal[mealType] || [];
    const mealTotals = entries
      .filter((entry) => !notEatenEntries.has(entry.id || ""))
      .reduce((sum: number, entry: FoodEntry) => sum + entry.calories, 0);
    const isExpanded = expandedMeals[mealType];
    const mealConfig = MEAL_CONFIG[mealType];

    return (
      <View key={mealType} style={styles.mealSection}>
        <TouchableOpacity
          style={styles.mealHeader}
          onPress={() => toggleMeal(mealType)}
          activeOpacity={0.7}
        >
          <View style={styles.mealHeaderLeft}>
            <View
              style={[
                styles.mealIconContainer,
                { backgroundColor: `${mealConfig.color}15` },
              ]}
            >
              <Ionicons
                name={mealConfig.icon}
                size={22}
                color={mealConfig.color}
              />
            </View>
            <View>
              <Text style={styles.mealTitle}>{mealConfig.label}</Text>
              <Text style={styles.mealSubtitle}>
                {entries.length}{" "}
                {entries.length === 1 ? "alimento" : "alimentos"}
              </Text>
            </View>
          </View>
          <View style={styles.mealHeaderRight}>
            <Text style={styles.mealCalories}>
              {Math.round(mealTotals)} kcal
            </Text>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#808080"
            />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.mealEntries}>
            {entries.length > 0 ? (
              entries.map(renderFoodEntry)
            ) : (
              <TouchableOpacity
                style={styles.emptyMealContainer}
                onPress={() => handleAddToMeal(mealType)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={32}
                  color={theme.primary}
                />
                <Text style={styles.emptyMealText}>
                  Toca para añadir alimentos
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const actionBarStyle = {
    transform: [
      {
        translateY: actionBarAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [150, 0],
        }),
      },
    ],
    opacity: actionBarAnim,
  };

  const addButtonStyle = {
    transform: [{ scale: addButtonAnim }],
    opacity: addButtonAnim,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      {(loadingProduct || duplicating) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>
            {duplicating ? "Duplicando alimentos..." : "Cargando..."}
          </Text>
        </View>
      )}

      {/* ✅ Banner informativo si no tiene perfil */}
      {!hasProfile && !showSetupPrompt && (
        <TouchableOpacity
          style={[styles.noBanner, { backgroundColor: theme.primary + "15" }]}
          onPress={() =>
            navigation.navigate("UserProfileSetupScreen", { userId: user!.id })
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={theme.primary}
          />
          <Text style={[styles.noBannerText, { color: theme.primary }]}>
            Completa tu perfil para ver objetivos personalizados
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.primary} />
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.screen}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {isToday ? "Hoy" : formatShortDate()}
              </Text>
              <Text style={styles.headerDate}>{formatHeaderDate()}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setShowScanner(true)}
                style={styles.iconButton}
              >
                <Ionicons
                  name="barcode-outline"
                  size={24}
                  color={theme.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCalendar(true)}
                style={styles.iconButton}
              >
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={theme.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate("ShoppingListScreen")}
                style={styles.iconButton}
              >
                <Ionicons name="cart-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <DailyCalorieChart
            consumed={totals.calories}
            target={goals.dailyCalories}
          />
        </View>

        <MacroDistributionChart
          carbs={{ current: totals.carbs, target: goals.carbs }}
          protein={{ current: totals.protein, target: goals.protein }}
          fat={{ current: totals.fat, target: goals.fat }}
        />

        <View style={styles.diarySection}>
          <Text style={styles.sectionTitle}>Diario de Alimentos</Text>
          {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map(
            renderMealSection
          )}
        </View>

        {todayEntries.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>Comienza tu día</Text>
            <Text style={styles.emptyStateText}>
              Registra tus comidas para alcanzar tus objetivos nutricionales
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
        presentationStyle="fullScreen"
      >
        <ReusableCameraView
          onBarCodeScanned={handleBarCodeScanned}
          onCloseCamera={() => setShowScanner(false)}
        />
      </Modal>

      {/* Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <Animated.View
            style={[
              styles.modalOverlayBackground,
              {
                opacity: calendarModalAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          />
        </TouchableOpacity>
        <View style={styles.modalContent} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.calendarModalContainer,
              {
                transform: [
                  {
                    scale: calendarModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                  {
                    translateY: calendarModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
                opacity: calendarModalAnim,
              },
            ]}
            pointerEvents="auto"
          >
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>Seleccionar Fecha</Text>
              <TouchableOpacity
                onPress={() => setShowCalendar(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {!isToday && (
              <TouchableOpacity
                style={styles.todayButton}
                onPress={handleTodayPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="today-outline"
                  size={20}
                  color={theme.primary}
                />
                <Text style={styles.todayButtonText}>Ir a Hoy</Text>
              </TouchableOpacity>
            )}

            <Animated.View
              style={{
                transform: [{ translateX: calendarSlideAnim }],
                opacity: calendarSlideAnim.interpolate({
                  inputRange: [-30, 0, 30],
                  outputRange: [0.7, 1, 0.7],
                }),
              }}
            >
              <Calendar
                key={calendarKey}
                current={selectedDate}
                onDayPress={handleDateSelect}
                markedDates={{
                  [selectedDate]: {
                    selected: true,
                    selectedColor: theme.primary,
                    selectedTextColor: "#ffffff",
                  },
                  [new Date().toISOString().split("T")[0]]: {
                    marked: true,
                    dotColor: theme.primary,
                    selected:
                      selectedDate === new Date().toISOString().split("T")[0],
                    selectedColor: theme.primary,
                  },
                }}
                enableSwipeMonths={true}
                hideExtraDays={false}
                disableAllTouchEventsForDisabledDays={true}
                monthFormat={"MMMM yyyy"}
                onMonthChange={(month) => {
                  // Determinar dirección del swipe
                  const currentMonthDate = new Date(currentMonth);
                  const newMonthDate = new Date(month.dateString);
                  const direction = newMonthDate > currentMonthDate ? 1 : -1;

                  // Animar desde el lado correspondiente con timing suave
                  calendarSlideAnim.setValue(direction * 30);
                  Animated.timing(calendarSlideAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                  }).start();

                  setCurrentMonth(month.dateString);
                }}
                renderArrow={(direction) => (
                  <View style={styles.arrowButton}>
                    <Ionicons
                      name={
                        direction === "left"
                          ? "chevron-back"
                          : "chevron-forward"
                      }
                      size={24}
                      color={theme.primary}
                    />
                  </View>
                )}
                theme={{
                  backgroundColor: theme.card,
                  calendarBackground: theme.card,
                  textSectionTitleColor: theme.textSecondary,
                  selectedDayBackgroundColor: theme.primary,
                  selectedDayTextColor: "#ffffff",
                  todayTextColor: theme.primary,
                  dayTextColor: theme.text,
                  textDisabledColor: theme.textTertiary,
                  dotColor: theme.primary,
                  selectedDotColor: "#ffffff",
                  arrowColor: theme.primary,
                  monthTextColor: theme.text,
                  indicatorColor: theme.primary,
                  textDayFontFamily: "System",
                  textMonthFontFamily: "System",
                  textDayHeaderFontFamily: "System",
                  textDayFontWeight: "400",
                  textMonthFontWeight: "700",
                  textDayHeaderFontWeight: "600",
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 13,
                }}
                style={styles.calendar}
              />
            </Animated.View>

            <View style={styles.calendarFooter}>
              <Text style={styles.selectedDateText}>
                {selectedDate === new Date().toISOString().split("T")[0]
                  ? "Hoy"
                  : formatDisplayDate()}
              </Text>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut
                  );
                  setShowCalendar(false);
                  loadEntriesForDate(selectedDate);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Animated.View
        style={[styles.floatingActionBar, actionBarStyle]}
        pointerEvents={isSelectionMode ? "auto" : "none"}
      >
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDeleteSelected}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Eliminar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDuplicateSelected}
          disabled={duplicating}
        >
          {duplicating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="copy-outline" size={20} color="#fff" />
          )}
          <Text style={styles.actionButtonText}>Duplicar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={toggleNotEaten}>
          <Ionicons
            name={
              isAllNotEatenSelected
                ? "checkmark-circle-outline"
                : "close-circle-outline"
            }
            size={20}
            color="#fff"
          />
          <Text style={styles.actionButtonText}>
            {isAllNotEatenSelected ? "Comido" : "No comido"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={clearSelection}>
          <Ionicons name="close" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[styles.addButton, addButtonStyle]}
        pointerEvents={isSelectionMode ? "none" : "auto"}
      >
        <TouchableOpacity
          style={styles.addButtonTouchable}
          onPress={() => navigation.navigate("ProductListScreen")}
        >
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    screen: { flex: 1 },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    // ✅ Estilos para el prompt de configuración
    setupPromptContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
      backgroundColor: theme.background,
    },
    setupPromptTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
      marginTop: 24,
      marginBottom: 16,
      textAlign: "center",
    },
    setupPromptText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 32,
    },
    setupFeaturesList: {
      gap: 16,
      width: "100%",
      paddingHorizontal: 16,
    },
    setupFeatureItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    setupFeatureText: {
      fontSize: 15,
      fontWeight: "500",
      flex: 1,
    },
    setupPromptButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      paddingVertical: 16,
      paddingHorizontal: 48,
      borderRadius: 12,
      marginBottom: 16,
      elevation: 4,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    setupPromptButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    setupPromptSkipButton: {
      paddingVertical: 12,
      marginBottom: 8,
    },
    setupPromptSkipText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: "600",
    },
    setupPromptNote: {
      fontSize: 12,
      color: theme.textTertiary,
      textAlign: "center",
      marginTop: 8,
    },
    // ✅ Banner informativo
    noBanner: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 10,
      borderBottomWidth: 2,
      borderBottomColor: theme.primary + "30",
    },
    noBannerText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 20,
    },
    header: { backgroundColor: theme.card, padding: 20, marginBottom: 12 },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    headerTitleContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 4,
    },
    headerDate: {
      fontSize: 14,
      color: theme.textSecondary,
      textTransform: "capitalize",
    },
    headerActions: { flexDirection: "row", gap: 8 },
    iconButton: { padding: 8 },
    caloriesCard: { alignItems: "center", marginBottom: 16 },
    caloriesLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    caloriesValue: { fontSize: 48, fontWeight: "700", color: theme.success },
    caloriesValueExceeded: { color: theme.error },
    caloriesSubtext: { fontSize: 14, color: theme.textTertiary, marginTop: 4 },
    caloriesProgressBar: {
      width: "100%",
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: "hidden",
    },
    caloriesProgressFill: { height: "100%", borderRadius: 4 },
    macrosSection: {
      backgroundColor: theme.card,
      padding: 20,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 16,
    },
    macrosRow: { flexDirection: "row", justifyContent: "space-between" },
    macroCircle: { alignItems: "center" },
    circleTitle: { fontSize: 12, color: theme.textSecondary },
    macrosRemaining: {
      fontSize: 11,
      color: theme.textTertiary,
      marginTop: 8,
      textAlign: "center",
    },
    diarySection: {
      backgroundColor: theme.card,
      padding: 20,
      marginBottom: 20,
    },
    mealSection: {
      borderRadius: 12,
      marginBottom: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
    },
    mealHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: theme.backgroundSecondary,
    },
    mealHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    mealIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    mealTitle: { fontSize: 16, fontWeight: "600", color: theme.text },
    mealSubtitle: { fontSize: 12, color: theme.textTertiary, marginTop: 2 },
    mealHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    mealCalories: { fontSize: 14, fontWeight: "600", color: theme.primary },
    mealEntries: { backgroundColor: theme.card },
    foodEntry: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.backgroundSecondary,
    },
    foodEntrySelected: { backgroundColor: "#F3E8FF" },
    foodEntryNotEaten: { opacity: 0.5 },
    foodEntryContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    foodEntryLeft: { flex: 1 },
    foodEntryName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 4,
    },
    foodEntryNameNotEaten: {
      textDecorationLine: "line-through",
      color: theme.textTertiary,
    },
    foodEntryDetails: { fontSize: 13, color: theme.textSecondary },
    foodEntryDetailsNotEaten: {
      textDecorationLine: "line-through",
      color: theme.textTertiary,
    },
    foodEntryMacros: { flexDirection: "row", gap: 4 },
    macroChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    macroChipText: { fontSize: 11, fontWeight: "600", color: "#1A1A1A" },
    checkboxContainer: { padding: 8, marginLeft: 8 },
    emptyMealContainer: { alignItems: "center", paddingVertical: 32 },
    emptyMealText: {
      fontSize: 14,
      color: theme.primary,
      marginTop: 8,
      fontWeight: "500",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 32,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    floatingActionBar: {
      position: "absolute",
      bottom: 80,
      left: 16,
      right: 16,
      backgroundColor: theme.primary,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 16,
      elevation: 8,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    actionButton: { alignItems: "center", flex: 1 },
    actionButtonText: {
      fontSize: 11,
      color: "#fff",
      marginTop: 4,
      fontWeight: "600",
    },
    addButton: { position: "absolute", bottom: 20, right: 20 },
    addButtonTouchable: {
      backgroundColor: theme.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      elevation: 8,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    modalOverlayBackground: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    calendarModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    calendarModalTitle: { fontSize: 20, fontWeight: "700", color: theme.text },
    todayButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 8,
      backgroundColor: "#F3E8FF",
      borderRadius: 12,
    },
    todayButtonText: { fontSize: 16, fontWeight: "600", color: theme.primary },
    calendar: {
      marginTop: 8,
      paddingBottom: 12,
    },
    calendarFooter: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    selectedDateText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: 12,
      textTransform: "capitalize",
    },
    confirmButton: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    confirmButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
    arrowButton: {
      padding: 8,
      borderRadius: 8,
    },
    calendarModalContainer: {
      backgroundColor: theme.card,
      borderRadius: 24,
      width: "100%",
      maxWidth: 400,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: theme.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
    },
  });
