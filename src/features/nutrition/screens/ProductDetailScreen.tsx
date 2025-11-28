import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import { FoodEntry, FoodUnit, MealType } from "../../../models/nutrition.model";
import { useNutritionStore } from "../../../store/useNutritionStore";
import * as nutritionService from "../services/nutritionService";
import { addFoodEntry, updateFoodEntry } from "../services/nutritionService";

const { width } = Dimensions.get("window");

// Función auxiliar para obtener el color según el Nutri-Score
function getNutritionGradeColor(grade: string): string {
  const normalizedGrade = grade.toLowerCase();
  switch (normalizedGrade) {
    case 'a':
      return '#038141'; // Verde oscuro
    case 'b':
      return '#85BB2F'; // Verde claro
    case 'c':
      return '#FECB02'; // Amarillo
    case 'd':
      return '#EE8100'; // Naranja
    case 'e':
      return '#E63E11'; // Rojo
    default:
      return '#999999'; // Gris por defecto
  }
}

interface Props {
  route: any;
  navigation: any;
}

const UNITS_CONFIG = [
  {
    label: "Gramos",
    value: "gram" as FoodUnit,
    icon: "scale-outline",
    color: "#10B981",
  },
  {
    label: "Mililitros",
    value: "ml" as FoodUnit,
    icon: "water-outline",
    color: "#3B82F6",
  },
  {
    label: "Porción",
    value: "portion" as FoodUnit,
    icon: "restaurant-outline",
    color: "#F59E0B",
  },
];

const MEALS_CONFIG = [
  {
    label: "Desayuno",
    value: "breakfast" as MealType,
    icon: "sunny",
    color: "#FFB74D",
  },
  {
    label: "Almuerzo",
    value: "lunch" as MealType,
    icon: "restaurant",
    color: "#6FCF97",
  },
  {
    label: "Cena",
    value: "dinner" as MealType,
    icon: "moon",
    color: "#6C3BAA",
  },
  {
    label: "Snack",
    value: "snack" as MealType,
    icon: "fast-food",
    color: "#409CFF",
  },
];

export default function ProductDetailScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const {
    producto,
    fromDiary = false,
    selectedMeal: initialMeal,
    quantity: initialQty,
    unit: initialUnit,
    quickAdd = false,
    entryId,
  } = route.params;

  const userProfile = useNutritionStore((state) => state.userProfile);
  const addFoodEntryToStore = useNutritionStore((state) => state.addFoodEntry);
  const updateFoodEntryInStore = useNutritionStore(
    (state) => state.updateFoodEntry
  );

  const [quantity, setQuantity] = useState(
    initialQty?.toString() || producto.grams?.toString() || "100"
  );
  const [unit, setUnit] = useState<FoodUnit>(initialUnit || "gram");
  const [meal, setMeal] = useState<MealType>(initialMeal || "dinner");
  const [showMore, setShowMore] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"units" | "meals" | null>(null);
  const [saving, setSaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const calculateNutrients = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const baseGrams = producto.grams || 100;
    const multiplier = qty / baseGrams;

    return {
      calories: Math.round(producto.calories * multiplier),
      protein: Math.round(producto.protein * multiplier * 10) / 10,
      carbs: Math.round(producto.carbohydrates * multiplier * 10) / 10,
      fat: Math.round(producto.fat * multiplier * 10) / 10,
    };
  }, [quantity, producto]);

  useEffect(() => {
    if (quickAdd) {
      setModalType("meals");
      setIsModalVisible(true);
    }
  }, [quickAdd]);

  useEffect(() => {
    checkIfFavorite();
  }, [producto]);

  const getUnitLabel = (value: FoodUnit): string => {
    return UNITS_CONFIG.find((u) => u.value === value)?.label || "Gramos";
  };

  const getMealData = (value: MealType) => {
    return MEALS_CONFIG.find((m) => m.value === value) || MEALS_CONFIG[2];
  };

  const checkIfFavorite = async () => {
    if (!userProfile) return;

    try {
      const favorite = await nutritionService.isFavorite(
        producto.code,
        userProfile.userId
      );
      setIsFavorite(favorite);
    } catch (error) {
      console.error("Error checking favorite:", error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!userProfile) {
      Alert.alert("Error", "Debes configurar tu perfil primero");
      return;
    }

    try {
      if (isFavorite) {
        await nutritionService.removeFavoriteByProductCode(
          producto.code,
          userProfile.userId
        );
        setIsFavorite(false);
        Alert.alert("Eliminado", "Producto eliminado de favoritos");
      } else {
        await nutritionService.addFavorite({
          userId: userProfile.userId,
          productCode: producto.code,
          productName: producto.name,
          productImage: producto.image,
          calories: calculateNutrients.calories,
          protein: calculateNutrients.protein,
          carbs: calculateNutrients.carbs,
          fat: calculateNutrients.fat,
        });
        setIsFavorite(true);
        Alert.alert("Agregado", "Producto agregado a favoritos");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Alert.alert("Error", "No se pudo actualizar favoritos");
    }
  };

  const handleAddToShoppingList = async () => {
    if (!userProfile) {
      Alert.alert("Error", "Debes configurar tu perfil primero");
      return;
    }

    setAddingToCart(true);
    try {
      await nutritionService.addToShoppingList({
        userId: userProfile.userId,
        productCode: producto.code,
        productName: producto.name,
        productImage: producto.image,
        quantity: parseFloat(quantity) || 100,
        unit: unit,
      });
      Alert.alert("¡Añadido!", "Producto agregado a la lista de compras");
    } catch (error) {
      console.error("Error adding to shopping list:", error);
      Alert.alert("Error", "No se pudo agregar a la lista de compras");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleMealSelection = (selectedMeal: MealType) => {
    setMeal(selectedMeal);
    setIsModalVisible(false);

    if (quickAdd) {
      setTimeout(() => {
        handleAddOrUpdateEntry(selectedMeal);
      }, 100);
    }
  };

  const handleAddOrUpdateEntry = async (mealType?: MealType) => {
    if (!userProfile) {
      Alert.alert("Error", "Debes configurar tu perfil primero");
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert("Error", "Por favor ingresa una cantidad válida");
      return;
    }

    setSaving(true);

    try {
      const nutrients = calculateNutrients;
      const today = new Date().toISOString().split("T")[0];
      const finalMealType = mealType || meal;

      if (fromDiary && entryId) {
        const updatedEntry: Partial<FoodEntry> = {
          mealType: finalMealType,
          quantity: parseFloat(quantity),
          unit: unit,
          calories: nutrients.calories,
          protein: nutrients.protein,
          carbs: nutrients.carbs,
          fat: nutrients.fat,
        };

        await updateFoodEntry(entryId, updatedEntry);
        updateFoodEntryInStore(entryId, updatedEntry);

        Alert.alert("¡Actualizado!", "Alimento actualizado en tu diario", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        const entry: Omit<FoodEntry, "id" | "createdAt"> = {
          userId: userProfile.userId,
          productCode: producto.code,
          productName: producto.name,
          productImage: producto.image,
          date: today,
          mealType: finalMealType,
          quantity: parseFloat(quantity),
          unit: unit,
          calories: nutrients.calories,
          protein: nutrients.protein,
          carbs: nutrients.carbs,
          fat: nutrients.fat,
        };

        const savedEntry = await addFoodEntry(entry);
        addFoodEntryToStore(savedEntry);

        if (quickAdd) {
          Alert.alert("¡Añadido!", "Alimento registrado en tu diario", [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]);
        } else {
          Alert.alert("¡Añadido!", "Alimento registrado en tu diario", [
            {
              text: "Ver Diario",
              onPress: () => navigation.navigate("MacrosScreen"),
            },
            {
              text: "Añadir Otro",
              onPress: () => navigation.goBack(),
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      Alert.alert("Error", "No se pudo guardar el alimento. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const selectedMeal = getMealData(meal);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {fromDiary ? "Editar Alimento" : "Detalle del Producto"}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleAddToShoppingList}
              disabled={addingToCart}
            >
              {addingToCart ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Ionicons name="cart-outline" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleFavorite}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={28}
                color={isFavorite ? theme.error : theme.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={
              producto?.image
                ? { uri: producto.image }
                : require("./../../../../assets/not-image.png")
            }
            style={[
              styles.productImage,
              { width: width * 0.6, height: width * 0.6 },
            ]}
          />
        </View>

        <View style={styles.nameContainer}>
          <Text style={styles.productName}>{producto.name}</Text>
          {producto.brand && (
            <Text style={styles.productBrand}>{producto.brand}</Text>
          )}
          {producto.nutritionGrade && (
            <View style={styles.nutritionGradeContainer}>
              <Text style={styles.nutritionGradeLabel}>Nutri-Score:</Text>
              <View style={[styles.nutritionGradeBadge, { backgroundColor: getNutritionGradeColor(producto.nutritionGrade) }]}>
                <Text style={styles.nutritionGradeText}>{producto.nutritionGrade.toUpperCase()}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.nutritionSection}>
          <Text style={styles.sectionTitle}>Información Nutricional</Text>
          <View style={styles.nutritionGrid}>
            {[
              {
                key: "calories",
                label: "Calorías",
                icon: "flame",
                color: "#6FCF97",
                suffix: "",
              },
              {
                key: "carbs",
                label: "Carbohidratos",
                icon: "nutrition",
                color: "#FFB74D",
                suffix: "g",
              },
              {
                key: "protein",
                label: "Proteína",
                icon: "barbell",
                color: "#409CFF",
                suffix: "g",
              },
              {
                key: "fat",
                label: "Grasa",
                icon: "water",
                color: "#FF6B6B",
                suffix: "g",
              },
            ].map(({ key, label, icon, color, suffix }) => (
              <View
                key={key}
                style={[
                  styles.nutritionCard,
                  { backgroundColor: `${color}15` },
                ]}
              >
                <Ionicons name={icon as any} size={28} color={color} />
                <Text style={[styles.nutritionValue, { color }]}>
                  {calculateNutrients[key as keyof typeof calculateNutrients]}
                  {suffix}
                </Text>
                <Text style={styles.nutritionLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {!quickAdd && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cantidad</Text>
            <View style={styles.quantityInputContainer}>
              <TextInput
                style={styles.quantityInput}
                placeholder="100"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={styles.unitButton}
                onPress={() => {
                  setModalType("units");
                  setIsModalVisible(true);
                }}
              >
                <Text style={styles.unitButtonText}>{getUnitLabel(unit)}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!quickAdd && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Momento del Día</Text>
            <TouchableOpacity
              style={styles.mealSelector}
              onPress={() => {
                setModalType("meals");
                setIsModalVisible(true);
              }}
            >
              <View style={styles.mealSelectorLeft}>
                <View
                  style={[
                    styles.mealIconContainer,
                    { backgroundColor: `${selectedMeal.color}20` },
                  ]}
                >
                  <Ionicons
                    name={selectedMeal.icon as any}
                    size={24}
                    color={selectedMeal.color}
                  />
                </View>
                <Text style={styles.mealSelectorText}>
                  {selectedMeal.label}
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}

        {producto.others && producto.others.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowMore(!showMore)}
            >
              <Text style={styles.showMoreText}>
                {showMore ? "Ocultar" : "Ver"} información adicional
              </Text>
              <Ionicons
                name={showMore ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.primary}
              />
            </TouchableOpacity>
            {showMore && (
              <View style={styles.additionalNutrients}>
                {producto.others
                  .slice(0, 10)
                  .map((item: any, index: number) => (
                    <View key={index} style={styles.nutrientRow}>
                      <Text style={styles.nutrientLabel}>{item.label}</Text>
                      <Text style={styles.nutrientValue}>{item.value}</Text>
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {!fromDiary && !quickAdd && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.addButton, saving && styles.addButtonDisabled]}
            onPress={() => handleAddOrUpdateEntry()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={24} color="#fff" />
                <Text style={styles.addButtonText}>Añadir al Diario</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {fromDiary && !quickAdd && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.addButton, saving && styles.addButtonDisabled]}
            onPress={() => handleAddOrUpdateEntry()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.addButtonText}>Actualizar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Modal
        isVisible={isModalVisible && modalType === "units"}
        onBackdropPress={() => setIsModalVisible(false)}
        style={styles.modal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropColor={theme.shadowColor}
        backdropOpacity={0.5}
        backdropTransitionOutTiming={0}
        useNativeDriver
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Unidad</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          {UNITS_CONFIG.map((unitOption) => (
            <TouchableOpacity
              key={unitOption.value}
              style={styles.modalOption}
              onPress={() => {
                setUnit(unitOption.value);
                setIsModalVisible(false);
              }}
            >
              <View style={styles.modalOptionLeft}>
                <View
                  style={[
                    styles.unitIconContainer,
                    { backgroundColor: `${unitOption.color}15` },
                  ]}
                >
                  <Ionicons
                    name={unitOption.icon as any}
                    size={24}
                    color={unitOption.color}
                  />
                </View>
                <Text style={styles.modalOptionText}>{unitOption.label}</Text>
              </View>
              {unit === unitOption.value && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={unitOption.color}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      <Modal
        isVisible={isModalVisible && modalType === "meals"}
        onBackdropPress={() => {
          setIsModalVisible(false);
          if (quickAdd) {
            navigation.goBack();
          }
        }}
        style={styles.modal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropColor={theme.shadowColor}
        backdropOpacity={0.5}
        backdropTransitionOutTiming={0}
        useNativeDriver
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {quickAdd ? "¿Cuándo lo consumiste?" : "Seleccionar Momento"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsModalVisible(false);
                if (quickAdd) {
                  navigation.goBack();
                }
              }}
            >
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          {MEALS_CONFIG.map((mealOption) => (
            <TouchableOpacity
              key={mealOption.value}
              style={styles.modalOption}
              onPress={() => handleMealSelection(mealOption.value)}
            >
              <View style={styles.modalOptionLeft}>
                <View
                  style={[
                    styles.mealIconContainer,
                    { backgroundColor: `${mealOption.color}20` },
                  ]}
                >
                  <Ionicons
                    name={mealOption.icon as any}
                    size={24}
                    color={mealOption.color}
                  />
                </View>
                <Text style={styles.modalOptionText}>{mealOption.label}</Text>
              </View>
              {meal === mealOption.value && (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={theme.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: RFValue(16),
      fontWeight: "700",
      color: theme.text,
    },
    headerActions: {
      flexDirection: "row",
      gap: 16,
    },
    imageContainer: {
      backgroundColor: theme.card,
      paddingVertical: 30,
      alignItems: "center",
    },
    productImage: {
      resizeMode: "contain",
    },
    nameContainer: {
      backgroundColor: theme.card,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    productName: {
      fontSize: RFValue(18),
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
    },
    nutritionSection: {
      backgroundColor: theme.card,
      padding: 20,
      marginTop: 12,
    },
    sectionTitle: {
      fontSize: RFValue(16),
      fontWeight: "700",
      color: theme.text,
      marginBottom: 16,
    },
    nutritionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    nutritionCard: {
      width: (width - 56) / 2,
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
    },
    nutritionValue: {
      fontSize: RFValue(24),
      fontWeight: "700",
      marginTop: 8,
    },
    nutritionLabel: {
      fontSize: RFValue(12),
      color: theme.textSecondary,
      marginTop: 4,
      fontWeight: "500",
    },
    section: {
      backgroundColor: theme.card,
      padding: 20,
      marginTop: 12,
    },
    quantityInputContainer: {
      flexDirection: "row",
      gap: 12,
    },
    quantityInput: {
      flex: 1,
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 56,
      fontSize: RFValue(18),
      fontWeight: "600",
      color: theme.text,
    },
    unitButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      gap: 8,
      minWidth: 120,
    },
    unitButtonText: {
      fontSize: RFValue(14),
      fontWeight: "600",
      color: theme.text,
    },
    mealSelector: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      padding: 16,
    },
    mealSelectorLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    mealIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    mealSelectorText: {
      fontSize: RFValue(15),
      fontWeight: "600",
      color: theme.text,
    },
    showMoreButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      gap: 8,
    },
    showMoreText: {
      fontSize: RFValue(14),
      fontWeight: "600",
      color: theme.primary,
    },
    additionalNutrients: {
      marginTop: 16,
    },
    nutrientRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    nutrientLabel: {
      fontSize: RFValue(13),
      color: theme.textSecondary,
      fontWeight: "500",
      flex: 1,
      paddingRight: 12,
    },
    nutrientValue: {
      fontSize: RFValue(14),
      fontWeight: "700",
      color: theme.text,
      textAlign: "right",
    },
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.card,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    addButton: {
      flexDirection: "row",
      backgroundColor: theme.primary,
      borderRadius: 14,
      height: 56,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
      elevation: 4,
      shadowColor: theme.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    addButtonDisabled: {
      backgroundColor: theme.textTertiary,
    },
    addButtonText: {
      fontSize: RFValue(16),
      fontWeight: "700",
      color: "#fff",
    },
    modal: {
      justifyContent: "flex-end",
      margin: 0,
    },
    modalContent: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 30,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: RFValue(18),
      fontWeight: "700",
      color: theme.text,
    },
    modalOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.backgroundSecondary,
    },
    modalOptionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    unitIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    modalOptionText: {
      fontSize: RFValue(15),
      fontWeight: "600",
      color: theme.text,
    },
    productBrand: {
      fontSize: RFValue(14),
      color: theme.textSecondary,
      marginTop: 8,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    nutritionGradeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      gap: 8,
    },
    nutritionGradeLabel: {
      fontSize: RFValue(13),
      color: theme.textSecondary,
      fontWeight: '600',
    },
    nutritionGradeBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      minWidth: 40,
      alignItems: 'center',
    },
    nutritionGradeText: {
      fontSize: RFValue(14),
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
  });
