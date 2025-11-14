import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import Modal from "react-native-modal";
import { useNutritionStore } from "../../../store/useNutritionStore";
import * as nutritionService from "../services/nutritionService";
import { NutritionStackParamList } from "./NutritionStack";
import { FoodUnit } from "../../../models/nutrition.model";

interface NutritionalValues {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
}

const UNITS_CONFIG = [
  {
    label: "Gramos",
    value: "g" as FoodUnit,
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

export default function CreateProductScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<NutritionStackParamList>>();
  const userProfile = useNutritionStore((state) => state.userProfile);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [servingUnit, setServingUnit] = useState<FoodUnit>("g");
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [nutritionalValues, setNutritionalValues] = useState<NutritionalValues>(
    {
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      fiber: "",
      sugar: "",
      sodium: "",
    }
  );

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
      aspect: [1, 1],
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

  const updateNutritionalValue = (
    key: keyof NutritionalValues,
    value: string
  ) => {
    const numericValue = value.replace(/[^0-9.]/g, "");
    setNutritionalValues((prev) => ({ ...prev, [key]: numericValue }));
  };

  const getUnitLabel = (value: FoodUnit): string => {
    return UNITS_CONFIG.find((u) => u.value === value)?.label || "Gramos";
  };

  const getUnitData = (value: FoodUnit) => {
    return UNITS_CONFIG.find((u) => u.value === value) || UNITS_CONFIG[0];
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert("Error de Validación", "El nombre del producto es requerido");
      return false;
    }

    if (
      !nutritionalValues.calories ||
      parseFloat(nutritionalValues.calories) < 0
    ) {
      Alert.alert("Error de Validación", "Las calorías son requeridas");
      return false;
    }

    if (
      !nutritionalValues.protein ||
      parseFloat(nutritionalValues.protein) < 0
    ) {
      Alert.alert("Error de Validación", "Las proteínas son requeridas");
      return false;
    }

    if (!nutritionalValues.carbs || parseFloat(nutritionalValues.carbs) < 0) {
      Alert.alert("Error de Validación", "Los carbohidratos son requeridos");
      return false;
    }

    if (!nutritionalValues.fat || parseFloat(nutritionalValues.fat) < 0) {
      Alert.alert("Error de Validación", "Las grasas son requeridas");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    if (!userProfile) {
      Alert.alert("Error", "No se encontró el perfil de usuario");
      return;
    }

    setLoading(true);

    try {
      const productData = {
        userId: userProfile.userId,
        name: name.trim(),
        description: description.trim() || undefined,
        brand: brand.trim() || undefined,
        image: imageUri || undefined,
        barcode: barcode.trim() || undefined,
        servingSize: servingSize ? parseFloat(servingSize) : undefined,
        servingUnit: servingUnit,
        caloriesPer100: parseFloat(nutritionalValues.calories),
        proteinPer100: parseFloat(nutritionalValues.protein),
        carbsPer100: parseFloat(nutritionalValues.carbs),
        fatPer100: parseFloat(nutritionalValues.fat),
        fiberPer100: nutritionalValues.fiber
          ? parseFloat(nutritionalValues.fiber)
          : undefined,
        sugarPer100: nutritionalValues.sugar
          ? parseFloat(nutritionalValues.sugar)
          : undefined,
        sodiumPer100: nutritionalValues.sodium
          ? parseFloat(nutritionalValues.sodium)
          : undefined,
      };

      await nutritionService.createCustomProduct(productData);

      Alert.alert("¡Éxito!", "Producto personalizado creado exitosamente", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("ProductListScreen", { refresh: true });
          },
        },
      ]);
    } catch (error) {
      console.error("Error creating product:", error);
      Alert.alert("Error", "No se pudo crear el producto. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const selectedUnit = getUnitData(servingUnit);

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
            <Ionicons name="arrow-back" size={RFValue(24)} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Crear Producto</Text>
            <Text style={styles.headerSubtitle}>Producto personalizado</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Imagen del producto */}
          <View style={styles.imageSection}>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.productImagePreview}
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
                style={styles.productImagePlaceholder}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <View style={styles.placeholderIcon}>
                  <Ionicons
                    name="camera-outline"
                    size={RFValue(32)}
                    color="#6C3BAA"
                  />
                </View>
                <Text style={styles.imagePlaceholderText}>Agregar Foto</Text>
                <Text style={styles.imagePlaceholderSubtext}>
                  Opcional - Haz el producto más memorable
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Información básica */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Básica</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nombre del Producto <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="ej. Pechuga de Pollo Orgánica"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Marca</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="ej. Nombre de la Marca"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Agrega una descripción del producto..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de Barras (opcional)</Text>
              <TextInput
                style={styles.input}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="ej. 1234567890123"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Tamaño de porción */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tamaño de Porción</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cantidad</Text>
              <TextInput
                style={styles.input}
                value={servingSize}
                onChangeText={setServingSize}
                placeholder="100"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Unidad</Text>
              <TouchableOpacity
                style={styles.unitSelector}
                onPress={() => setIsModalVisible(true)}
              >
                <View style={styles.unitSelectorLeft}>
                  <View
                    style={[
                      styles.unitIconContainer,
                      { backgroundColor: `${selectedUnit.color}15` },
                    ]}
                  >
                    <Ionicons
                      name={selectedUnit.icon as any}
                      size={20}
                      color={selectedUnit.color}
                    />
                  </View>
                  <Text style={styles.unitSelectorText}>
                    {selectedUnit.label}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Información nutricional */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Información Nutricional (por 100g)
            </Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>
                  Calorías <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={nutritionalValues.calories}
                  onChangeText={(value) =>
                    updateNutritionalValue("calories", value)
                  }
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  Proteína (g) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={nutritionalValues.protein}
                  onChangeText={(value) =>
                    updateNutritionalValue("protein", value)
                  }
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>
                  Carbohidratos (g) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={nutritionalValues.carbs}
                  onChangeText={(value) =>
                    updateNutritionalValue("carbs", value)
                  }
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  Grasas (g) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={nutritionalValues.fat}
                  onChangeText={(value) => updateNutritionalValue("fat", value)}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>Fibra (g)</Text>
                <TextInput
                  style={styles.input}
                  value={nutritionalValues.fiber}
                  onChangeText={(value) =>
                    updateNutritionalValue("fiber", value)
                  }
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Azúcar (g)</Text>
                <TextInput
                  style={styles.input}
                  value={nutritionalValues.sugar}
                  onChangeText={(value) =>
                    updateNutritionalValue("sugar", value)
                  }
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sodio (mg)</Text>
              <TextInput
                style={styles.input}
                value={nutritionalValues.sodium}
                onChangeText={(value) =>
                  updateNutritionalValue("sodium", value)
                }
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Footer con botón de crear */}
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
                <Ionicons name="add-circle" size={RFValue(22)} color="#FFF" />
                <Text style={styles.saveButtonText}>Crear Producto</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modal de selección de unidades */}
      <Modal
        isVisible={isModalVisible}
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
          {UNITS_CONFIG.map((unitOption) => {
            const isSelected = servingUnit === unitOption.value;
            return (
              <TouchableOpacity
                key={unitOption.value}
                style={[
                  styles.modalOption,
                  isSelected && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setServingUnit(unitOption.value);
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
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={unitOption.color}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
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
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontSize: RFValue(12),
    color: "#666",
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
  productImagePlaceholder: {
    height: 200,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E8E8E8",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0E6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imagePlaceholderText: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#333",
    marginTop: 4,
  },
  imagePlaceholderSubtext: {
    fontSize: RFValue(12),
    color: "#999",
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: "relative",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  productImagePreview: {
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
    backgroundColor: "rgba(108, 59, 170, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteImageButton: {
    backgroundColor: "rgba(231, 76, 60, 0.9)",
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: RFValue(18),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#E74C3C",
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: RFValue(15),
    color: "#333",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  unitSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  unitSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  unitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  unitSelectorText: {
    fontSize: RFValue(15),
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#6C3BAA",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#6C3BAA",
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
  modalOptionSelected: {
    backgroundColor: "#F9FAFB",
  },
  modalOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  modalOptionText: {
    fontSize: RFValue(15),
    fontWeight: "600",
    color: "#1A1A1A",
  },
});
