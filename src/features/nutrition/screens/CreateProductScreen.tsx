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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RFValue } from "react-native-responsive-fontsize";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as nutritionService from "../services/nutritionService";

const DUMMY_USER_ID = "user123";

interface NutritionalValues {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
}

export default function CreateProductScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [barcode, setBarcode] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [servingUnit, setServingUnit] = useState("g");

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
      Alert.alert("Permission Required", "Please allow access to your photos");
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
    setImageUri(null);
  };

  const updateNutritionalValue = (
    key: keyof NutritionalValues,
    value: string
  ) => {
    // Allow only numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, "");
    setNutritionalValues((prev) => ({ ...prev, [key]: numericValue }));
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Product name is required");
      return false;
    }

    if (
      !nutritionalValues.calories ||
      parseFloat(nutritionalValues.calories) < 0
    ) {
      Alert.alert("Validation Error", "Valid calories value is required");
      return false;
    }

    if (
      !nutritionalValues.protein ||
      parseFloat(nutritionalValues.protein) < 0
    ) {
      Alert.alert("Validation Error", "Valid protein value is required");
      return false;
    }

    if (!nutritionalValues.carbs || parseFloat(nutritionalValues.carbs) < 0) {
      Alert.alert("Validation Error", "Valid carbs value is required");
      return false;
    }

    if (!nutritionalValues.fat || parseFloat(nutritionalValues.fat) < 0) {
      Alert.alert("Validation Error", "Valid fat value is required");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const productData = {
        userId: DUMMY_USER_ID,
        name: name.trim(),
        description: description.trim(),
        brand: brand.trim(),
        image: imageUri || undefined,
        barcode: barcode.trim() || undefined,
        servingSize: servingSize ? parseFloat(servingSize) : 100,
        servingUnit,
        caloriesPer100: parseFloat(nutritionalValues.calories),
        proteinPer100: parseFloat(nutritionalValues.protein),
        carbsPer100: parseFloat(nutritionalValues.carbs),
        fatPer100: parseFloat(nutritionalValues.fat),
        fiber: nutritionalValues.fiber
          ? parseFloat(nutritionalValues.fiber)
          : 0,
        sugar: nutritionalValues.sugar
          ? parseFloat(nutritionalValues.sugar)
          : 0,
        sodium: nutritionalValues.sodium
          ? parseFloat(nutritionalValues.sodium)
          : 0,
      };

      await nutritionService.createCustomProduct(productData);

      Alert.alert("Success", "Custom product created successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error creating product:", error);
      Alert.alert("Error", "Failed to create product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>Create Product</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.imagePickerContainer}>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.imagePreview}
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
                  style={styles.imagePlaceholder}
                  onPress={handlePickImage}
                >
                  <Ionicons name="camera" size={RFValue(32)} color="#999" />
                  <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Organic Chicken Breast"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand</Text>
              <TextInput
                style={styles.input}
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g., Brand Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add product description..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Barcode (optional)</Text>
              <TextInput
                style={styles.input}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="e.g., 1234567890123"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Serving Size</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: 12 }]}>
                <Text style={styles.label}>Amount</Text>
                <TextInput
                  style={styles.input}
                  value={servingSize}
                  onChangeText={setServingSize}
                  placeholder="100"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={servingUnit}
                  onChangeText={setServingUnit}
                  placeholder="g"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Nutritional Information (per 100g)
            </Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <Text style={styles.label}>Calories *</Text>
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
                <Text style={styles.label}>Protein (g) *</Text>
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
                <Text style={styles.label}>Carbs (g) *</Text>
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
                <Text style={styles.label}>Fat (g) *</Text>
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
                <Text style={styles.label}>Fiber (g)</Text>
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
                <Text style={styles.label}>Sugar (g)</Text>
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
              <Text style={styles.label}>Sodium (mg)</Text>
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
                <Text style={styles.saveButtonText}>Create Product</Text>
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
  sectionTitle: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  imagePickerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
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
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
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
  row: {
    flexDirection: "row",
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
