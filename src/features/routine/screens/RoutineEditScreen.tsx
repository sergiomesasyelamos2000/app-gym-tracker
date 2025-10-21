import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Alert,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import { ExerciseRequestDto, SetRequestDto } from "../../../models";
import ExerciseCard from "../components/ExerciseCard/ExerciseCard";
import { getRoutineById, updateRoutineById } from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";

export default function RoutineEditScreen() {
  const route = useRoute();
  const navigation =
    useNavigation<NativeStackNavigationProp<WorkoutStackParamList>>();
  const { id, title, exercises, onUpdate } =
    route.params as WorkoutStackParamList["RoutineEdit"];
  const [editTitle, setEditTitle] = React.useState(title);
  const [exercisesState, setExercises] = useState<ExerciseRequestDto[]>(
    exercises || []
  );
  const [sets, setSets] = useState<{ [exerciseId: string]: SetRequestDto[] }>(
    () => {
      const initial: { [exerciseId: string]: SetRequestDto[] } = {};
      (exercises || []).forEach((exercise) => {
        initial[exercise.id] = exercise.sets || [];
      });
      return initial;
    }
  );
  const [reorderMode, setReorderMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // 🔥 NUEVO: Estado para superseries (ejercicioId -> ejercicioParejaDeSuperserieId)
  const [supersets, setSupersets] = useState<{ [key: string]: string }>({});
  // 🔥 NUEVO: Distinguir entre reorden por long press vs botón
  const [reorderFromButton, setReorderFromButton] = useState(false);
  // 🔥 NUEVO: Estado temporal solo para reorden desde botón
  const [tempExercisesOrder, setTempExercisesOrder] = useState<
    ExerciseRequestDto[]
  >([]);

  useEffect(() => {
    const fetchRoutine = async () => {
      if (id) {
        const data = await getRoutineById(id);
        const exercises: ExerciseRequestDto[] = Array.isArray(
          data.routineExercises
        )
          ? data.routineExercises.map((re: any) => ({
              ...re.exercise,
              sets: re.sets || [],
              notes: re.notes,
              restSeconds: re.restSeconds,
              weightUnit: re.weightUnit || re.exercise.weightUnit || "kg",
              repsType: re.repsType || re.exercise.repsType || "reps",
              supersetWith: re.supersetWith, // 🔥 NUEVO
            }))
          : [];

        setEditTitle(data.title || "");
        setExercises(exercises);

        const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
        const initialSupersets: { [key: string]: string } = {};

        exercises.forEach((exercise) => {
          initialSets[exercise.id] = Array.isArray(exercise.sets)
            ? exercise.sets
            : [];

          // 🔥 NUEVO: Cargar superseries
          if (exercise.supersetWith) {
            initialSupersets[exercise.id] = exercise.supersetWith;
          }
        });

        setSets(initialSets);
        setSupersets(initialSupersets);
      }
    };
    fetchRoutine();
  }, [id]);

  useEffect(() => {
    setEditTitle(title);
    setExercises(
      (exercises || []).map((ex) => ({
        ...ex,
        weightUnit: ex.weightUnit || "kg",
        repsType: ex.repsType || "reps",
      }))
    );

    const initial: { [exerciseId: string]: SetRequestDto[] } = {};
    (exercises || []).forEach((exercise) => {
      initial[exercise.id] = exercise.sets || [];
    });
    setSets(initial);
  }, [title, exercises]);

  const handleUpdate = async () => {
    try {
      const routineToUpdate = {
        id: id,
        title: editTitle,
        exercises: exercisesState.map((exercise, index) => ({
          ...exercise,
          sets: sets[exercise.id] || [],
          weightUnit: exercise.weightUnit || "kg",
          repsType: exercise.repsType || "reps",
          order: index + 1,
          supersetWith: supersets[exercise.id] || null, // 🔥 NUEVO
        })),
      };

      const updatedRoutine = await updateRoutineById(
        routineToUpdate.id,
        routineToUpdate
      );

      alert("Rutina actualizada exitosamente");
      navigation.reset({
        index: 1,
        routes: [
          { name: "WorkoutList" },
          { name: "RoutineDetail", params: { routine: updatedRoutine } },
        ],
      });
    } catch (error) {
      console.error("Error al actualizar la rutina:", error);
      alert("Error al actualizar la rutina");
    }
  };

  const handleReorderComplete = (data: ExerciseRequestDto[]) => {
    if (reorderFromButton) {
      // Modo botón: solo guardar temporalmente
      setTempExercisesOrder(data);
    } else {
      // Modo long press: aplicar inmediatamente y salir del modo
      setExercises(data);
      setReorderMode(false);
    }
  };

  const handleExerciseLongPress = (drag: () => void) => {
    console.log("🎯 Long press detected, activating reorder mode");
    setReorderMode(true);
    setReorderFromButton(false); // Es long press, NO desde botón
    setTimeout(() => {
      drag();
    }, 100);
  };

  // 🔥 Habilitar modo reorden desde el header (con botón "Listo")
  const handleReorderFromHeader = () => {
    setReorderMode(true);
    setReorderFromButton(true); // Es desde botón
    setTempExercisesOrder(exercisesState); // Copiar orden actual
  };

  // 🔥 Confirmar reordenación al pulsar "Listo" (solo para modo botón)
  const handleConfirmReorder = () => {
    setExercises(tempExercisesOrder);
    setReorderMode(false);
    setReorderFromButton(false);
    setTempExercisesOrder([]);
  };

  // 🔥 Cancelar reordenación (solo para modo botón)
  const handleCancelReorder = () => {
    setReorderMode(false);
    setReorderFromButton(false);
    setTempExercisesOrder([]);
  };

  // 🔥 NUEVO: Manejar reemplazo de ejercicio
  const handleReplaceExercise = (exerciseId: string) => {
    navigation.navigate("ExerciseList", {
      routineId: id,
      singleSelection: true, // Indicar que solo se puede seleccionar uno
      onFinishSelection: (selectedExercises: ExerciseRequestDto[]) => {
        if (selectedExercises.length > 0) {
          const newExercise = selectedExercises[0];

          // Reemplazar el ejercicio manteniendo sus sets y configuraciones
          setExercises((prev) =>
            prev.map((ex) =>
              ex.id === exerciseId
                ? {
                    ...newExercise,
                    sets: sets[exerciseId] || [],
                    notes: ex.notes,
                    restSeconds: ex.restSeconds,
                    weightUnit: ex.weightUnit,
                    repsType: ex.repsType,
                  }
                : ex
            )
          );

          // Transferir los sets del ejercicio anterior al nuevo
          setSets((prev) => {
            const newSets = { ...prev };
            newSets[newExercise.id] = prev[exerciseId] || [];
            delete newSets[exerciseId];
            return newSets;
          });

          // Actualizar superseries si existían
          if (supersets[exerciseId]) {
            setSupersets((prev) => {
              const newSupersets = { ...prev };
              const partnerExerciseId = prev[exerciseId];

              // Actualizar la referencia del nuevo ejercicio
              newSupersets[newExercise.id] = partnerExerciseId;

              // Actualizar la referencia del ejercicio pareja
              if (
                partnerExerciseId &&
                newSupersets[partnerExerciseId] === exerciseId
              ) {
                newSupersets[partnerExerciseId] = newExercise.id;
              }

              delete newSupersets[exerciseId];
              return newSupersets;
            });
          }
        }
      },
    });
  };

  // 🔥 NUEVO: Eliminar ejercicio
  const handleDeleteExercise = (exerciseId: string) => {
    const exerciseName =
      exercisesState.find((ex) => ex.id === exerciseId)?.name ||
      "este ejercicio";

    Alert.alert(
      "Eliminar ejercicio",
      `¿Estás seguro de que deseas eliminar "${exerciseName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            // Eliminar el ejercicio
            setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));

            // Limpiar sets
            setSets((prev) => {
              const newSets = { ...prev };
              delete newSets[exerciseId];
              return newSets;
            });

            // Limpiar superseries
            setSupersets((prev) => {
              const newSupersets = { ...prev };
              const partnerExerciseId = newSupersets[exerciseId];

              // Eliminar la referencia del ejercicio eliminado
              delete newSupersets[exerciseId];

              // Eliminar la referencia del ejercicio pareja
              if (partnerExerciseId) {
                delete newSupersets[partnerExerciseId];
              }

              return newSupersets;
            });
          },
        },
      ]
    );
  };

  // 🔥 NUEVO: Agregar superserie
  const handleAddSuperset = (exerciseId: string, targetExerciseId: string) => {
    setSupersets((prev) => ({
      ...prev,
      [exerciseId]: targetExerciseId,
      [targetExerciseId]: exerciseId, // Bidireccional
    }));
  };

  // 🔥 NUEVO: Obtener nombre del ejercicio de superserie
  const getSupersetExerciseName = (exerciseId: string): string | undefined => {
    const supersetId = supersets[exerciseId];
    if (!supersetId) return undefined;

    const exercise = exercisesState.find((ex) => ex.id === supersetId);
    return exercise?.name;
  };

  const renderExerciseCard = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<ExerciseRequestDto>) => {
    // Modo reordenamiento: cards compactas con imagen y título
    if (reorderMode) {
      return (
        <ScaleDecorator>
          <TouchableOpacity
            onLongPress={drag}
            disabled={isActive}
            activeOpacity={1}
            style={[styles.reorderCard, isActive && styles.reorderCardActive]}
          >
            <View style={styles.reorderContent}>
              <View style={styles.dragHandle}>
                <Icon name="drag-indicator" size={24} color="#6B7280" />
              </View>

              <Image
                source={
                  item.imageUrl
                    ? { uri: `data:image/png;base64,${item.imageUrl}` }
                    : require("../../../../assets/not-image.png")
                }
                style={styles.reorderImage}
              />

              <View style={styles.reorderInfo}>
                <Text style={styles.reorderName} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    }

    // Modo normal: cards completas
    return (
      <ExerciseCard
        exercise={item}
        initialSets={sets[item.id] || []}
        onChangeSets={(updatedSets) =>
          setSets((prev) => ({ ...prev, [item.id]: updatedSets }))
        }
        onChangeExercise={(updatedExercise) => {
          setExercises((prev) =>
            prev.map((exercise) =>
              exercise.id === updatedExercise.id ? updatedExercise : exercise
            )
          );
        }}
        onLongPress={() => handleExerciseLongPress(drag)}
        isDragging={isActive}
        // 🔥 Props para las opciones
        onReorder={handleReorderFromHeader}
        onReplace={() => handleReplaceExercise(item.id)}
        onDelete={() => handleDeleteExercise(item.id)}
        onAddSuperset={(targetId) => {
          console.log(
            "🔥 RoutineEditScreen - Adding superset:",
            item.id,
            "->",
            targetId
          );
          handleAddSuperset(item.id, targetId);
        }}
        availableExercises={
          reorderFromButton ? tempExercisesOrder : exercisesState
        }
        supersetWith={supersets[item.id]}
        supersetExerciseName={getSupersetExerciseName(item.id)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <TextInput
            style={styles.titleInput}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Título de la rutina"
            editable={!reorderMode}
          />

          <View style={styles.headerRow}>
            <Text style={styles.subTitle}>Ejercicios asociados</Text>

            {/* 🔥 Botones solo cuando es reorden desde botón */}
            {reorderMode && reorderFromButton && (
              <View style={styles.reorderButtons}>
                <TouchableOpacity
                  style={styles.cancelReorderButton}
                  onPress={handleCancelReorder}
                >
                  <Icon name="close" size={18} color="#EF4444" />
                  <Text style={styles.cancelReorderText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleConfirmReorder}
                >
                  <Icon name="check" size={18} color="#fff" />
                  <Text style={styles.doneButtonText}>Listo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {reorderMode && reorderFromButton && (
            <View style={styles.reorderHint}>
              <Icon name="info-outline" size={16} color="#92400E" />
              <Text style={styles.reorderHintText}>
                Arrastra para reordenar. Pulsa "Listo" para guardar los cambios
              </Text>
            </View>
          )}

          {reorderMode && !reorderFromButton && (
            <View style={styles.reorderHint}>
              <Icon name="info-outline" size={16} color="#92400E" />
              <Text style={styles.reorderHintText}>
                Arrastra para reordenar. Se guardará automáticamente al soltar
              </Text>
            </View>
          )}

          {!reorderMode && (
            <View style={styles.normalHint}>
              <Icon name="touch-app" size={16} color="#1E40AF" />
              <Text style={styles.normalHintText}>
                Usa las opciones de cada ejercicio para editarlos
              </Text>
            </View>
          )}
        </View>

        {/* List Section */}
        <View style={styles.listContainer}>
          <DraggableFlatList
            data={reorderFromButton ? tempExercisesOrder : exercisesState}
            keyExtractor={(item) => item.id}
            renderItem={renderExerciseCard}
            onDragBegin={() => {
              console.log("🔄 Drag begin");
              setIsDragging(true);
            }}
            onDragEnd={({ data }) => {
              console.log("✅ Drag end");
              handleReorderComplete(data);
              setIsDragging(false);
            }}
            contentContainerStyle={styles.listContent}
            activationDistance={0}
            dragHitSlop={{ left: 20, right: 20, top: 15, bottom: 15 }}
            showsVerticalScrollIndicator={true}
            ListFooterComponent={<View style={styles.listFooter} />}
          />
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          {!reorderMode && (
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => {
                navigation.navigate("ExerciseList", {
                  routineId: id,
                  onFinishSelection: (
                    selectedExercises: ExerciseRequestDto[]
                  ) => {
                    setExercises((prev) => {
                      const newExercises = selectedExercises.filter(
                        (ex) => !prev.some((p) => p.id === ex.id)
                      );
                      return [...prev, ...newExercises];
                    });
                  },
                });
              }}
            >
              <Icon name="add-circle-outline" size={20} color="#374151" />
              <Text style={styles.addExerciseButtonText}>Añadir ejercicio</Text>
            </TouchableOpacity>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                reorderMode && styles.buttonDisabled,
              ]}
              onPress={() => navigation.goBack()}
              disabled={reorderMode}
            >
              <Text
                style={[styles.cancelText, reorderMode && styles.textDisabled]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.updateButton,
                reorderMode && styles.updateButtonDisabled,
              ]}
              onPress={handleUpdate}
              disabled={reorderMode}
            >
              <Text style={styles.updateButtonText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerSection: {
    paddingTop: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  titleInput: {
    backgroundColor: "#f4f4f4",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: RFValue(16),
    color: "#333",
    marginBottom: 16,
    marginHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginHorizontal: 16,
  },
  subTitle: {
    fontWeight: "bold",
    fontSize: RFValue(16),
    color: "#111827",
  },
  reorderButtons: {
    flexDirection: "row",
    gap: 8,
  },
  cancelReorderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  cancelReorderText: {
    fontSize: RFValue(13),
    fontWeight: "600",
    color: "#EF4444",
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  doneButtonText: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reorderHint: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    gap: 8,
  },
  reorderHintText: {
    flex: 1,
    fontSize: RFValue(12),
    color: "#92400E",
    fontWeight: "500",
  },
  normalHint: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
    gap: 8,
  },
  normalHintText: {
    flex: 1,
    fontSize: RFValue(12),
    color: "#1E40AF",
    fontWeight: "500",
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  listFooter: {
    height: 20,
  },
  reorderCard: {
    backgroundColor: "#FFFFFF",
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  reorderCardActive: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
    elevation: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    transform: [{ scale: 1.02 }],
  },
  reorderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dragHandle: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reorderImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#F3F4F6",
  },
  reorderInfo: {
    flex: 1,
    justifyContent: "center",
  },
  reorderName: {
    fontSize: RFValue(15),
    fontWeight: "600",
    color: "#111827",
    lineHeight: RFValue(20),
  },
  footerSection: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
    paddingBottom: 20,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  addExerciseButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: RFValue(16),
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    flex: 1,
  },
  cancelText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: RFValue(16),
  },
  updateButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  updateButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: RFValue(16),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    opacity: 0.4,
  },
});
