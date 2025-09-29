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
import {
  createExercise,
  fetchEquipment,
  fetchExerciseTypes,
  fetchMuscles,
} from "../../../services/exerciseService";
import { WorkoutStackParamList } from "./WorkoutStack";
import { ExerciseRequestDto } from "../../../models";

interface CustomDropdownProps {
  value: string; // Ahora será el ID
  onValueChange: (value: string) => void;
  options: { id: string; name: string; image?: string; imagePath?: string }[];
  placeholder: string;
}

interface CreateExerciseRouteProps {
  onExerciseCreated?: (exercise: ExerciseRequestDto) => void;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onValueChange,
  options,
  placeholder,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const selectedOption = options.find((opt) => opt.id === value); // Buscar por ID

  const renderOptionImage = (option: any, style?: any) => {
    if (!option) return null;
    if (option.imagePath)
      return (
        <Image
          source={{ uri: option.imagePath }}
          style={style}
          resizeMode="contain"
        />
      );
    if (option.image)
      return (
        <Text style={[{ fontSize: style?.width || 20 }, style]}>
          {option.image}
        </Text>
      );
    return null;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.dropdownSelector}
        onPress={() => setIsVisible(true)}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {renderOptionImage(selectedOption, {
            width: 50,
            height: 50,
            marginRight: 10,
          })}
          <Text
            style={
              selectedOption
                ? styles.dropdownSelectedText
                : styles.dropdownPlaceholderText
            }
          >
            {selectedOption ? selectedOption.name : placeholder}
          </Text>
        </View>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsVisible(false)}>
          <View style={styles.dropdownModalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownModalContent}>
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.id} // Usar ID como key
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        value === item.id && styles.dropdownItemSelected, // Comparar por ID
                      ]}
                      onPress={() => {
                        onValueChange(item.id); // Pasar el ID
                        setIsVisible(false);
                      }}
                    >
                      {renderOptionImage(item, {
                        width: 50,
                        height: 50,
                        marginRight: 12,
                      })}
                      <Text
                        style={
                          value === item.id
                            ? styles.dropdownItemSelectedText
                            : styles.dropdownItemText
                        }
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity
                  style={styles.dropdownCloseButton}
                  onPress={() => setIsVisible(false)}
                >
                  <Text style={styles.dropdownCloseText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default function CreateExerciseScreen() {
  const navigation =
    useNavigation<NavigationProp<WorkoutStackParamList, "CreateExercise">>();
  const route = useRoute();
  const { onExerciseCreated } = route.params as CreateExerciseRouteProps;
  const [name, setName] = useState("");
  const [equipmentId, setEquipmentId] = useState(""); // Cambiar a ID
  const [primaryMuscleId, setPrimaryMuscleId] = useState(""); // Cambiar a ID
  const [otherMuscleIds, setOtherMuscleIds] = useState<string[]>([]); // Cambiar a IDs
  const [typeId, setTypeId] = useState(""); // Cambiar a ID
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showMuscleModal, setShowMuscleModal] = useState(false);

  // Estados para los datos cargados del backend (incluyen ID)
  const [equipmentOptions, setEquipmentOptions] = useState<
    { id: string; name: string; imagePath?: string }[]
  >([]);
  const [muscleOptions, setMuscleOptions] = useState<
    { id: string; name: string; image?: string; imagePath?: string }[]
  >([]);
  const [exerciseTypeOptions, setExerciseTypeOptions] = useState<
    { id: string; name: string; image?: string; imagePath?: string }[]
  >([]);

  const muscleModalRef = useRef<View>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar todos los datos en paralelo
        const [equipmentData, musclesData, exerciseTypesData] =
          await Promise.all([
            fetchEquipment(),
            fetchMuscles(),
            fetchExerciseTypes(),
          ]);

        setEquipmentOptions(equipmentData);
        setMuscleOptions(musclesData);
        setExerciseTypeOptions(exerciseTypesData);

        console.log("Datos cargados exitosamente:");
        console.log("Equipamiento:", equipmentData.length);
        console.log("Músculos:", musclesData.length);
        console.log("Tipos de ejercicio:", exerciseTypesData.length);
      } catch (error) {
        console.error("Error cargando datos:", error);
        alert("Error al cargar los datos. Por favor intenta nuevamente.");
      }
    };

    loadData();
  }, []);

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
      quality: 0.5,
      base64: false,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!name.trim())
      return alert("Por favor ingresa un nombre para el ejercicio");
    if (!primaryMuscleId)
      return alert("Por favor selecciona un grupo muscular primario");

    try {
      let imageBase64: string | undefined;

      if (imageUri) {
        const optimizedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        imageBase64 = await FileSystem.readAsStringAsync(optimizedImage.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Cambia esta línea para capturar el ejercicio creado
      const createdExercise = await createExercise({
        name: name.trim(),
        equipment: equipmentId,
        primaryMuscle: primaryMuscleId,
        otherMuscles: otherMuscleIds,
        type: typeId,
        imageBase64,
      });

      alert("Ejercicio creado correctamente");

      // Si existe el callback, ejecútalo con el ejercicio creado
      if (onExerciseCreated) {
        onExerciseCreated(createdExercise);
      }

      navigation.goBack();
    } catch (error: any) {
      console.error("Error creando ejercicio:", error);
      alert(`Error al crear el ejercicio: ${error.message}`);
    }
  };

  const toggleMuscleSelection = (muscleId: string) =>
    setOtherMuscleIds((prev) =>
      prev.includes(muscleId)
        ? prev.filter((id) => id !== muscleId)
        : [...prev, muscleId]
    );

  const removeMuscle = (muscleId: string) =>
    setOtherMuscleIds((prev) => prev.filter((id) => id !== muscleId));

  const handleMuscleModalBackdrop = (event: any) => {
    if (muscleModalRef.current && event.target === event.currentTarget)
      setShowMuscleModal(false);
  };

  const getMuscleImage = (muscleId: string) => {
    const muscle = muscleOptions.find((m) => m.id === muscleId);
    return muscle ? muscle.image || "💪" : "💪";
  };

  const getMuscleName = (muscleId: string) => {
    const muscle = muscleOptions.find((m) => m.id === muscleId);
    return muscle ? muscle.name : "Desconocido";
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>Crear Ejercicio</Text>

      {/* Imagen */}
      <View style={styles.imageSection}>
        <TouchableOpacity
          style={styles.roundImageContainer}
          onPress={pickImage}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.roundImage} />
          ) : (
            <View style={styles.roundImagePlaceholder}>
              <Text style={styles.roundImagePlaceholderIcon}>+</Text>
              <Text style={styles.roundImagePlaceholderText}>
                Añadir imagen
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {imageUri && (
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setImageUri(null)}
          >
            <Text style={styles.removeImageText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nombre */}
      <Text style={styles.label}>Nombre del ejercicio</Text>
      <TextInput
        style={styles.input}
        placeholder="Ingresa el nombre del ejercicio"
        value={name}
        onChangeText={setName}
        maxLength={100}
      />

      {/* Equipamiento */}
      <Text style={styles.label}>Equipamiento</Text>
      <CustomDropdown
        value={equipmentId}
        onValueChange={setEquipmentId}
        options={equipmentOptions}
        placeholder="Seleccionar equipamiento"
      />

      {/* Grupo muscular primario */}
      <Text style={styles.label}>Grupo Muscular Primario</Text>
      <CustomDropdown
        value={primaryMuscleId}
        onValueChange={setPrimaryMuscleId}
        options={muscleOptions}
        placeholder="Seleccionar grupo muscular"
      />

      {/* Otros músculos */}
      <Text style={styles.label}>Otros músculos (opcional)</Text>
      <TouchableOpacity
        style={styles.muscleSelector}
        onPress={() => setShowMuscleModal(true)}
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
            : `Seleccionados: ${otherMuscleIds.length}`}
        </Text>
      </TouchableOpacity>

      {/* Músculos seleccionados */}
      {otherMuscleIds.length > 0 && (
        <View style={styles.selectedMusclesContainer}>
          {otherMuscleIds.map((muscleId, index) => (
            <View key={muscleId} style={styles.selectedMuscleTag}>
              <Text style={styles.selectedMuscleImage}>
                {getMuscleImage(muscleId)}
              </Text>
              <Text style={styles.selectedMuscleText}>
                {getMuscleName(muscleId)}
              </Text>
              <TouchableOpacity onPress={() => removeMuscle(muscleId)}>
                <Text style={styles.removeMuscleText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Tipo de ejercicio */}
      <Text style={styles.label}>Tipo de ejercicio</Text>
      <CustomDropdown
        value={typeId}
        onValueChange={setTypeId}
        options={exerciseTypeOptions}
        placeholder="Seleccionar tipo de ejercicio"
      />

      {/* Guardar */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Guardar</Text>
      </TouchableOpacity>

      {/* Modal músculos */}
      <Modal
        visible={showMuscleModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMuscleModal(false)}
      >
        <TouchableWithoutFeedback onPress={handleMuscleModalBackdrop}>
          <View style={styles.modalContainer} ref={muscleModalRef}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  Seleccionar otros músculos
                </Text>
                <FlatList
                  data={muscleOptions}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.muscleItem,
                        otherMuscleIds.includes(item.id) &&
                          styles.selectedMuscleItem,
                      ]}
                      onPress={() => toggleMuscleSelection(item.id)}
                    >
                      <Text style={styles.muscleItemImage}>
                        {item.image || "💪"}
                      </Text>
                      <Text
                        style={
                          otherMuscleIds.includes(item.id)
                            ? styles.selectedMuscleItemText
                            : styles.muscleItemText
                        }
                      >
                        {item.name}
                      </Text>
                      {otherMuscleIds.includes(item.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.muscleList}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowMuscleModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={() => setShowMuscleModal(false)}
                  >
                    <Text style={styles.modalConfirmText}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  contentContainer: {
    padding: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  roundImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e1e5e9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#c8d0d9",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  roundImage: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  roundImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  roundImagePlaceholderIcon: {
    fontSize: 32,
    color: "#6b7280",
    marginBottom: 4,
  },
  roundImagePlaceholderText: {
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
  },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: 35,
    backgroundColor: "#ff4444",
    width: 25,
    height: 25,
    borderRadius: 12.5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  removeImageText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151",
    alignSelf: "stretch",
    marginLeft: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignSelf: "stretch",
    marginHorizontal: 16,
  },
  dropdownSelector: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 50,
    alignSelf: "stretch",
    marginHorizontal: 16,
  },
  dropdownSelected: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownImage: {
    fontSize: 20,
    marginRight: 10,
  },
  dropdownSelectedText: {
    color: "#374151",
    fontSize: 16,
    flex: 1,
  },
  dropdownPlaceholderText: {
    color: "#9ca3af",
    fontSize: 16,
    flex: 1,
  },
  dropdownArrow: {
    color: "#6b7280",
    fontSize: 12,
  },
  dropdownModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "70%",
  },
  dropdownModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemImage: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  dropdownItemSelected: {
    backgroundColor: "#6C3BAA20",
  },
  dropdownItemText: {
    color: "#374151",
    flex: 1,
  },
  dropdownItemSelectedText: {
    color: "#6C3BAA",
    fontWeight: "600",
    flex: 1,
  },
  dropdownCloseButton: {
    backgroundColor: "#6b7280",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  dropdownCloseText: {
    color: "#fff",
    fontWeight: "bold",
  },
  muscleSelector: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    minHeight: 50,
    justifyContent: "center",
    alignSelf: "stretch",
    marginHorizontal: 16,
  },
  placeholderText: {
    color: "#9ca3af",
  },
  selectedText: {
    color: "#374151",
  },
  selectedMusclesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
    alignSelf: "stretch",
    marginHorizontal: 16,
  },
  selectedMuscleTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6C3BAA20",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#6C3BAA",
  },
  selectedMuscleImage: {
    fontSize: 14,
    marginRight: 6,
  },
  selectedMuscleText: {
    color: "#6C3BAA",
    fontSize: 14,
    marginRight: 8,
  },
  removeMuscleText: {
    color: "#6C3BAA",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#6C3BAA",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
    alignSelf: "stretch",
    marginHorizontal: 16,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  muscleList: {
    maxHeight: 400,
  },
  muscleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  muscleItemImage: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  muscleItemText: {
    color: "#374151",
    flex: 1,
  },
  selectedMuscleItem: {
    backgroundColor: "#6C3BAA20",
  },
  selectedMuscleItemText: {
    color: "#6C3BAA",
    fontWeight: "600",
    flex: 1,
  },
  checkmark: {
    color: "#6C3BAA",
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#6b7280",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: "#6C3BAA",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontWeight: "bold",
  },
  dropdownItemWithoutImage: {
    paddingLeft: 20,
  },
  dropdownTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
});
