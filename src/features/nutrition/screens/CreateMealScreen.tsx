import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RFValue } from "react-native-responsive-fontsize";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as nutritionService from "../services/nutritionService";

const DUMMY_USER_ID = "user123";

interface MealProduct {
  id: string;
  productCode: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function CreateMealScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [products, setProducts] = useState<MealProduct[]>([]);

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Please allow access to your photos");
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
    setImageUri(null);
  };

  const handleAddProducts = () => {
    // Navigate to ProductListScreen in selection mode
    Alert.alert(
      "Add Products",
      "This will navigate to the product list in selection mode",
      [
        {
          text: "OK",
          onPress: () => {
            // After products are selected, they will be added to the products array
            // This is a placeholder - actual implementation would use navigation params
            console.log(
              "Navigate to ProductListScreen with selectionMode=true"
            );
          },
        },
      ]
    );
  };

  const handleUpdateQuantity = (productId: string, quantity: string) => {
    const numericQuantity = parseFloat(quantity) || 0;
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              quantity: numericQuantity,
              // Recalculate macros based on new quantity
              calories: (product.calories / product.quantity) * numericQuantity,
              protein: (product.protein / product.quantity) * numericQuantity,
              carbs: (product.carbs / product.quantity) * numericQuantity,
              fat: (product.fat / product.quantity) * numericQuantity,
            }
          : product
      )
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== productId));
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
      Alert.alert("Validation Error", "Meal name is required");
      return false;
    }

    if (products.length === 0) {
      Alert.alert(
        "Validation Error",
        "Please add at least one product to your meal"
      );
      return false;
    }

    const hasInvalidQuantity = products.some((p) => p.quantity <= 0);
    if (hasInvalidQuantity) {
      Alert.alert(
        "Validation Error",
        "All products must have a valid quantity"
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const mealData = {
        userId: DUMMY_USER_ID,
        name: name.trim(),
        description: description.trim(),
        image: imageUri || undefined,
        products: products.map((p) => ({
          productCode: p.productCode,
          productName: p.productName,
          quantity: p.quantity,
          unit: p.unit,
          calories: p.calories,
          protein: p.protein,
          carbs: p.carbs,
          fat: p.fat,
        })),
      };

      await nutritionService.createCustomMeal(mealData);

      Alert.alert("Success", "Custom meal created successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error creating meal:", error);
      Alert.alert("Error", "Failed to create meal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalMacros = calculateTotalMacros();

  const renderProduct = ({ item }: { item: MealProduct }) => (
    <View style={styles.productItem}>
      {item.productImage ? (
        <Image
          source={{ uri: item.productImage }}
          style={styles.productImage}
        />
      ) : (
        <View style={[styles.productImage, styles.productPlaceholder]}>
          <Ionicons name="nutrition" size={RFValue(20)} color="#999" />
        </View>
      )}

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.productName}
        </Text>
        <View style={styles.productQuantityContainer}>
          <TextInput
            style={styles.quantityInput}
            value={item.quantity.toString()}
            onChangeText={(value) => handleUpdateQuantity(item.id, value)}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Text style={styles.unitText}>{item.unit}</Text>
        </View>
        <Text style={styles.productMacros}>
          {Math.round(item.calories)} cal • {Math.round(item.protein)}g P •{" "}
          {Math.round(item.carbs)}g C • {Math.round(item.fat)}g F
        </Text>
      </View>

      <TouchableOpacity
        style={styles.removeProductButton}
        onPress={() => handleRemoveProduct(item.id)}
      >
        <Ionicons name="close-circle" size={RFValue(24)} color="#E74C3C" />
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
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={RFValue(24)} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Meal</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meal Information</Text>

            <View style={styles.imagePickerContainer}>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.mealImagePreview}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleRemoveImage}
                  >
                    <Ionicons
                      name="close-circle"
                      size={RFValue(24)}
                      color="#E74C3C"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.mealImagePlaceholder}
                  onPress={handlePickImage}
                >
                  <Ionicons name="camera" size={RFValue(32)} color="#999" />
                  <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Meal Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., High Protein Breakfast"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add meal description..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Products</Text>
              <TouchableOpacity
                style={styles.addProductsButton}
                onPress={handleAddProducts}
              >
                <Ionicons
                  name="add-circle"
                  size={RFValue(20)}
                  color="#6C3BAA"
                />
                <Text style={styles.addProductsText}>Add Products</Text>
              </TouchableOpacity>
            </View>

            {products.length > 0 ? (
              <FlatList
                data={products}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                style={styles.productsList}
              />
            ) : (
              <View style={styles.emptyProducts}>
                <Ionicons
                  name="fast-food-outline"
                  size={RFValue(48)}
                  color="#CCC"
                />
                <Text style={styles.emptyProductsText}>
                  No products added yet
                </Text>
                <Text style={styles.emptyProductsSubtext}>
                  Tap "Add Products" to build your meal
                </Text>
              </View>
            )}
          </View>

          {products.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Total Macros</Text>
              <View style={styles.macrosCard}>
                <View style={styles.macroRow}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {Math.round(totalMacros.calories)}
                    </Text>
                    <Text style={styles.macroLabel}>Calories</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {Math.round(totalMacros.protein)}g
                    </Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                </View>
                <View style={styles.macroRow}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {Math.round(totalMacros.carbs)}g
                    </Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroValue}>
                      {Math.round(totalMacros.fat)}g
                    </Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={RFValue(20)} color="#FFF" />
                <Text style={styles.saveButtonText}>Create Meal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: RFValue(18),
    fontWeight: "600",
    color: "#333",
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#333",
  },
  addProductsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addProductsText: {
    fontSize: RFValue(14),
    fontWeight: "500",
    color: "#6C3BAA",
  },
  imagePickerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  mealImagePlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: RFValue(12),
    color: "#999",
  },
  imagePreviewContainer: {
    position: "relative",
    width: "100%",
  },
  mealImagePreview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFF",
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: RFValue(13),
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: RFValue(14),
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  productsList: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 8,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  productPlaceholder: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: RFValue(14),
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  productQuantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  quantityInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: RFValue(12),
    width: 60,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  unitText: {
    fontSize: RFValue(12),
    color: "#666",
  },
  productMacros: {
    fontSize: RFValue(11),
    color: "#999",
  },
  removeProductButton: {
    padding: 4,
  },
  emptyProducts: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
  },
  emptyProductsText: {
    fontSize: RFValue(16),
    fontWeight: "500",
    color: "#666",
    marginTop: 12,
  },
  emptyProductsSubtext: {
    fontSize: RFValue(13),
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  macrosCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  macroItem: {
    alignItems: "center",
    flex: 1,
  },
  macroValue: {
    fontSize: RFValue(20),
    fontWeight: "700",
    color: "#6C3BAA",
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: RFValue(12),
    color: "#666",
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#6C3BAA",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#FFF",
  },
  bottomPadding: {
    height: 20,
  },
});
