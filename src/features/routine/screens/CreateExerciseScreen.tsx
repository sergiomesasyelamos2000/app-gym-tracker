import {
  NavigationProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../../../contexts/ThemeContext";
import { ExerciseRequestDto } from "../../../models";
import {
  createExercise,
  fetchEquipment,
  fetchExerciseTypes,
  fetchMuscles,
} from "../../../services/exerciseService";
import { WorkoutStackParamList } from "./WorkoutStack";

interface DropdownOption {
  id: string;
  name: string;
  image?: string; // Base64 de imagen o emoji
}

interface CreateExerciseRouteProps {
  onExerciseCreated?: (exercise: ExerciseRequestDto) => void;
}

export default function CreateExerciseScreen() {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NavigationProp<WorkoutStackParamList, "CreateExercise">>();
  const route = useRoute();
  const { onExerciseCreated } =
    (route.params as CreateExerciseRouteProps) || {};

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  // ==================== STATE ====================
  const [name, setName] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [primaryMuscleId, setPrimaryMuscleId] = useState("");
  const [otherMuscleIds, setOtherMuscleIds] = useState<string[]>([]);
  const [typeId, setTypeId] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [equipmentOptions, setEquipmentOptions] = useState<DropdownOption[]>(
    []
  );
  const [muscleOptions, setMuscleOptions] = useState<DropdownOption[]>([]);
  const [exerciseTypeOptions, setExerciseTypeOptions] = useState<
    DropdownOption[]
  >([]);

  // Modales
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showPrimaryMuscleModal, setShowPrimaryMuscleModal] = useState(false);
  const [showSecondaryMusclesModal, setShowSecondaryMusclesModal] =
    useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Animaciones
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(300)).current;

  // ==================== DATA LOADING ====================
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [equipmentData, musclesData, exerciseTypesData] = await Promise.all(
        [fetchEquipment(), fetchMuscles(), fetchExerciseTypes()]
      );

      setEquipmentOptions(equipmentData);
      setMuscleOptions(musclesData);
      setExerciseTypeOptions(exerciseTypesData);
    } catch (error) {
      Alert.alert(
        "Error",
        "Error al cargar los datos. Por favor intenta nuevamente."
      );
    }
  };

  // ==================== MODAL ANIMATIONS ====================
  const openModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 300,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
    });
  };

  // ==================== IMAGE HANDLING ====================
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Error", "Se necesitan permisos para acceder a la galería");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const optimizeAndEncodeImage = async (uri: string): Promise<string> => {
    const optimizedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 400, height: 400 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    return await FileSystem.readAsStringAsync(optimizedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  };

  // ==================== MUSCLE SELECTION ====================
  const toggleMuscleSelection = (muscleId: string) => {
    setOtherMuscleIds((prev) =>
      prev.includes(muscleId)
        ? prev.filter((id) => id !== muscleId)
        : [...prev, muscleId]
    );
  };

  const removeMuscle = (muscleId: string) => {
    setOtherMuscleIds((prev) => prev.filter((id) => id !== muscleId));
  };

  // ==================== VALIDATION & SAVE ====================
  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert("Error", "Por favor ingresa un nombre para el ejercicio");
      return false;
    }

    if (!primaryMuscleId) {
      Alert.alert("Error", "Por favor ingresa un nombre para el ejercicio");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let imageBase64: string | undefined;

      if (imageUri) {
        imageBase64 = await optimizeAndEncodeImage(imageUri);
      }

      const createdExercise = await createExercise({
        name: name.trim(),
        equipment: equipmentId,
        primaryMuscle: primaryMuscleId,
        otherMuscles: otherMuscleIds,
        type: typeId,
        imageBase64,
      });

      if (onExerciseCreated) {
        onExerciseCreated(createdExercise);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", `Error al crear el ejercicio: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== RENDER IMAGE HELPER ====================
  /**
   * 🔥 Función para renderizar la imagen correctamente
   * Si es base64 largo (>100 chars) = imagen real
   * Si es corto = emoji
   */
  // Reemplaza la función renderOptionImage existente con esta versión corregida:

  const renderOptionImage = (
    item: DropdownOption,
    size: "small" | "medium" | "large" = "medium"
  ) => {
    if (!item.image) return null;

    const sizeMap = {
      small: { width: 32, height: 32, fontSize: RFValue(18) },
      medium: { width: 56, height: 56, fontSize: RFValue(24) },
      large: { width: 80, height: 80, fontSize: RFValue(30) },
    };

    const dimensions = sizeMap[size];

    // Si es base64 (imagen real) - más de 100 caracteres
    if (item.image.length > 100) {
      const imageUri = item.image.startsWith("data:image")
        ? item.image
        : `data:image/jpeg;base64,${item.image}`;

      return (
        <View
          style={{
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: 12,
            backgroundColor: "#fff",
            padding: 6,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Image
            source={{ uri: imageUri }}
            style={{
              width: "100%",
              height: "100%",
            }}
            resizeMode="contain"
          />
        </View>
      );
    }

    // Si es emoji (menos de 100 caracteres)
    return (
      <View
        style={{
          width: dimensions.width,
          height: dimensions.height,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: dimensions.fontSize }}>{item.image}</Text>
      </View>
    );
  };

  // ==================== HELPERS ====================
  const getSelectedOption = (options: DropdownOption[], selectedId: string) => {
    return options.find((opt) => opt.id === selectedId);
  };

  const getMuscleDetails = (muscleId: string) => {
    const muscle = muscleOptions.find((m) => m.id === muscleId);
    return {
      name: muscle?.name || "Desconocido",
      image: muscle?.image || "💪",
    };
  };

  // ==================== RENDER MODAL ====================
  const renderSelectionModal = (
    visible: boolean,
    title: string,
    options: DropdownOption[],
    selectedValue: string,
    onSelect: (id: string) => void,
    onClose: () => void,
    multiSelect: boolean = false,
    selectedValues: string[] = []
  ) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={() => closeModal(onClose)}
      onShow={openModal}
    >
      <TouchableWithoutFeedback onPress={() => closeModal(onClose)}>
        <Animated.View
          style={[styles.modalOverlay, { opacity: overlayOpacity }]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContent,
                { transform: [{ translateY: modalTranslateY }] },
              ]}
            >
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{title}</Text>

              <FlatList
                data={options}
                keyExtractor={(item) => item.id}
                style={styles.optionsList}
                renderItem={({ item }) => {
                  const isSelected = multiSelect
                    ? selectedValues.includes(item.id)
                    : selectedValue === item.id;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionButton,
                        isSelected && styles.optionButtonSelected,
                      ]}
                      onPress={() => {
                        if (multiSelect) {
                          toggleMuscleSelection(item.id);
                        } else {
                          closeModal(() => {
                            onSelect(item.id);
                            onClose();
                          });
                        }
                      }}
                    >
                      <View style={styles.optionContent}>
                        {/* 🔥 Usar función helper para renderizar imagen */}
                        {renderOptionImage(item, "medium")}
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.checkCircle}>
                          <Icon name="check" size={16} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />

              {multiSelect && (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() => closeModal(onClose)}
                  >
                    <Text style={styles.modalConfirmText}>
                      Confirmar ({selectedValues.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const isSaveDisabled = !name.trim() || !primaryMuscleId || isLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* IMAGEN */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Imagen del ejercicio</Text>
            <TouchableOpacity
              style={[
                styles.imageContainer,
                { width: width * 0.6, height: width * 0.6 },
              ]}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              {imageUri ? (
                <>
                  <Image source={{ uri: imageUri }} style={styles.image} />
                  <View style={styles.imageOverlay}>
                    <Icon name="photo-camera" size={24} color="#fff" />
                    <Text style={styles.imageOverlayText}>Cambiar imagen</Text>
                  </View>
                </>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <View style={styles.imagePlaceholderIcon}>
                    <Icon name="add-a-photo" size={32} color="#6C3BAA" />
                  </View>
                  <Text style={styles.imagePlaceholderText}>
                    Toca para agregar una imagen
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* NOMBRE */}
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Nombre del ejercicio *</Text>
            <TextInput
              style={[
                styles.input,
                { fontSize: RFValue(isSmallScreen ? 14 : 15) },
              ]}
              placeholder="Ej: Press de banca con barra"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              maxLength={100}
            />
          </View>

          {/* TIPO DE EJERCICIO */}
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Tipo de ejercicio</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowTypeModal(true)}
            >
              <View style={styles.selectorContent}>
                {typeId ? (
                  <>
                    {renderOptionImage(
                      getSelectedOption(exerciseTypeOptions, typeId)!,
                      "small"
                    )}
                    <Text style={styles.selectorText}>
                      {getSelectedOption(exerciseTypeOptions, typeId)?.name ||
                        "Seleccionar tipo"}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.selectorPlaceholder}>
                    Seleccionar tipo
                  </Text>
                )}
              </View>
              <Icon name="arrow-drop-down" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* EQUIPAMIENTO */}
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Equipamiento</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowEquipmentModal(true)}
            >
              <View style={styles.selectorContent}>
                {equipmentId ? (
                  <>
                    {renderOptionImage(
                      getSelectedOption(equipmentOptions, equipmentId)!,
                      "small"
                    )}
                    <Text style={styles.selectorText}>
                      {getSelectedOption(equipmentOptions, equipmentId)?.name ||
                        "Seleccionar equipamiento"}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.selectorPlaceholder}>
                    Seleccionar equipamiento
                  </Text>
                )}
              </View>
              <Icon name="arrow-drop-down" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* MÚSCULO PRINCIPAL */}
          <View style={styles.section}>
            <Text style={styles.inputLabel}>Músculo principal *</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowPrimaryMuscleModal(true)}
            >
              <View style={styles.selectorContent}>
                {primaryMuscleId ? (
                  <>
                    {renderOptionImage(
                      getSelectedOption(muscleOptions, primaryMuscleId)!,
                      "small"
                    )}
                    <Text style={styles.selectorText}>
                      {getSelectedOption(muscleOptions, primaryMuscleId)
                        ?.name || "Seleccionar músculo"}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.selectorPlaceholder}>
                    Seleccionar músculo principal
                  </Text>
                )}
              </View>
              <Icon name="arrow-drop-down" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* MÚSCULOS SECUNDARIOS */}
          <View style={styles.section}>
            <Text style={styles.inputLabel}>
              Músculos secundarios{" "}
              {otherMuscleIds.length > 0 && `(${otherMuscleIds.length})`}
            </Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowSecondaryMusclesModal(true)}
            >
              <View style={styles.selectorContent}>
                <Text
                  style={
                    otherMuscleIds.length > 0
                      ? styles.selectorText
                      : styles.selectorPlaceholder
                  }
                >
                  {otherMuscleIds.length > 0
                    ? "Músculos seleccionados"
                    : "Seleccionar músculos adicionales"}
                </Text>
              </View>
              <Icon name="arrow-drop-down" size={24} color="#6B7280" />
            </TouchableOpacity>

            {otherMuscleIds.length > 0 && (
              <View style={styles.selectedMusclesContainer}>
                {otherMuscleIds.map((muscleId) => {
                  const muscle = muscleOptions.find((m) => m.id === muscleId);
                  if (!muscle) return null;

                  return (
                    <View key={muscleId} style={styles.muscleTag}>
                      {/* 🔥 Renderizar imagen en el tag */}
                      {renderOptionImage(muscle, "small")}
                      <Text style={styles.muscleTagText}>{muscle.name}</Text>
                      <TouchableOpacity
                        onPress={() => removeMuscle(muscleId)}
                        style={styles.muscleTagRemove}
                      >
                        <Icon name="close" size={14} color="#6C3BAA" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* BOTÓN GUARDAR */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              isSaveDisabled && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaveDisabled}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Crear ejercicio</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* MODALES */}
        {renderSelectionModal(
          showTypeModal,
          "Tipo de ejercicio",
          exerciseTypeOptions,
          typeId,
          setTypeId,
          () => setShowTypeModal(false)
        )}

        {renderSelectionModal(
          showEquipmentModal,
          "Equipamiento",
          equipmentOptions,
          equipmentId,
          setEquipmentId,
          () => setShowEquipmentModal(false)
        )}

        {renderSelectionModal(
          showPrimaryMuscleModal,
          "Músculo principal",
          muscleOptions,
          primaryMuscleId,
          setPrimaryMuscleId,
          () => setShowPrimaryMuscleModal(false)
        )}

        {renderSelectionModal(
          showSecondaryMusclesModal,
          "Músculos secundarios",
          muscleOptions,
          "",
          () => {},
          () => setShowSecondaryMusclesModal(false),
          true,
          otherMuscleIds
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: RFValue(15),
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imageContainer: {
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    overflow: "hidden",
    alignSelf: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  imageOverlayText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: RFValue(14),
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imagePlaceholderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imagePlaceholderText: {
    fontSize: RFValue(14),
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
  },
  selector: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectorContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  selectorText: {
    fontSize: RFValue(15),
    color: "#1F2937",
    fontWeight: "500",
  },
  selectorPlaceholder: {
    fontSize: RFValue(15),
    color: "#9CA3AF",
  },
  selectedMusclesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  muscleTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    gap: 6,
  },
  muscleTagText: {
    fontSize: RFValue(13),
    color: "#7C3AED",
    fontWeight: "600",
  },
  muscleTagRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  footer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  saveButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#6C3BAA",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  saveButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: RFValue(16),
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: RFValue(18),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    color: "#1F2937",
    paddingHorizontal: 20,
  },
  optionsList: {
    maxHeight: 400,
  },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionButtonSelected: {
    backgroundColor: "#F3F4FF",
    borderColor: "#6C3BAA",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  optionText: {
    fontSize: RFValue(15),
    color: "#6B7280",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#6C3BAA",
    fontWeight: "600",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6C3BAA",
    justifyContent: "center",
    alignItems: "center",
  },
  modalActions: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalConfirmButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontSize: RFValue(16),
    fontWeight: "600",
  },
});
