import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  CustomMeal,
  CustomProduct,
  MealProduct,
  Product,
} from "../../../models";
import * as nutritionService from "../services/nutritionService";
import { NutritionStackParamList } from "./NutritionStack";

type EditMealScreenNavigationProp = NativeStackNavigationProp<
  NutritionStackParamList,
  "EditMealScreen"
>;
type EditMealScreenRouteProp = RouteProp<
  NutritionStackParamList,
  "EditMealScreen"
>;

export default function EditMealScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<EditMealScreenNavigationProp>();
  const route = useRoute<EditMealScreenRouteProp>();
  const meal = route.params.meal as CustomMeal;

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(meal?.name || "");
  const [description, setDescription] = useState(meal?.description || "");
  const [imageUri, setImageUri] = useState<string | null>(meal?.image || null);
  const [products, setProducts] = useState<MealProduct[]>(meal?.products || []);

  useEffect(() => {
    if (!meal) {
      Alert.alert("Error", "No se encontró la comida", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  }, [meal]);

  // Escuchar productos seleccionados desde ProductSelectionScreen
  useEffect(() => {
    if (route.params?.selectedProducts) {
      const selectedProducts = route.params.selectedProducts as (
        | Product
        | CustomProduct
        | CustomMeal
      )[];

      const newMealProducts: MealProduct[] = selectedProducts.map((product) => {
        // Si es una comida personalizada (CustomMeal)
        if ("totalCalories" in product) {
          return {
            id: product.id,
            productCode: product.id,
            productName: product.name,
            productImage: product.image || undefined,
            quantity: 1,
            unit: "porción",
            calories: product.totalCalories,
            protein: product.totalProtein,
            carbs: product.totalCarbs,
            fat: product.totalFat,
          };
        } else {
          // Es un Product o CustomProduct
          const isCustom = "caloriesPer100" in product;
          const baseCalories = isCustom
            ? product.caloriesPer100
            : product.calories;
          const baseProtein = isCustom
            ? product.proteinPer100
            : product.protein;
          const baseCarbs = isCustom
            ? product.carbsPer100
            : product.carbohydrates;
          const baseFat = isCustom ? product.fatPer100 : product.fat;

          return {
            id: isCustom ? product.id : product.code,
            isCustom,
            productCode: isCustom ? product.id : product.code,
            productName: product.name,
            productImage: product.image || undefined,
            quantity: 100,
            unit: "g",
            calories: baseCalories,
            protein: baseProtein,
            carbs: baseCarbs,
            fat: baseFat,
          };
        }
      });

      // Combinar con productos existentes, evitando duplicados
      setProducts((prev) => {
        const updated = [...prev];
        newMealProducts.forEach((newProduct) => {
          const existingIndex = updated.findIndex(
            (p) => p.productCode === newProduct.productCode
          );
          if (existingIndex === -1) {
            updated.push(newProduct);
          }
        });
        return updated;
      });

      // Limpiar el parámetro
      navigation.setParams({ selectedProducts: undefined });
    }
  }, [route.params?.selectedProducts]);

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permiso Requerido",
        "Por favor permite el acceso a tus fotos"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      "Eliminar Imagen",
      "¿Estás seguro de que deseas eliminar la imagen?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => setImageUri(null),
        },
      ]
    );
  };

  const handleAddProducts = () => {
    // Navegar a ProductSelectionScreen indicando que viene de EditMealScreen
    navigation.navigate("ProductSelectionScreen", {
      from: "EditMealScreen",
      meal: meal, // Pasar la comida actual
    });
  };

  const handleUpdateQuantity = (productCode: string, quantity: string) => {
    const numericQuantity = parseFloat(quantity) || 0;
    setProducts((prev) =>
      prev.map((product) => {
        if (product.productCode === productCode) {
          const baseCalories = product.calories / product.quantity;
          const baseProtein = product.protein / product.quantity;
          const baseCarbs = product.carbs / product.quantity;
          const baseFat = product.fat / product.quantity;

          return {
            ...product,
            quantity: numericQuantity,
            calories: baseCalories * numericQuantity,
            protein: baseProtein * numericQuantity,
            carbs: baseCarbs * numericQuantity,
            fat: baseFat * numericQuantity,
          };
        }
        return product;
      })
    );
  };

  const handleRemoveProduct = (productCode: string) => {
    Alert.alert(
      "Eliminar Producto",
      "¿Estás seguro de que deseas eliminar este producto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setProducts((prev) =>
              prev.filter((product) => product.productCode !== productCode)
            );
          },
        },
      ]
    );
  };

  const calculateTotalMacros = () => {
    return products.reduce(
      (totals, product) => ({
        calories: totals.calories + product.calories,
        protein: totals.protein + product.protein,
        carbs: totals.carbs + product.carbs,
        fat: totals.fat + product.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert("Error de Validación", "El nombre de la comida es requerido");
      return false;
    }

    if (products.length === 0) {
      Alert.alert(
        "Error de Validación",
        "Por favor añade al menos un producto a tu comida"
      );
      return false;
    }

    const hasInvalidQuantity = products.some((p) => p.quantity <= 0);
    if (hasInvalidQuantity) {
      Alert.alert(
        "Error de Validación",
        "Todos los productos deben tener una cantidad válida"
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const updateData = {
        name: name.trim(),
        description: description.trim() || undefined,
        image: imageUri || undefined,
        products: products.map((p) => ({
          id: p.id || `temp-${Date.now()}-${Math.random()}`,
          isCustom: p.isCustom,
          productCode: p.productCode,
          productName: p.productName,
          productImage: p.productImage,
          quantity: p.quantity,
          unit: p.unit,
          calories: p.calories,
          protein: p.protein,
          carbs: p.carbs,
          fat: p.fat,
        })),
      };

      await nutritionService.updateCustomMeal(meal.id, updateData);

      Alert.alert("¡Éxito!", "Comida actualizada correctamente", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("ProductListScreen", {
              refresh: true,
              screen: "Meals",
            });
          },
        },
      ]);
    } catch (error) {
      console.error("Error updating meal:", error);
      Alert.alert(
        "Error",
        "No se pudo actualizar la comida. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar Comida",
      "¿Estás seguro de que deseas eliminar esta comida? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await nutritionService.deleteCustomMeal(meal.id);
              Alert.alert("¡Eliminado!", "Comida eliminada correctamente", [
                {
                  text: "OK",
                  onPress: () => {
                    navigation.navigate("ProductListScreen", {
                      refresh: true,
                      screen: "Meals",
                    });
                  },
                },
              ]);
            } catch (error) {
              console.error("Error deleting meal:", error);
              Alert.alert(
                "Error",
                "No se pudo eliminar la comida. Intenta de nuevo."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const totalMacros = calculateTotalMacros();

  const renderProduct = ({
    item,
    index,
  }: {
    item: MealProduct;
    index: number;
  }) => (
    <View
      style={[
        styles.productItem,
        index === products.length - 1 && styles.lastProductItem,
      ]}
    >
      <View style={styles.productImageContainer}>
        {item.productImage ? (
          <Image
            source={{ uri: item.productImage }}
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.productPlaceholder]}>
            <Ionicons
              name="nutrition-outline"
              size={RFValue(22)}
              color={theme.textTertiary}
            />
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.productName}
        </Text>
        <View style={styles.productQuantityContainer}>
          <TextInput
            style={styles.quantityInput}
            value={item.quantity.toString()}
            onChangeText={(value) =>
              handleUpdateQuantity(item.productCode, value)
            }
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={theme.textTertiary}
          />
          <Text style={styles.unitText}>{item.unit}</Text>
        </View>
        <View style={styles.macrosChips}>
          <View style={styles.macroChip}>
            <Ionicons name="flame-outline" size={RFValue(10)} color="#FF6B6B" />
            <Text style={styles.macroChipText}>
              {Math.round(item.calories)} cal
            </Text>
          </View>
          <View style={styles.macroChip}>
            <Text style={[styles.macroChipText, styles.proteinText]}>
              {Math.round(item.protein)}g P
            </Text>
          </View>
          <View style={styles.macroChip}>
            <Text style={[styles.macroChipText, styles.carbsText]}>
              {Math.round(item.carbs)}g C
            </Text>
          </View>
          <View style={styles.macroChip}>
            <Text style={[styles.macroChipText, styles.fatText]}>
              {Math.round(item.fat)}g G
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeProductButton}
        onPress={() => handleRemoveProduct(item.productCode)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={RFValue(20)} color={theme.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={RFValue(24)} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Editar Comida</Text>
            <Text style={styles.headerSubtitle}>
              {products.length} productos
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDelete}
            disabled={deleting}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={theme.error} />
            ) : (
              <Ionicons
                name="trash-outline"
                size={RFValue(24)}
                color={theme.error}
              />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Imagen de la comida */}
          <View style={styles.imageSection}>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.mealImagePreview}
                />
                <View style={styles.imageOverlay}>
                  <TouchableOpacity
                    style={styles.imageActionButton}
                    onPress={handlePickImage}
                  >
                    <Ionicons name="camera" size={RFValue(18)} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.imageActionButton, styles.deleteImageButton]}
                    onPress={handleRemoveImage}
                  >
                    <Ionicons name="trash" size={RFValue(18)} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.mealImagePlaceholder}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <View style={styles.placeholderIcon}>
                  <Ionicons
                    name="camera-outline"
                    size={RFValue(32)}
                    color={theme.primary}
                  />
                </View>
                <Text style={styles.imagePlaceholderText}>Agregar Foto</Text>
                <Text style={styles.imagePlaceholderSubtext}>
                  Opcional - Haz la comida más memorable
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Información básica */}
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nombre de la Comida <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="ej. Desayuno Alto en Proteína"
                placeholderTextColor={theme.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Agrega notas o detalles sobre esta comida..."
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Productos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Productos</Text>
                <Text style={styles.sectionSubtitle}>
                  {products.length === 0
                    ? "Añade productos para crear tu comida"
                    : `${products.length} producto${
                        products.length !== 1 ? "s" : ""
                      } añadido${products.length !== 1 ? "s" : ""}`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addProductsButton}
                onPress={handleAddProducts}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add-circle"
                  size={RFValue(22)}
                  color={theme.primary}
                />
                <Text style={styles.addProductsText}>Añadir</Text>
              </TouchableOpacity>
            </View>

            {products.length > 0 ? (
              <View style={styles.productsList}>
                <FlatList
                  data={products}
                  renderItem={renderProduct}
                  keyExtractor={(item) => item.productCode}
                  scrollEnabled={false}
                />
              </View>
            ) : (
              <View style={styles.emptyProducts}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons
                    name="restaurant-outline"
                    size={RFValue(48)}
                    color={theme.primary}
                  />
                </View>
                <Text style={styles.emptyProductsText}>
                  No hay productos añadidos
                </Text>
                <Text style={styles.emptyProductsSubtext}>
                  Toca el botón "Añadir" para seleccionar productos
                </Text>
              </View>
            )}
          </View>

          {/* Macros totales */}
          {products.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Información Nutricional Total
              </Text>
              <View style={styles.macrosCard}>
                <View style={styles.macroGrid}>
                  <View style={styles.mainMacro}>
                    <Ionicons name="flame" size={RFValue(24)} color="#FF6B6B" />
                    <Text style={styles.mainMacroValue}>
                      {Math.round(totalMacros.calories)}
                    </Text>
                    <Text style={styles.mainMacroLabel}>Calorías</Text>
                  </View>

                  <View style={styles.macrosGrid}>
                    <View style={styles.secondaryMacro}>
                      <View
                        style={[
                          styles.macroIndicator,
                          { backgroundColor: "#2196F3" },
                        ]}
                      />
                      <Text style={styles.secondaryMacroValue}>
                        {Math.round(totalMacros.protein)}g
                      </Text>
                      <Text style={styles.secondaryMacroLabel}>Proteína</Text>
                    </View>

                    <View style={styles.secondaryMacro}>
                      <View
                        style={[
                          styles.macroIndicator,
                          { backgroundColor: "#FFB74D" },
                        ]}
                      />
                      <Text style={styles.secondaryMacroValue}>
                        {Math.round(totalMacros.carbs)}g
                      </Text>
                      <Text style={styles.secondaryMacroLabel}>
                        Carbohidratos
                      </Text>
                    </View>

                    <View style={styles.secondaryMacro}>
                      <View
                        style={[
                          styles.macroIndicator,
                          { backgroundColor: "#FF9800" },
                        ]}
                      />
                      <Text style={styles.secondaryMacroValue}>
                        {Math.round(totalMacros.fat)}g
                      </Text>
                      <Text style={styles.secondaryMacroLabel}>Grasas</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Footer con botón de guardar */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={RFValue(22)}
                  color="#FFF"
                />
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: RFValue(18),
    fontWeight: "700",
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: RFValue(12),
    color: theme.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  imageSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  mealImagePlaceholder: {
    height: 200,
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 2,
    borderColor: theme.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imagePlaceholderText: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: theme.text,
    marginTop: 4,
  },
  imagePlaceholderSubtext: {
    fontSize: RFValue(12),
    color: theme.textSecondary,
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: "relative",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  mealImagePreview: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  imageActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.primary}E6`,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteImageButton: {
    backgroundColor: `${theme.error}E6`,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: theme.text,
    marginBottom: 8,
  },
  required: {
    color: theme.error,
  },
  input: {
    backgroundColor: theme.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: RFValue(15),
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: RFValue(18),
    fontWeight: "700",
    color: theme.text,
  },
  sectionSubtitle: {
    fontSize: RFValue(13),
    color: theme.textSecondary,
    marginTop: 2,
    flexWrap: "wrap",
  },
  addProductsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    flexShrink: 0,
  },
  addProductsText: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: theme.primary,
  },
  productsList: {
    backgroundColor: theme.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundSecondary,
  },
  lastProductItem: {
    borderBottomWidth: 0,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  productPlaceholder: {
    backgroundColor: theme.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: RFValue(15),
    fontWeight: "600",
    color: theme.text,
    marginBottom: 6,
  },
  productQuantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  quantityInput: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: RFValue(14),
    fontWeight: "600",
    width: 70,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
  },
  unitText: {
    fontSize: RFValue(14),
    color: theme.textSecondary,
    fontWeight: "500",
  },
  macrosChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  macroChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  macroChipText: {
    fontSize: RFValue(11),
    color: theme.textSecondary,
    fontWeight: "500",
  },
  proteinText: {
    color: "#2196F3",
  },
  carbsText: {
    color: "#FFB74D",
  },
  fatText: {
    color: "#FF9800",
  },
  removeProductButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${theme.error}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyProducts: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 48,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyProductsText: {
    fontSize: RFValue(17),
    fontWeight: "600",
    color: theme.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyProductsSubtext: {
    fontSize: RFValue(14),
    color: theme.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  macrosCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  macroGrid: {
    gap: 16,
  },
  mainMacro: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundSecondary,
  },
  mainMacroValue: {
    fontSize: RFValue(32),
    fontWeight: "700",
    color: "#FF6B6B",
    marginTop: 8,
  },
  mainMacroLabel: {
    fontSize: RFValue(14),
    color: theme.textSecondary,
    marginTop: 4,
    fontWeight: "500",
  },
  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  secondaryMacro: {
    alignItems: "center",
    flex: 1,
  },
  macroIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  secondaryMacroValue: {
    fontSize: RFValue(18),
    fontWeight: "700",
    color: theme.text,
    marginBottom: 4,
  },
  secondaryMacroLabel: {
    fontSize: RFValue(11),
    color: theme.textSecondary,
    textAlign: "center",
  },
  footer: {
    padding: 16,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: RFValue(16),
    fontWeight: "700",
    color: "#FFF",
  },
  bottomPadding: {
    height: 32,
  },
});
