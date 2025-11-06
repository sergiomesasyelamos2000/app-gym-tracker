import React, { useState, useMemo, useEffect } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { useNutritionStore } from "../../../store/useNutritionStore";
import { addFoodEntry } from "../services/nutritionService";
import { FoodEntry, MealType, FoodUnit } from "../../../models/nutrition.model";
import * as nutritionService from "../services/nutritionService";

const { width } = Dimensions.get("window");

interface Props {
  route: any;
  navigation: any;
}

export default function ProductDetailScreen({ route, navigation }: Props) {
  const {
    producto,
    fromDiary = false,
    selectedMeal: initialMeal,
    quantity: initialQty,
    unit: initialUnit,
    quickAdd = false,
  } = route.params;
  const userProfile = useNutritionStore((state) => state.userProfile);
  const addFoodEntryToStore = useNutritionStore((state) => state.addFoodEntry);

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

  const units: Array<{
    label: string;
    value: FoodUnit;
    icon: string;
    color: string;
  }> = [
    { label: "Gramos", value: "gram", icon: "scale-outline", color: "#10B981" },
    {
      label: "Mililitros",
      value: "ml",
      icon: "water-outline",
      color: "#3B82F6",
    },
    {
      label: "Porción",
      value: "portion",
      icon: "restaurant-outline",
      color: "#F59E0B",
    },
  ];

  const meals: Array<{
    label: string;
    value: MealType;
    icon: string;
    color: string;
  }> = [
    { label: "Desayuno", value: "breakfast", icon: "sunny", color: "#FFB74D" },
    { label: "Almuerzo", value: "lunch", icon: "restaurant", color: "#6FCF97" },
    { label: "Cena", value: "dinner", icon: "moon", color: "#6C3BAA" },
    { label: "Snack", value: "snack", icon: "fast-food", color: "#409CFF" },
  ];

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

  // Si quickAdd es true, mostrar modal de selección de comida automáticamente
  useEffect(() => {
    if (quickAdd) {
      setModalType("meals");
      setIsModalVisible(true);
    }
  }, [quickAdd]);

  const handleAddToDiary = async () => {
    await handleAddToDiaryWithMeal();
  };

  const getUnitLabel = (value: FoodUnit): string => {
    return units.find((u) => u.value === value)?.label || "Gramos";
  };

  const getMealData = (value: MealType) => {
    return meals.find((m) => m.value === value) || meals[2];
  };

  const selectedMeal = getMealData(meal);

  useEffect(() => {
    checkIfFavorite();
  }, [producto]);

  const checkIfFavorite = async () => {
    if (!userProfile) return;

    try {
      const favorite = await nutritionService.isFavorite(
        userProfile.userId,
        producto.code
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
          userProfile.userId,
          producto.code
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

  // Función para cerrar modal y añadir al diario si es quickAdd
  const handleMealSelection = (selectedMeal: MealType) => {
    setMeal(selectedMeal);
    setIsModalVisible(false);

    if (quickAdd) {
      // Pasar el meal directamente en lugar de depender del estado
      setTimeout(() => {
        handleAddToDiaryWithMeal(selectedMeal);
      }, 100);
    }
  };

  const handleAddToDiaryWithMeal = async (mealType?: MealType) => {
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

      const entry: Omit<FoodEntry, "id" | "createdAt"> = {
        userId: userProfile.userId,
        productCode: producto.code,
        productName: producto.name,
        productImage: producto.image,
        date: today,
        mealType: mealType || meal, // Usar el parámetro si existe, sino el estado
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
    } catch (error) {
      console.error("Error saving entry:", error);
      Alert.alert("Error", "No se pudo guardar el alimento. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle del Producto</Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <TouchableOpacity
              onPress={handleAddToShoppingList}
              disabled={addingToCart}
            >
              {addingToCart ? (
                <ActivityIndicator color="#6C3BAA" />
              ) : (
                <Ionicons name="cart-outline" size={24} color="#6C3BAA" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleFavorite}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={28}
                color={isFavorite ? "#E74C3C" : "#6C3BAA"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Image */}
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

        {/* Product Name */}
        <View style={styles.nameContainer}>
          <Text style={styles.productName}>{producto.name}</Text>
        </View>

        {/* Nutritional Values */}
        <View style={styles.nutritionSection}>
          <Text style={styles.sectionTitle}>Información Nutricional</Text>
          <View style={styles.nutritionGrid}>
            <View
              style={[styles.nutritionCard, { backgroundColor: "#6FCF9715" }]}
            >
              <Ionicons name="flame" size={28} color="#6FCF97" />
              <Text style={[styles.nutritionValue, { color: "#6FCF97" }]}>
                {calculateNutrients.calories}
              </Text>
              <Text style={styles.nutritionLabel}>Calorías</Text>
            </View>
            <View
              style={[styles.nutritionCard, { backgroundColor: "#FFB74D15" }]}
            >
              <Ionicons name="nutrition" size={28} color="#FFB74D" />
              <Text style={[styles.nutritionValue, { color: "#FFB74D" }]}>
                {calculateNutrients.carbs}g
              </Text>
              <Text style={styles.nutritionLabel}>Carbohidratos</Text>
            </View>
            <View
              style={[styles.nutritionCard, { backgroundColor: "#409CFF15" }]}
            >
              <Ionicons name="barbell" size={28} color="#409CFF" />
              <Text style={[styles.nutritionValue, { color: "#409CFF" }]}>
                {calculateNutrients.protein}g
              </Text>
              <Text style={styles.nutritionLabel}>Proteína</Text>
            </View>
            <View
              style={[styles.nutritionCard, { backgroundColor: "#FF6B6B15" }]}
            >
              <Ionicons name="water" size={28} color="#FF6B6B" />
              <Text style={[styles.nutritionValue, { color: "#FF6B6B" }]}>
                {calculateNutrients.fat}g
              </Text>
              <Text style={styles.nutritionLabel}>Grasa</Text>
            </View>
          </View>
        </View>

        {/* Quantity Input */}
        {!quickAdd && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cantidad</Text>
            <View style={styles.quantityContainer}>
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
                  <Text style={styles.unitButtonText}>
                    {getUnitLabel(unit)}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Meal Selection */}
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
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Additional Nutrients */}
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
                color="#6C3BAA"
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

      {/* Add Button */}
      {!fromDiary && !quickAdd && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.addButton, saving && styles.addButtonDisabled]}
            onPress={handleAddToDiary}
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

      {/* Units Modal */}
      <Modal
        isVisible={isModalVisible && modalType === "units"}
        onBackdropPress={() => setIsModalVisible(false)}
        style={styles.modal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Unidad</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {units.map((unitOption) => (
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

      {/* Meals Modal */}
      <Modal
        isVisible={isModalVisible && modalType === "meals"}
        onBackdropPress={() => {
          setIsModalVisible(false);
          // Si es quickAdd y se cierra sin seleccionar, volver atrás
          if (quickAdd) {
            navigation.goBack();
          }
        }}
        style={styles.modal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
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
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {meals.map((mealOption) => (
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
                <Ionicons name="checkmark-circle" size={24} color="#6C3BAA" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
    color: "#1A1A1A",
  },
  imageContainer: {
    backgroundColor: "#fff",
    paddingVertical: 30,
    alignItems: "center",
  },
  productImage: {
    width: width * 0.5,
    height: width * 0.5,
    resizeMode: "contain",
  },
  nameContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  productName: {
    fontSize: RFValue(18),
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  nutritionSection: {
    backgroundColor: "#fff",
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: RFValue(16),
    fontWeight: "700",
    color: "#1A1A1A",
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
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#fff",
    padding: 20,
    marginTop: 12,
  },
  quantityContainer: {
    gap: 12,
  },
  quantityInputContainer: {
    flexDirection: "row",
    gap: 12,
  },
  quantityInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    fontSize: RFValue(18),
    fontWeight: "600",
    color: "#1A1A1A",
  },
  unitButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 8,
    minWidth: 120,
  },
  unitButtonText: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#1A1A1A",
  },
  mealSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
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
    color: "#1A1A1A",
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
    color: "#6C3BAA",
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
    borderBottomColor: "#E5E7EB",
  },
  nutrientLabel: {
    fontSize: RFValue(13),
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
    paddingRight: 12,
  },
  nutrientValue: {
    fontSize: RFValue(14),
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#6C3BAA",
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    elevation: 4,
    shadowColor: "#6C3BAA",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  addButtonDisabled: {
    backgroundColor: "#9CA3AF",
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
    backgroundColor: "#fff",
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
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: RFValue(18),
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
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
    color: "#1A1A1A",
  },
});
