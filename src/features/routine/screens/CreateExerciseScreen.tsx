// ==================== TYPES ====================
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
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { ExerciseRequestDto } from "../../../models";
import {
  createExercise,
  fetchEquipment,
  fetchExerciseTypes,
  fetchMuscles,
} from "../../../services/exerciseService";
import { WorkoutStackParamList } from "./WorkoutStack";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CustomDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  placeholder: string;
}

interface DropdownOption {
  id: string;
  name: string;
  image?: string;
  imagePath?: string;
}

interface CreateExerciseRouteProps {
  onExerciseCreated?: (exercise: ExerciseRequestDto) => void;
}

// ==================== CUSTOM DROPDOWN COMPONENT ====================
const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onValueChange,
  options,
  placeholder,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const selectedOption = options.find((opt) => opt.id === value);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isVisible, fadeAnim]);

  const renderOptionImage = (
    option: DropdownOption | undefined,
    imageStyle?: any
  ) => {
    if (!option) return null;

    if (option.imagePath) {
      return (
        <Image
          source={{ uri: option.imagePath }}
          style={imageStyle}
          resizeMode="contain"
        />
      );
    }

    if (option.image) {
      return (
        <Text style={[{ fontSize: imageStyle?.width || 20 }, imageStyle]}>
          {option.image}
        </Text>
      );
    }

    return null;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.dropdownSelector}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.dropdownContent}>
          {renderOptionImage(selectedOption, {
            width: 32,
            height: 32,
            marginRight: 12,
          })}
          <Text
            style={
              selectedOption
                ? styles.dropdownSelectedText
                : styles.dropdownPlaceholderText
            }
            numberOfLines={1}
          >
            {selectedOption ? selectedOption.name : placeholder}
          </Text>
        </View>
        <View style={styles.dropdownArrowContainer}>
          <Text style={styles.dropdownArrow}>⌄</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsVisible(false)}>
          <Animated.View
            style={[styles.dropdownModalContainer, { opacity: fadeAnim }]}
          >
            <TouchableWithoutFeedback>
              <View style={styles.dropdownModalContent}>
                <Text style={styles.dropdownModalTitle}>{placeholder}</Text>
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        value === item.id && styles.dropdownItemSelected,
                      ]}
                      onPress={() => {
                        onValueChange(item.id);
                        setIsVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      {renderOptionImage(item, {
                        width: 36,
                        height: 36,
                        marginRight: 12,
                      })}
                      <Text
                        style={
                          value === item.id
                            ? styles.dropdownItemSelectedText
                            : styles.dropdownItemText
                        }
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {value === item.id && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity
                  style={styles.dropdownCloseButton}
                  onPress={() => setIsVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownCloseText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

// ==================== IMAGE PICKER COMPONENT ====================
interface ExerciseImagePickerProps {
  imageUri: string | null;
  onImagePick: () => void;
}

const ExerciseImagePicker: React.FC<ExerciseImagePickerProps> = ({
  imageUri,
  onImagePick,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Imagen del ejercicio</Text>
    <TouchableOpacity
      style={styles.imageContainer}
      onPress={onImagePick}
      activeOpacity={0.8}
    >
      {imageUri ? (
        <>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageOverlayText}>Cambiar imagen</Text>
          </View>
        </>
      ) : (
        <View style={styles.imagePlaceholder}>
          <View style={styles.imagePlaceholderIcon}>
            <Text style={styles.imagePlaceholderIconText}>📷</Text>
          </View>
          <Text style={styles.imagePlaceholderText}>
            Toca para agregar una imagen
          </Text>
          <Text style={styles.imagePlaceholderSubtext}>Recomendado: 1:1</Text>
        </View>
      )}
    </TouchableOpacity>
  </View>
);

// ==================== BASIC INFO SECTION ====================
interface BasicInfoSectionProps {
  name: string;
  onNameChange: (name: string) => void;
  typeId: string;
  onTypeChange: (typeId: string) => void;
  exerciseTypeOptions: DropdownOption[];
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  name,
  onNameChange,
  typeId,
  onTypeChange,
  exerciseTypeOptions,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Información básica</Text>

    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Nombre del ejercicio</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Press de banca con barra"
        placeholderTextColor="#94A3B8"
        value={name}
        onChangeText={onNameChange}
        maxLength={100}
      />
    </View>

    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Tipo de ejercicio</Text>
      <CustomDropdown
        value={typeId}
        onValueChange={onTypeChange}
        options={exerciseTypeOptions}
        placeholder="Selecciona el tipo"
      />
    </View>
  </View>
);

// ==================== MUSCLE TAG COMPONENT ====================
interface MuscleTagProps {
  muscleId: string;
  muscleName: string;
  muscleImage: string;
  onRemove: (muscleId: string) => void;
}

const MuscleTag: React.FC<MuscleTagProps> = ({
  muscleId,
  muscleName,
  muscleImage,
  onRemove,
}) => (
  <View style={styles.selectedMuscleTag}>
    <Text style={styles.selectedMuscleImage}>{muscleImage}</Text>
    <Text style={styles.selectedMuscleText}>{muscleName}</Text>
    <TouchableOpacity
      onPress={() => onRemove(muscleId)}
      style={styles.removeMuscleButton}
    >
      <Text style={styles.removeMuscleText}>×</Text>
    </TouchableOpacity>
  </View>
);

// ==================== SPECIFICATIONS SECTION ====================
interface SpecificationsSectionProps {
  equipmentId: string;
  onEquipmentChange: (id: string) => void;
  equipmentOptions: DropdownOption[];
  primaryMuscleId: string;
  onPrimaryMuscleChange: (id: string) => void;
  muscleOptions: DropdownOption[];
  otherMuscleIds: string[];
  onOpenMuscleModal: () => void;
  onRemoveMuscle: (muscleId: string) => void;
}

const SpecificationsSection: React.FC<SpecificationsSectionProps> = ({
  equipmentId,
  onEquipmentChange,
  equipmentOptions,
  primaryMuscleId,
  onPrimaryMuscleChange,
  muscleOptions,
  otherMuscleIds,
  onOpenMuscleModal,
  onRemoveMuscle,
}) => {
  const getMuscleDetails = (muscleId: string) => {
    const muscle = muscleOptions.find((m) => m.id === muscleId);
    return {
      name: muscle?.name || "Desconocido",
      image: muscle?.image || "💪",
    };
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Especificaciones</Text>

      <View style={styles.row}>
        <View style={[styles.inputContainer, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Equipamiento</Text>
          <CustomDropdown
            value={equipmentId}
            onValueChange={onEquipmentChange}
            options={equipmentOptions}
            placeholder="Seleccionar"
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Músculo principal</Text>
        <CustomDropdown
          value={primaryMuscleId}
          onValueChange={onPrimaryMuscleChange}
          options={muscleOptions}
          placeholder="Selecciona el músculo"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          Músculos secundarios{" "}
          {otherMuscleIds.length > 0 && `(${otherMuscleIds.length})`}
        </Text>
        <TouchableOpacity
          style={styles.muscleSelector}
          onPress={onOpenMuscleModal}
          activeOpacity={0.7}
        >
          <Text
            style={
              otherMuscleIds.length === 0
                ? styles.placeholderText
                : styles.selectedText
            }
          >
            {otherMuscleIds.length === 0
              ? "Seleccionar músculos adicionales"
              : "Músculos seleccionados"}
          </Text>
          <View style={styles.selectorArrow}>
            <Text style={styles.selectorArrowText}>⌄</Text>
          </View>
        </TouchableOpacity>
      </View>

      {otherMuscleIds.length > 0 && (
        <View style={styles.selectedMusclesContainer}>
          {otherMuscleIds.map((muscleId) => {
            const { name, image } = getMuscleDetails(muscleId);
            return (
              <MuscleTag
                key={muscleId}
                muscleId={muscleId}
                muscleName={name}
                muscleImage={image}
                onRemove={onRemoveMuscle}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

// ==================== MUSCLE MODAL COMPONENT ====================
interface MuscleModalProps {
  visible: boolean;
  onClose: () => void;
  muscleOptions: DropdownOption[];
  selectedMuscleIds: string[];
  onToggleMuscle: (muscleId: string) => void;
}

const MuscleModal: React.FC<MuscleModalProps> = ({
  visible,
  onClose,
  muscleOptions,
  selectedMuscleIds,
  onToggleMuscle,
}) => {
  const muscleModalRef = useRef<View>(null);

  const handleBackdrop = (event: any) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer} ref={muscleModalRef}>
        <TouchableWithoutFeedback onPress={handleBackdrop}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Músculos secundarios</Text>
                <Text style={styles.modalSubtitle}>
                  Selecciona los músculos que también se trabajan
                </Text>
              </View>

              <FlatList
                data={muscleOptions}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.muscleItem,
                      selectedMuscleIds.includes(item.id) &&
                        styles.selectedMuscleItem,
                    ]}
                    onPress={() => onToggleMuscle(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.muscleItemImage}>
                      {item.image || "💪"}
                    </Text>
                    <Text
                      style={
                        selectedMuscleIds.includes(item.id)
                          ? styles.selectedMuscleItemText
                          : styles.muscleItemText
                      }
                    >
                      {item.name}
                    </Text>
                    {selectedMuscleIds.includes(item.id) && (
                      <View style={styles.muscleCheckmark}>
                        <Text style={styles.muscleCheckmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                style={styles.muscleList}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalConfirmText}>
                    Aceptar ({selectedMuscleIds.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

// ==================== MAIN SCREEN COMPONENT ====================
export default function CreateExerciseScreen() {
  const navigation =
    useNavigation<NavigationProp<WorkoutStackParamList, "CreateExercise">>();
  const route = useRoute();
  const { onExerciseCreated } =
    (route.params as CreateExerciseRouteProps) || {};

  // ==================== STATE ====================
  const [name, setName] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [primaryMuscleId, setPrimaryMuscleId] = useState("");
  const [otherMuscleIds, setOtherMuscleIds] = useState<string[]>([]);
  const [typeId, setTypeId] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showMuscleModal, setShowMuscleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [equipmentOptions, setEquipmentOptions] = useState<DropdownOption[]>(
    []
  );
  const [muscleOptions, setMuscleOptions] = useState<DropdownOption[]>([]);
  const [exerciseTypeOptions, setExerciseTypeOptions] = useState<
    DropdownOption[]
  >([]);

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
      console.error("Error cargando datos:", error);
      alert("Error al cargar los datos. Por favor intenta nuevamente.");
    }
  };

  // ==================== IMAGE HANDLING ====================
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      alert("Se necesitan permisos para acceder a la galería");
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
      alert("Por favor ingresa un nombre para el ejercicio");
      return false;
    }

    if (!primaryMuscleId) {
      alert("Por favor selecciona un grupo muscular primario");
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
      console.error("Error creando ejercicio:", error);
      alert(`Error al crear el ejercicio: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== COMPUTED VALUES ====================
  const isSaveDisabled = !name.trim() || !primaryMuscleId || isLoading;

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Completa la información para agregar un ejercicio personalizado
          </Text>
        </View>

        <ExerciseImagePicker imageUri={imageUri} onImagePick={pickImage} />

        <BasicInfoSection
          name={name}
          onNameChange={setName}
          typeId={typeId}
          onTypeChange={setTypeId}
          exerciseTypeOptions={exerciseTypeOptions}
        />

        <SpecificationsSection
          equipmentId={equipmentId}
          onEquipmentChange={setEquipmentId}
          equipmentOptions={equipmentOptions}
          primaryMuscleId={primaryMuscleId}
          onPrimaryMuscleChange={setPrimaryMuscleId}
          muscleOptions={muscleOptions}
          otherMuscleIds={otherMuscleIds}
          onOpenMuscleModal={() => setShowMuscleModal(true)}
          onRemoveMuscle={removeMuscle}
        />

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
            <View style={styles.loadingContainer}>
              <Text style={styles.saveButtonText}>Creando ejercicio...</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Crear ejercicio</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <MuscleModal
        visible={showMuscleModal}
        onClose={() => setShowMuscleModal(false)}
        muscleOptions={muscleOptions}
        selectedMuscleIds={otherMuscleIds}
        onToggleMuscle={toggleMuscleSelection}
      />
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  subtitle: {
    fontSize: RFValue(16),
    color: "#64748B",
    lineHeight: 22,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginTop: 16,
    padding: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  sectionTitle: {
    fontSize: RFValue(18),
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 20,
  },
  imageContainer: {
    width: SCREEN_WIDTH - 96,
    height: SCREEN_WIDTH - 96,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
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
  },
  imageOverlayText: {
    color: "#FFFFFF",
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
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  imagePlaceholderIconText: {
    fontSize: RFValue(28),
  },
  imagePlaceholderText: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    marginBottom: 4,
  },
  imagePlaceholderSubtext: {
    fontSize: RFValue(14),
    color: "#94A3B8",
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: RFValue(16),
    borderWidth: 2,
    borderColor: "#F1F5F9",
    color: "#0F172A",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  dropdownSelector: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 56,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownSelectedText: {
    color: "#0F172A",
    fontSize: RFValue(16),
    fontWeight: "500",
    flex: 1,
  },
  dropdownPlaceholderText: {
    color: "#94A3B8",
    fontSize: RFValue(16),
    flex: 1,
  },
  dropdownArrowContainer: {
    paddingLeft: 8,
  },
  dropdownArrow: {
    color: "#64748B",
    fontSize: RFValue(16),
    fontWeight: "bold",
  },
  dropdownModalContainer: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 0,
    width: "90%",
    maxHeight: "70%",
    overflow: "hidden",
  },
  dropdownModalTitle: {
    fontSize: RFValue(18),
    fontWeight: "bold",
    color: "#0F172A",
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  dropdownItemSelected: {
    backgroundColor: "#6C3BAA08",
  },
  dropdownItemText: {
    color: "#374151",
    fontSize: RFValue(16),
    flex: 1,
  },
  dropdownItemSelectedText: {
    color: "#6C3BAA",
    fontWeight: "600",
    fontSize: RFValue(16),
    flex: 1,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#6C3BAA",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: RFValue(12),
    fontWeight: "bold",
  },
  dropdownCloseButton: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "center",
  },
  dropdownCloseText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: RFValue(16),
  },
  muscleSelector: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 56,
  },
  selectorArrow: {
    marginLeft: 8,
  },
  selectorArrowText: {
    color: "#64748B",
    fontSize: RFValue(16),
    fontWeight: "bold",
  },
  placeholderText: {
    color: "#94A3B8",
    fontSize: RFValue(16),
  },
  selectedText: {
    color: "#0F172A",
    fontSize: RFValue(16),
    fontWeight: "500",
  },
  selectedMusclesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  selectedMuscleTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6C3BAA10",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#6C3BAA30",
  },
  selectedMuscleImage: {
    fontSize: RFValue(14),
    marginRight: 6,
  },
  selectedMuscleText: {
    color: "#6C3BAA",
    fontSize: RFValue(14),
    fontWeight: "500",
    marginRight: 4,
  },
  removeMuscleButton: {
    padding: 4,
  },
  removeMuscleText: {
    color: "#6C3BAA",
    fontSize: RFValue(16),
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#6C3BAA",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    margin: 24,
    marginTop: 32,
    shadowColor: "#6C3BAA",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: RFValue(18),
    fontWeight: "bold",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: RFValue(20),
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: RFValue(14),
    color: "#64748B",
  },
  muscleList: {
    maxHeight: 400,
  },
  muscleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  muscleItemImage: {
    fontSize: RFValue(20),
    marginRight: 16,
    width: 24,
  },
  muscleItemText: {
    color: "#374151",
    fontSize: RFValue(16),
    flex: 1,
  },
  selectedMuscleItem: {
    backgroundColor: "#6C3BAA08",
  },
  selectedMuscleItemText: {
    color: "#6C3BAA",
    fontWeight: "600",
    fontSize: RFValue(16),
    flex: 1,
  },
  muscleCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#6C3BAA",
    justifyContent: "center",
    alignItems: "center",
  },
  muscleCheckmarkText: {
    color: "#FFFFFF",
    fontSize: RFValue(12),
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    padding: 24,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: RFValue(16),
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: "#6C3BAA",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: RFValue(16),
  },
});
