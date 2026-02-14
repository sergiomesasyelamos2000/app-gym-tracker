import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import CachedExerciseImage from "../../../components/CachedExerciseImage";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  ExerciseRequestDto,
  RoutineExerciseResponseDto,
  SetRequestDto,
} from "../../../models";
import { updateRoutineOffline } from "../../../services/offlineRoutineService";
import {
  CaughtError,
  getErrorMessage,
  getErrorStatusCode,
} from "../../../types";
import ExerciseCard from "../components/ExerciseCard/ExerciseCard";
import { getRoutineById } from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";

export default function RoutineEditScreen() {
  const { theme, isDark } = useTheme();
  const route = useRoute<RouteProp<WorkoutStackParamList, "RoutineEdit">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<WorkoutStackParamList>>();
  const { id, title, exercises, replaceExerciseId, replacementExercise, addExercises } =
    route.params;
  const [editTitle, setEditTitle] = React.useState(title);

  const styles = React.useMemo(
    () => createStyles(theme, isDark),
    [theme, isDark]
  );
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
  const [supersets, setSupersets] = useState<{ [key: string]: string }>({});
  const [reorderFromButton, setReorderFromButton] = useState(false);
  const [tempExercisesOrder, setTempExercisesOrder] = useState<
    ExerciseRequestDto[]
  >([]);

  useEffect(() => {
    const fetchRoutine = async () => {
      if (id) {
        try {
          const data = await getRoutineById(id);

          const exercises: ExerciseRequestDto[] = Array.isArray(
            data.routineExercises
          )
            ? data.routineExercises.map((re: RoutineExerciseResponseDto) => ({
                ...re.exercise,
                sets: re.sets || [],
                notes: re.notes,
                restSeconds: re.restSeconds,
                weightUnit: re.weightUnit || "kg", // Quitar re.exercise.weightUnit ya que no existe
                repsType: re.repsType || "reps", // Quitar re.exercise.repsType ya que no existe
                supersetWith: re.supersetWith ?? undefined, // Convertir null a undefined
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

            if (exercise.supersetWith) {
              initialSupersets[exercise.id] = exercise.supersetWith;
            }
          });

          setSets(initialSets);
          setSupersets(initialSupersets);
        } catch (error: CaughtError) {
          console.error("[RoutineEdit] Failed to load routine:", error);
          const message = getErrorMessage(error);
          Alert.alert(
            "Error",
            message || "No se pudo cargar la rutina. Verifica tu conexión."
          );
          navigation.goBack();
        }
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
    const initialSupersets: { [key: string]: string } = {};

    (exercises || []).forEach((exercise) => {
      initial[exercise.id] = exercise.sets || [];
      if (exercise.supersetWith) {
        initialSupersets[exercise.id] = exercise.supersetWith;
      }
    });

    setSets(initial);
    setSupersets(initialSupersets);
  }, [title, exercises]);

  useEffect(() => {
    if (!replaceExerciseId || !replacementExercise) return;

    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === replaceExerciseId
          ? {
              ...replacementExercise,
              sets: sets[replaceExerciseId] || [],
              notes: ex.notes,
              restSeconds: ex.restSeconds,
              weightUnit: ex.weightUnit,
              repsType: ex.repsType,
            }
          : ex
      )
    );

    setSets((prev) => {
      const newSets = { ...prev };
      newSets[replacementExercise.id] = prev[replaceExerciseId] || [];
      delete newSets[replaceExerciseId];
      return newSets;
    });

    if (supersets[replaceExerciseId]) {
      setSupersets((prev) => {
        const newSupersets = { ...prev };
        const partnerExerciseId = prev[replaceExerciseId];

        newSupersets[replacementExercise.id] = partnerExerciseId;

        if (
          partnerExerciseId &&
          newSupersets[partnerExerciseId] === replaceExerciseId
        ) {
          newSupersets[partnerExerciseId] = replacementExercise.id;
        }

        delete newSupersets[replaceExerciseId];
        return newSupersets;
      });
    }

    navigation.setParams({
      replaceExerciseId: undefined,
      replacementExercise: undefined,
    });
  }, [replaceExerciseId, replacementExercise, navigation, sets, supersets]);

  useEffect(() => {
    if (!addExercises || addExercises.length === 0) return;

    setExercises((prev) => {
      const newExercises = addExercises.filter(
        (ex) => !prev.some((p) => p.id === ex.id)
      );
      return [...prev, ...newExercises];
    });

    navigation.setParams({ addExercises: undefined });
  }, [addExercises, navigation]);

  const handleUpdate = async () => {
    try {
      const routineToUpdate = {
        id: id,
        title: editTitle || "Sin título", // Asegurar que title no sea undefined
        createdAt: new Date(), // Agregar createdAt requerido por RoutineRequestDto
        exercises: exercisesState.map((exercise, index) => ({
          ...exercise,
          sets: sets[exercise.id] || [],
          weightUnit: exercise.weightUnit || "kg",
          repsType: exercise.repsType || "reps",
          order: index + 1,
          supersetWith: supersets[exercise.id] || undefined, // undefined en lugar de null
        })),
      };

      // Use offline-first update
      const updatedRoutine = await updateRoutineOffline(
        routineToUpdate.id,
        routineToUpdate
      );

      // Check if saved offline or online
      const isPending = (updatedRoutine as any)._isPending;
      const message = isPending
        ? "Rutina actualizada localmente. Se sincronizará cuando haya conexión."
        : "Rutina actualizada exitosamente";

      Alert.alert("¡Éxito!", message);
      navigation.reset({
        index: 1,
        routes: [
          { name: "WorkoutList" },
          { name: "RoutineDetail", params: { routine: updatedRoutine } },
        ],
      });
    } catch (error: CaughtError) {
      console.error("Error al actualizar la rutina:", error);

      const statusCode = getErrorStatusCode(error);
      const message = getErrorMessage(error);

      let errorMessage =
        "Error al actualizar la rutina. Por favor intenta de nuevo.";

      if (statusCode === 401) {
        errorMessage =
          "Tu sesión ha expirado. Por favor inicia sesión nuevamente.";
      } else if (message.toLowerCase().includes("network")) {
        errorMessage =
          "Sin conexión a internet. La rutina se guardará cuando te conectes.";
      } else if (message) {
        errorMessage = message;
      }

      Alert.alert("Error", errorMessage);
    }
  };

  const handleReorderComplete = (data: ExerciseRequestDto[]) => {
    if (reorderFromButton) {
      setTempExercisesOrder(data);
    } else {
      setExercises(data);
      setReorderMode(false);
    }
  };

  const handleExerciseLongPress = (drag: () => void) => {
    setReorderMode(true);
    setReorderFromButton(false);
    setTimeout(() => {
      drag();
    }, 100);
  };

  const handleReorderFromHeader = () => {
    setReorderMode(true);
    setReorderFromButton(true);
    setTempExercisesOrder(exercisesState);
  };

  const handleConfirmReorder = () => {
    setExercises(tempExercisesOrder);
    setReorderMode(false);
    setReorderFromButton(false);
    setTempExercisesOrder([]);
  };

  const handleReplaceExercise = (exerciseId: string) => {
    navigation.navigate("ExerciseList", {
      routineId: id,
      singleSelection: true,
      mode: "replaceExercise",
      replaceExerciseId: exerciseId,
    });
  };

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
            setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));

            setSets((prev) => {
              const newSets = { ...prev };
              delete newSets[exerciseId];
              return newSets;
            });

            // 🔥 Eliminar superseries relacionadas
            setSupersets((prev) => {
              const newSupersets = { ...prev };
              const partnerExerciseId = newSupersets[exerciseId];

              delete newSupersets[exerciseId];

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

  // 🔥 FUNCIÓN PARA AGREGAR SUPERSERIE
  const handleAddSuperset = (exerciseId: string, targetExerciseId: string) => {
    setSupersets((prev) => ({
      ...prev,
      [exerciseId]: targetExerciseId,
      [targetExerciseId]: exerciseId,
    }));

    Alert.alert(
      "Superserie creada",
      "Los ejercicios se han vinculado correctamente"
    );
  };

  // 🔥 FUNCIÓN PARA ELIMINAR SUPERSERIE
  const handleRemoveSuperset = (exerciseId: string) => {
    const targetExerciseId = supersets[exerciseId];

    if (!targetExerciseId) {
      return;
    }

    const exerciseName =
      exercisesState.find((ex) => ex.id === exerciseId)?.name ||
      "Este ejercicio";
    const targetExerciseName =
      exercisesState.find((ex) => ex.id === targetExerciseId)?.name ||
      "el otro ejercicio";

    Alert.alert(
      "Eliminar superserie",
      `¿Deseas eliminar la superserie entre "${exerciseName}" y "${targetExerciseName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setSupersets((prev) => {
              const newSupersets = { ...prev };
              delete newSupersets[exerciseId];
              delete newSupersets[targetExerciseId];
              return newSupersets;
            });

            Alert.alert(
              "Superserie eliminada",
              "La vinculación ha sido eliminada"
            );
          },
        },
      ]
    );
  };

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
                <Icon
                  name="drag-indicator"
                  size={24}
                  color={theme.textSecondary}
                />
              </View>

              <CachedExerciseImage
                imageUrl={item.imageUrl}
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
        onReorder={handleReorderFromHeader}
        onReplace={() => handleReplaceExercise(item.id)}
        onDelete={() => handleDeleteExercise(item.id)}
        onAddSuperset={(targetId) => handleAddSuperset(item.id, targetId)}
        onRemoveSuperset={() => handleRemoveSuperset(item.id)} // 🔥 PASAR FUNCIÓN
        availableExercises={
          reorderFromButton ? tempExercisesOrder : exercisesState
        }
        supersetWith={supersets[item.id]}
        supersetExerciseName={getSupersetExerciseName(item.id)}
        showOptions={true}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
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

            {reorderMode && reorderFromButton && (
              <View style={styles.reorderButtons}>
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
              <Icon name="info-outline" size={16} color={theme.warning} />
              <Text style={styles.reorderHintText}>
                Arrastra para reordenar. Pulsa "Listo" para guardar los cambios
              </Text>
            </View>
          )}

          {reorderMode && !reorderFromButton && (
            <View style={styles.reorderHint}>
              <Icon name="info-outline" size={16} color={theme.warning} />
              <Text style={styles.reorderHintText}>
                Arrastra para reordenar. Se guardará automáticamente al soltar
              </Text>
            </View>
          )}

          {!reorderMode && (
            <View
              style={[
                styles.normalHint,
                {
                  backgroundColor: theme.card,
                  shadowColor: theme.shadowColor,
                  borderWidth: isDark ? 1 : 0,
                  borderColor: theme.border,
                },
              ]}
            >
              <Icon name="touch-app" size={16} color={theme.info} />
              <Text style={styles.normalHintText}>
                Usa las opciones de cada ejercicio para editarlos
              </Text>
            </View>
          )}
        </View>

        <View style={styles.listContainer}>
          <DraggableFlatList
            data={reorderFromButton ? tempExercisesOrder : exercisesState}
            keyExtractor={(item) => item.id}
            renderItem={renderExerciseCard}
            onDragBegin={() => {
              setIsDragging(true);
            }}
            onDragEnd={({ data }) => {
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

        <View style={styles.footerSection}>
          {!reorderMode && (
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => {
                navigation.navigate("ExerciseList", {
                  routineId: id,
                  mode: "addToRoutine",
                });
              }}
            >
              <Icon
                name="add-circle-outline"
                size={20}
                color={theme.textSecondary}
              />
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

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.card,
    },
    headerSection: {
      paddingTop: 12,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    titleInput: {
      backgroundColor: theme.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: RFValue(16),
      color: theme.text,
      marginBottom: 16,
      marginHorizontal: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.border,
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
      color: theme.text,
    },
    reorderButtons: {
      flexDirection: "row",
      gap: 8,
    },
    doneButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.success,
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
      backgroundColor: theme.backgroundSecondary,
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: theme.warning,
      gap: 8,
    },
    reorderHintText: {
      flex: 1,
      fontSize: RFValue(12),
      color: theme.textSecondary,
      fontWeight: "500",
    },
    normalHint: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.backgroundSecondary,
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: theme.info,
      gap: 8,
    },
    normalHintText: {
      flex: 1,
      fontSize: RFValue(12),
      color: theme.textSecondary,
      fontWeight: "500",
    },
    listContainer: {
      flex: 1,
      backgroundColor: theme.card,
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
      backgroundColor: theme.card,
      marginVertical: 6,
      padding: 12,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.border,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    reorderCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.backgroundSecondary,
      elevation: 8,
      shadowColor: theme.primary,
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
      backgroundColor: theme.backgroundSecondary,
    },
    reorderInfo: {
      flex: 1,
      justifyContent: "center",
    },
    reorderName: {
      fontSize: RFValue(15),
      fontWeight: "600",
      color: theme.text,
      lineHeight: RFValue(20),
    },
    footerSection: {
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 12,
      paddingBottom: 20,
    },
    addExerciseButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.backgroundSecondary,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginHorizontal: 16,
      marginBottom: 12,
      gap: 8,
    },
    addExerciseButtonText: {
      color: theme.textSecondary,
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
      borderColor: theme.border,
      flex: 1,
    },
    cancelText: {
      color: theme.textSecondary,
      fontWeight: "600",
      fontSize: RFValue(16),
    },
    updateButton: {
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: "center",
      flex: 1,
    },
    updateButtonDisabled: {
      backgroundColor: theme.border,
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
