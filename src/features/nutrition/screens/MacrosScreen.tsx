import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
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
import CircularProgress from "react-native-circular-progress-indicator";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNutritionStore } from "../../../store/useNutritionStore";
import CalendarStrip from "react-native-calendar-strip";
import * as nutritionService from "../services/nutritionService";
import { useCallback } from "react";
import { FoodEntry, MealType } from "../../../models/nutrition.model";
import { useNavigationStore } from "../../../store/useNavigationStore";
import ReusableCameraView from "../../common/components/ReusableCameraView";
import {
  deleteFoodEntry,
  getDailyEntries,
  getProductDetail,
  scanBarcode,
} from "../services/nutritionService";
import { setLoading } from "../../../store/chatSlice";

// Habilitar LayoutAnimation en Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Configuración de comidas
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
  // Store
  const userProfile = useNutritionStore((state) => state.userProfile);
  const todayEntries = useNutritionStore((state) => state.todayEntries);
  const setTodayEntries = useNutritionStore((state) => state.setTodayEntries);
  const removeFoodEntry = useNutritionStore((state) => state.removeFoodEntry);
  const getTodayTotals = useNutritionStore((state) => state.getTodayTotals);
  const isProfileComplete = useNutritionStore(
    (state) => state.isProfileComplete
  );
  const [showScanner, setShowScanner] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const shoppingList = [
    { id: "1", name: "Avena", addedAt: new Date().toISOString() },
    { id: "2", name: "Plátanos", addedAt: new Date().toISOString() },
    { id: "3", name: "Leche", addedAt: new Date().toISOString() },
  ];

  // Navigation Store
  const setTabVisibility = useNavigationStore(
    (state) => state.setTabVisibility
  );

  // State
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(
    new Set()
  );
  const [notEatenEntries, setNotEatenEntries] = useState<Set<string>>(
    new Set()
  );
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Record<MealType, boolean>>(
    {
      breakfast: true,
      lunch: true,
      dinner: true,
      snack: true,
    }
  );

  // Animated values para los CircularProgress
  const animatedCarbs = useRef(new Animated.Value(0)).current;
  const animatedProtein = useRef(new Animated.Value(0)).current;
  const animatedFat = useRef(new Animated.Value(0)).current;

  // State para los valores actuales de los CircularProgress
  const [displayCarbs, setDisplayCarbs] = useState(0);
  const [displayProtein, setDisplayProtein] = useState(0);
  const [displayFat, setDisplayFat] = useState(0);

  // Animated values para action bar
  const [actionBarAnim] = useState(new Animated.Value(0));
  const [addButtonAnim] = useState(new Animated.Value(1));

  // Computed
  const isSelectionMode = selectedEntries.size > 0;
  const isAllNotEatenSelected = Array.from(selectedEntries).every((id) =>
    notEatenEntries.has(id)
  );

  // Effects
  useEffect(() => {
    if (!isProfileComplete()) {
      navigation.replace("UserProfileSetupScreen");
    }
  }, [isProfileComplete]);

  // Efecto para animar los CircularProgress cuando cambian los totales
  useEffect(() => {
    const carbsListener = animatedCarbs.addListener(({ value }) => {
      setDisplayCarbs(value);
    });
    const proteinListener = animatedProtein.addListener(({ value }) => {
      setDisplayProtein(value);
    });
    const fatListener = animatedFat.addListener(({ value }) => {
      setDisplayFat(value);
    });

    return () => {
      animatedCarbs.removeListener(carbsListener);
      animatedProtein.removeListener(proteinListener);
      animatedFat.removeListener(fatListener);
    };
  }, []);

  useEffect(() => {
    if (!userProfile) return;

    const effectiveEntries = todayEntries.filter(
      (entry) => !notEatenEntries.has(entry.id || "")
    );

    const totals = effectiveEntries.reduce(
      (acc, entry) => {
        acc.carbs += entry.carbs;
        acc.protein += entry.protein;
        acc.fat += entry.fat;
        return acc;
      },
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

    return () => {
      setTabVisibility("Macros", true);
    };
  }, [isSelectionMode, setTabVisibility]);

  useFocusEffect(
    React.useCallback(() => {
      loadTodayEntries();
      setTabVisibility("Macros", true);

      return () => {
        setTabVisibility("Macros", true);
      };
    }, [navigation, setTabVisibility])
  );

  useFocusEffect(
    useCallback(() => {
      loadTodayEntries();
    }, [selectedDate])
  );

  useEffect(() => {
    loadEntriesForDate(selectedDate);
  }, [selectedDate]);

  // Functions
  const loadTodayEntries = async () => {
    if (!userProfile) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const summary = await getDailyEntries(userProfile.userId, today);
      setTodayEntries(summary.entries);
    } catch (error) {
      console.error("Error loading entries:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodayEntries();
    setRefreshing(false);
  };

  const toggleSelectEntry = (entryId: string) => {
    setSelectedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
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
      for (const id of selectedEntries) {
        if (updated.has(id)) {
          updated.delete(id);
        } else {
          updated.add(id);
        }
      }
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

              // Obtener las entradas seleccionadas
              const entriesToDuplicate = todayEntries.filter((entry) =>
                selectedEntries.has(entry.id || "")
              );

              // Duplicar cada entrada
              for (const entry of entriesToDuplicate) {
                const newEntry = {
                  userId: userProfile.userId,
                  date: selectedDate, // Usar la fecha seleccionada
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
                };

                await nutritionService.addFoodEntry(newEntry);
              }

              // Recargar las entradas
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
      });
    } catch (error) {
      console.error("Error cargando producto:", error);
      Alert.alert("Error", "No se pudo cargar el detalle del producto");
    } finally {
      setLoadingProduct(false);
    }
  };

  const toggleMeal = (meal: MealType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMeals((prev: Record<MealType, boolean>) => ({
      ...prev,
      [meal]: !prev[meal],
    }));
  };

  const handleAddToMeal = (mealType: MealType) => {
    // Navegar a ProductListScreen pasando el tipo de comida
    navigation.navigate("ProductListScreen", {
      selectedMeal: mealType,
      returnTo: "MacrosScreen",
    });
  };

  const handleDateSelect = (day: any) => {
    setSelectedDate(day.dateString);
    setShowCalendar(false);
    Alert.alert("Fecha seleccionada", `Mostrando datos de: ${day.dateString}`);
  };

  const removeFromShoppingList = (itemId: any) => {
    Alert.alert("Eliminar", "Producto eliminado de la lista");
  };

  const handleBarCodeScanned = async (code: string) => {
    setShowScanner(false);
    try {
      const producto = await scanBarcode(code);

      if (producto) {
        navigation.navigate("ProductDetailScreen", {
          producto: producto,
        });
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

  const loadEntriesForDate = async (date: string) => {
    if (!userProfile) return;

    try {
      setLoading(true);
      const data = await nutritionService.getDailyEntries(
        userProfile.userId,
        date
      );
      setTodayEntries(data.entries);
    } catch (error) {
      console.error("Error loading entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Guard clause
  if (!userProfile) {
    return null;
  }

  // Calculations
  const effectiveEntries = todayEntries.filter(
    (entry) => !notEatenEntries.has(entry.id || "")
  );

  const totals = effectiveEntries.reduce(
    (acc, entry) => {
      acc.calories += entry.calories;
      acc.protein += entry.protein;
      acc.carbs += entry.carbs;
      acc.fat += entry.fat;
      return acc;
    },
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
    protein: Math.min(100, (totals.protein / goals.protein) * 100),
    carbs: Math.min(100, (totals.carbs / goals.carbs) * 100),
    fat: Math.min(100, (totals.fat / goals.fat) * 100),
  };

  const entriesByMeal = todayEntries.reduce((acc, entry) => {
    if (!acc[entry.mealType]) acc[entry.mealType] = [];
    acc[entry.mealType].push(entry);
    return acc;
  }, {} as Record<MealType, FoodEntry[]>);

  // Si la cámara está activa, mostrar solo la cámara
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

  // Render Functions
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
            if (isSelectionMode) {
              toggleSelectEntry(entry.id!);
            } else {
              handleNavigateToDetail(entry);
            }
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
            <View style={[styles.macroChip, styles.macroChipCarbs]}>
              <Text style={styles.macroChipText}>
                C {Math.round(entry.carbs)}
              </Text>
            </View>
            <View style={[styles.macroChip, styles.macroChipProtein]}>
              <Text style={styles.macroChipText}>
                P {Math.round(entry.protein)}
              </Text>
            </View>
            <View style={[styles.macroChip, styles.macroChipFat]}>
              <Text style={styles.macroChipText}>
                G {Math.round(entry.fat)}
              </Text>
            </View>
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

  // Animated styles
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
    transform: [
      {
        scale: addButtonAnim,
      },
    ],
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Hoy</Text>
              <Text style={styles.headerDate}>
                {new Date().toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
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

          {/* Calories Progress Bar */}
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

        {/* Macros */}
        <View style={styles.macrosSection}>
          <Text style={styles.sectionTitle}>Macronutrientes</Text>
          <View style={styles.macrosRow}>
            <View style={styles.macroCircle}>
              <CircularProgress
                value={displayCarbs}
                radius={50}
                maxValue={goals.carbs}
                title={"Carbos"}
                titleStyle={styles.circleTitle}
                progressValueColor={"#1A1A1A"}
                activeStrokeColor={"#FFB74D"}
                inActiveStrokeColor={"#E0E0E0"}
                inActiveStrokeOpacity={0.3}
                valueSuffix="g"
              />
              <Text style={styles.macrosRemaining}>
                {Math.max(0, Math.round(remaining.carbs))}g restantes
              </Text>
            </View>

            <View style={styles.macroCircle}>
              <CircularProgress
                value={displayProtein}
                radius={50}
                maxValue={goals.protein}
                title={"Proteína"}
                titleStyle={styles.circleTitle}
                progressValueColor={"#1A1A1A"}
                activeStrokeColor={"#2196F3"}
                inActiveStrokeColor={"#E0E0E0"}
                inActiveStrokeOpacity={0.3}
                valueSuffix="g"
              />
              <Text style={styles.macrosRemaining}>
                {Math.max(0, Math.round(remaining.protein))}g restantes
              </Text>
            </View>

            <View style={styles.macroCircle}>
              <CircularProgress
                value={displayFat}
                radius={50}
                maxValue={goals.fat}
                title={"Grasa"}
                titleStyle={styles.circleTitle}
                progressValueColor={"#1A1A1A"}
                activeStrokeColor={"#FF9800"}
                inActiveStrokeColor={"#E0E0E0"}
                inActiveStrokeOpacity={0.3}
                valueSuffix="g"
              />
              <Text style={styles.macrosRemaining}>
                {Math.max(0, Math.round(remaining.fat))}g restantes
              </Text>
            </View>
          </View>
        </View>

        {/* Meal Sections */}
        <View style={styles.diarySection}>
          <Text style={styles.sectionTitle}>Diario de Alimentos</Text>
          {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map(
            renderMealSection
          )}
        </View>

        {/* Empty State */}
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

      {/* Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <CalendarStrip
              selectedDate={new Date(selectedDate)}
              onDateSelected={(date) => {
                setSelectedDate(date.format("YYYY-MM-DD"));
                setShowCalendar(false);
                loadEntriesForDate(date.format("YYYY-MM-DD"));
              }}
              calendarHeaderStyle={{ color: "#1A1A1A" }}
              dateNumberStyle={{ color: "#1A1A1A" }}
              dateNameStyle={{ color: "#6B7280" }}
              highlightDateNumberStyle={{ color: "#6C3BAA" }}
              highlightDateNameStyle={{ color: "#6C3BAA" }}
              scrollable
              style={{ height: 100, paddingTop: 20, paddingBottom: 10 }}
            />
          </View>
        </View>
      </Modal>

      {/* Shopping List Modal */}
      <Modal visible={showShoppingList} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.shoppingListModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lista de Compra</Text>
              <TouchableOpacity onPress={() => setShowShoppingList(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.shoppingListContent}>
              {shoppingList.length > 0 ? (
                shoppingList.map((item) => (
                  <View key={item.id} style={styles.shoppingListItem}>
                    <View style={styles.shoppingItemLeft}>
                      <Ionicons name="cart" size={20} color="#6C3BAA" />
                      <Text style={styles.shoppingItemName}>{item.name}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeFromShoppingList(item.id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#FF6B6B"
                      />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyShoppingList}>
                  <Ionicons name="cart-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyShoppingText}>Lista vacía</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Selection Action Bar - Animated */}
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

      {/* Add Button - Animated */}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  screen: {
    flex: 1,
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
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 14,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  headerActions: { flexDirection: "row", gap: 8 },
  iconButton: { padding: 8 },
  caloriesCard: {
    alignItems: "center",
    marginBottom: 16,
  },
  caloriesLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#4CAF50",
  },
  caloriesValueExceeded: {
    color: "#FF6B6B",
  },
  caloriesSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  caloriesProgressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  caloriesProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  macrosSection: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroCircle: {
    alignItems: "center",
  },
  circleTitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  macrosRemaining: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  diarySection: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 20,
  },
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
  mealHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  mealSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  mealHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6C3BAA",
  },
  mealEntries: {
    backgroundColor: "#fff",
  },
  foodEntry: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  foodEntrySelected: {
    backgroundColor: "#F3E8FF",
  },
  foodEntryNotEaten: {
    opacity: 0.5,
  },
  foodEntryContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  foodEntryLeft: {
    flex: 1,
  },
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
  foodEntryDetails: {
    fontSize: 13,
    color: "#6B7280",
  },
  foodEntryDetailsNotEaten: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  foodEntryMacros: {
    flexDirection: "row",
    gap: 4,
  },
  macroChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  macroChipCarbs: {
    backgroundColor: "#FFF3E0",
  },
  macroChipProtein: {
    backgroundColor: "#E3F2FD",
  },
  macroChipFat: {
    backgroundColor: "#FFE0B2",
  },
  macroChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  checkboxContainer: {
    padding: 8,
    marginLeft: 8,
  },
  emptyMealContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
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
  actionButton: {
    alignItems: "center",
    flex: 1,
  },
  actionButtonText: {
    fontSize: 11,
    color: "#fff",
    marginTop: 4,
    fontWeight: "600",
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
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
  },
  calendarModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    maxWidth: 400,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  shoppingListModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    overflow: "hidden",
  },
  shoppingListContent: { maxHeight: 400 },
  shoppingListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  shoppingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  shoppingItemName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  emptyShoppingList: { alignItems: "center", paddingVertical: 60 },
  emptyShoppingText: { fontSize: 16, color: "#9CA3AF", marginTop: 12 },
});
