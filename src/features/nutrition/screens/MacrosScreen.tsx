import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import CircularProgress from "react-native-circular-progress-indicator";
import Icon from "react-native-vector-icons/MaterialIcons";
import { FoodEntry, MealType } from "../../../models/nutrition.model";
import { useAuthStore } from "../../../store/useAuthStore";
import { useNavigationStore } from "../../../store/useNavigationStore";
import { useNutritionStore } from "../../../store/useNutritionStore";
import ReusableCameraView from "../../common/components/ReusableCameraView";
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
  { icon: string; label: string; color: string }
> = {
  breakfast: { icon: "cafe-outline", label: "Desayuno", color: "#FF9800" },
  lunch: { icon: "restaurant-outline", label: "Almuerzo", color: "#4CAF50" },
  dinner: { icon: "moon-outline", label: "Cena", color: "#673AB7" },
  snack: { icon: "pizza-outline", label: "Snack", color: "#2196F3" },
};

export default function MacrosScreen({ navigation }: { navigation: any }) {
  const user = useAuthStore((state) => state.user);
  const userProfile = useNutritionStore((state) => state.userProfile);
  const todayEntries = useNutritionStore((state) => state.todayEntries);
  const setTodayEntries = useNutritionStore((state) => state.setTodayEntries);
  const removeFoodEntry = useNutritionStore((state) => state.removeFoodEntry);
  const isProfileComplete = useNutritionStore(
    (state) => state.isProfileComplete
  );
  const setTabVisibility = useNavigationStore(
    (state) => state.setTabVisibility
  );

  const [calendarKey, setCalendarKey] = useState(0);

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

  const animatedCarbs = useRef(new Animated.Value(0)).current;
  const animatedProtein = useRef(new Animated.Value(0)).current;
  const animatedFat = useRef(new Animated.Value(0)).current;
  const [displayCarbs, setDisplayCarbs] = useState(0);
  const [displayProtein, setDisplayProtein] = useState(0);
  const [displayFat, setDisplayFat] = useState(0);
  const [actionBarAnim] = useState(new Animated.Value(0));
  const [addButtonAnim] = useState(new Animated.Value(1));

  const isSelectionMode = selectedEntries.size > 0;
  const isAllNotEatenSelected = Array.from(selectedEntries).every((id) =>
    notEatenEntries.has(id)
  );
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!isProfileComplete() && user?.id) {
      navigation.replace("UserProfileSetupScreen", { userId: user.id });
    }
  }, [isProfileComplete, user]);

  useEffect(() => {
    const listeners = [
      animatedCarbs.addListener(({ value }) => setDisplayCarbs(value)),
      animatedProtein.addListener(({ value }) => setDisplayProtein(value)),
      animatedFat.addListener(({ value }) => setDisplayFat(value)),
    ];

    return () => {
      listeners.forEach((id, index) => {
        [animatedCarbs, animatedProtein, animatedFat][index].removeListener(id);
      });
    };
  }, []);

  useEffect(() => {
    if (!userProfile) return;

    const effectiveEntries = todayEntries.filter(
      (entry) => !notEatenEntries.has(entry.id || "")
    );

    const totals = effectiveEntries.reduce(
      (acc, entry) => ({
        carbs: acc.carbs + entry.carbs,
        protein: acc.protein + entry.protein,
        fat: acc.fat + entry.fat,
      }),
      { carbs: 0, protein: 0, fat: 0 }
    );

    Animated.parallel([
      Animated.timing(animatedCarbs, {
        toValue: totals.carbs,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(animatedProtein, {
        toValue: totals.protein,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(animatedFat, {
        toValue: totals.fat,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();
  }, [todayEntries, notEatenEntries, userProfile]);

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
      loadEntriesForDate(selectedDate);
      setTabVisibility("Macros", true);
      return () => setTabVisibility("Macros", true);
    }, [selectedDate, setTabVisibility])
  );

  const loadEntriesForDate = async (date: string) => {
    if (!userProfile) return;

    try {
      const data = await nutritionService.getDailyEntries(userProfile.id, date);
      setTodayEntries(data.entries);
    } catch (error) {
      console.error("Error loading entries:", error);
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
    if (!userProfile) return;

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
                  userId: userProfile.id,
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

  const handleDateSelect = (day: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDate(day.dateString);
    setCalendarKey((prev) => prev + 1); // Forzar re-render
  };

  const handleTodayPress = () => {
    const today = new Date().toISOString().split("T")[0];
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    if (isToday) {
      return date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } else {
      return date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
  };

  if (!userProfile) return null;

  const effectiveEntries = todayEntries.filter(
    (entry) => !notEatenEntries.has(entry.id || "")
  );

  const totals = effectiveEntries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const goals = userProfile.macroGoals;

  const remaining = {
    calories: goals.dailyCalories - totals.calories,
    protein: goals.protein - displayProtein,
    carbs: goals.carbs - displayCarbs,
    fat: goals.fat - displayFat,
  };

  const percentages = {
    calories: Math.min(100, (totals.calories / goals.dailyCalories) * 100),
  };

  const entriesByMeal = todayEntries.reduce((acc, entry) => {
    if (!acc[entry.mealType]) acc[entry.mealType] = [];
    acc[entry.mealType].push(entry);
    return acc;
  }, {} as Record<MealType, FoodEntry[]>);

  if (showScanner) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ReusableCameraView
          onBarCodeScanned={handleBarCodeScanned}
          onCloseCamera={() => setShowScanner(false)}
        />
      </SafeAreaView>
    );
  }

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
            color={isSelected ? "#6C3BAA" : "#B0B0B0"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderMealSection = (mealType: MealType) => {
    const entries = entriesByMeal[mealType] || [];
    const mealTotals = entries
      .filter((entry) => !notEatenEntries.has(entry.id || ""))
      .reduce((sum, entry) => sum + entry.calories, 0);
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
                name={mealConfig.icon as any}
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
                <Ionicons name="add-circle-outline" size={32} color="#6C3BAA" />
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
      {(loadingProduct || duplicating) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6C3BAA" />
          <Text style={styles.loadingText}>
            {duplicating ? "Duplicando alimentos..." : "Cargando..."}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.screen}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6C3BAA"]}
            tintColor="#6C3BAA"
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
                <Ionicons name="barcode-outline" size={24} color="#6C3BAA" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCalendar(true)}
                style={styles.iconButton}
              >
                <Ionicons name="calendar-outline" size={24} color="#6C3BAA" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate("ShoppingListScreen")}
                style={styles.iconButton}
              >
                <Ionicons name="cart-outline" size={24} color="#6C3BAA" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate("SettingsScreen")}
                style={styles.iconButton}
              >
                <Ionicons name="settings-outline" size={24} color="#6C3BAA" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.caloriesCard}>
            <Text style={styles.caloriesLabel}>
              {remaining.calories > 0
                ? "Calorías disponibles"
                : "Calorías excedidas"}
            </Text>
            <Text
              style={[
                styles.caloriesValue,
                remaining.calories < 0 && styles.caloriesValueExceeded,
              ]}
            >
              {Math.abs(Math.round(remaining.calories))}
            </Text>
            <Text style={styles.caloriesSubtext}>
              {Math.round(totals.calories)} de {goals.dailyCalories} kcal
            </Text>
          </View>

          <View style={styles.caloriesProgressBar}>
            <View
              style={[
                styles.caloriesProgressFill,
                {
                  width: `${Math.min(100, percentages.calories)}%`,
                  backgroundColor:
                    remaining.calories > 0 ? "#4CAF50" : "#FF6B6B",
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.macrosSection}>
          <Text style={styles.sectionTitle}>Macronutrientes</Text>
          <View style={styles.macrosRow}>
            {[
              {
                key: "carbs",
                label: "Carbos",
                color: "#FFB74D",
                value: displayCarbs,
                goal: goals.carbs,
                remaining: remaining.carbs,
              },
              {
                key: "protein",
                label: "Proteína",
                color: "#2196F3",
                value: displayProtein,
                goal: goals.protein,
                remaining: remaining.protein,
              },
              {
                key: "fat",
                label: "Grasa",
                color: "#FF9800",
                value: displayFat,
                goal: goals.fat,
                remaining: remaining.fat,
              },
            ].map(({ key, label, color, value, goal, remaining }) => (
              <View key={key} style={styles.macroCircle}>
                <CircularProgress
                  value={value}
                  radius={50}
                  maxValue={goal}
                  title={label}
                  titleStyle={styles.circleTitle}
                  progressValueColor={"#1A1A1A"}
                  activeStrokeColor={color}
                  inActiveStrokeColor={"#E0E0E0"}
                  inActiveStrokeOpacity={0.3}
                  valueSuffix="g"
                />
                <Text style={styles.macrosRemaining}>
                  {Math.max(0, Math.round(remaining))}g restantes
                </Text>
              </View>
            ))}
          </View>
        </View>

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

      {/* Calendar Modal Mejorado */}
      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCalendar(false)}
          />
          <View style={styles.calendarModalContainer}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>Seleccionar Fecha</Text>
              <TouchableOpacity
                onPress={() => setShowCalendar(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {!isToday && (
              <TouchableOpacity
                style={styles.todayButton}
                onPress={handleTodayPress}
                activeOpacity={0.7}
              >
                <Ionicons name="today-outline" size={20} color="#6C3BAA" />
                <Text style={styles.todayButtonText}>Ir a Hoy</Text>
              </TouchableOpacity>
            )}

            <Calendar
              key={calendarKey}
              current={selectedDate}
              onDayPress={handleDateSelect}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: "#6C3BAA",
                  selectedTextColor: "#ffffff",
                },
                [new Date().toISOString().split("T")[0]]: {
                  marked: true,
                  dotColor: "#6C3BAA",
                  selected:
                    selectedDate === new Date().toISOString().split("T")[0],
                  selectedColor: "#6C3BAA",
                },
              }}
              enableSwipeMonths={true}
              hideExtraDays={false}
              disableAllTouchEventsForDisabledDays={true}
              monthFormat={"MMMM yyyy"}
              onMonthChange={(month) => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut
                );
              }}
              renderArrow={(direction) => (
                <View style={styles.arrowButton}>
                  <Ionicons
                    name={
                      direction === "left" ? "chevron-back" : "chevron-forward"
                    }
                    size={24}
                    color="#6C3BAA"
                  />
                </View>
              )}
              theme={{
                backgroundColor: "#ffffff",
                calendarBackground: "#ffffff",
                textSectionTitleColor: "#6B7280",
                selectedDayBackgroundColor: "#6C3BAA",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#6C3BAA",
                dayTextColor: "#1A1A1A",
                textDisabledColor: "#D1D5DB",
                dotColor: "#6C3BAA",
                selectedDotColor: "#ffffff",
                arrowColor: "#6C3BAA",
                monthTextColor: "#1A1A1A",
                indicatorColor: "#6C3BAA",
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
          </View>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  screen: { flex: 1 },
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
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  header: { backgroundColor: "#fff", padding: 20, marginBottom: 12 },
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
    color: "#1A1A1A",
    marginBottom: 4,
  },
  headerDate: { fontSize: 14, color: "#6B7280", textTransform: "capitalize" },
  headerActions: { flexDirection: "row", gap: 8 },
  iconButton: { padding: 8 },
  caloriesCard: { alignItems: "center", marginBottom: 16 },
  caloriesLabel: { fontSize: 14, color: "#6B7280", marginBottom: 8 },
  caloriesValue: { fontSize: 48, fontWeight: "700", color: "#4CAF50" },
  caloriesValueExceeded: { color: "#FF6B6B" },
  caloriesSubtext: { fontSize: 14, color: "#9CA3AF", marginTop: 4 },
  caloriesProgressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  caloriesProgressFill: { height: "100%", borderRadius: 4 },
  macrosSection: { backgroundColor: "#fff", padding: 20, marginBottom: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  macrosRow: { flexDirection: "row", justifyContent: "space-between" },
  macroCircle: { alignItems: "center" },
  circleTitle: { fontSize: 12, color: "#6B7280" },
  macrosRemaining: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  diarySection: { backgroundColor: "#fff", padding: 20, marginBottom: 20 },
  mealSection: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
  },
  mealHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  mealTitle: { fontSize: 16, fontWeight: "600", color: "#1A1A1A" },
  mealSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  mealHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  mealCalories: { fontSize: 14, fontWeight: "600", color: "#6C3BAA" },
  mealEntries: { backgroundColor: "#fff" },
  foodEntry: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
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
    color: "#1A1A1A",
    marginBottom: 4,
  },
  foodEntryNameNotEaten: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  foodEntryDetails: { fontSize: 13, color: "#6B7280" },
  foodEntryDetailsNotEaten: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  foodEntryMacros: { flexDirection: "row", gap: 4 },
  macroChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  macroChipText: { fontSize: 11, fontWeight: "600", color: "#1A1A1A" },
  checkboxContainer: { padding: 8, marginLeft: 8 },
  emptyMealContainer: { alignItems: "center", paddingVertical: 32 },
  emptyMealText: {
    fontSize: 14,
    color: "#6C3BAA",
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
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  floatingActionBar: {
    position: "absolute",
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: "#6C3BAA",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    elevation: 8,
    shadowColor: "#000",
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
    backgroundColor: "#6C3BAA",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#6C3BAA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    borderBottomColor: "#E5E7EB",
  },
  calendarModalTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },

  todayButtonText: { fontSize: 16, fontWeight: "600", color: "#6C3BAA" },

  confirmButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  arrowButton: {
    padding: 8,
    borderRadius: 8,
  },
  calendarFooter: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  selectedDateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
    textTransform: "capitalize",
  },
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
  calendar: {
    marginTop: 8,
    paddingBottom: 12,
  },
  confirmButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  calendarModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
