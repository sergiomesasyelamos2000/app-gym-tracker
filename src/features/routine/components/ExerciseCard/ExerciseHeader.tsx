import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { Portal } from "react-native-paper";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import CachedExerciseImage from "../../../../components/CachedExerciseImage";
import { useTheme } from "../../../../contexts/ThemeContext";
import { ExerciseRequestDto } from "../../../../models";

interface Props {
  exercise: ExerciseRequestDto;
  readonly?: boolean;
  onReorder?: () => void;
  onReplace?: () => void;
  onDelete?: () => void;
  onAddSuperset?: (targetExerciseId: string) => void;
  onRemoveSuperset?: () => void;
  availableExercises?: ExerciseRequestDto[];
  showOptions?: boolean;
  hasSuperset?: boolean;
}

const ExerciseHeader = ({
  exercise,
  readonly = false,
  onReorder,
  onReplace,
  onDelete,
  onAddSuperset,
  onRemoveSuperset,
  availableExercises = [],
  showOptions = false,
  hasSuperset = false,
}: Props) => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [isSupersetModalVisible, setSupersetModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleImagePress = () => {
    navigation.navigate("ExerciseDetail", { exercise });
  };

  const openExerciseOptions = () => {
    setActionModalVisible(true);
  };

  const closeExerciseOptions = () => {
    setActionModalVisible(false);
  };

  const handleExerciseAction = (
    action: "reorder" | "replace" | "superset" | "delete"
  ) => {
    setPendingAction(action);
    setActionModalVisible(false);
  };

  const handleActionModalHide = () => {
    if (!pendingAction) return;

    const action = pendingAction;
    setPendingAction(null);

    switch (action) {
      case "reorder":
        onReorder?.();
        break;
      case "replace":
        onReplace?.();
        break;
      case "superset":
        setSupersetModalVisible(true);
        break;
      case "delete":
        onDelete?.();
        break;
    }
  };

  const handleSelectSupersetExercise = (targetExercise: ExerciseRequestDto) => {
    onAddSuperset?.(targetExercise.id);
    setSupersetModalVisible(false);
  };

  const filteredExercises = availableExercises.filter(
    (ex) => ex.id !== exercise.id
  );

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleImagePress} activeOpacity={0.8}>
          <CachedExerciseImage
            imageUrl={exercise.imageUrl}
            style={styles.exerciseImage}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {exercise.name}
          </Text>
        </View>

        {/* 🔥 CAMBIO: Solo mostrar si showOptions es true Y no es readonly */}
        {showOptions && !readonly && (
          <TouchableOpacity
            testID="exercise-options-button"
            onPress={openExerciseOptions}
          >
            <Icon name="more-vert" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
      </View>

      <Portal>
        {/* Modal de opciones del ejercicio */}
        <Modal
          isVisible={isActionModalVisible}
          onBackdropPress={closeExerciseOptions}
          onSwipeComplete={closeExerciseOptions}
          swipeDirection="down"
          style={styles.modalContainer}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          onModalHide={handleActionModalHide}
          backdropColor={theme.shadowColor}
          backdropOpacity={0.5}
          backdropTransitionOutTiming={0}
          useNativeDriver
          hideModalContentWhileAnimating
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Opciones de ejercicio</Text>
              <TouchableOpacity onPress={closeExerciseOptions}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleExerciseAction("reorder")}
            >
              <View style={styles.modalOptionLeft}>
                <Icon name="swap-vert" size={24} color={theme.primary} />
                <Text style={styles.modalOptionText}>Reordenar ejercicios</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleExerciseAction("replace")}
            >
              <View style={styles.modalOptionLeft}>
                <Icon name="sync" size={24} color={theme.primary} />
                <Text style={styles.modalOptionText}>Reemplazar ejercicio</Text>
              </View>
            </TouchableOpacity>

            {hasSuperset ? (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setActionModalVisible(false);
                  onRemoveSuperset?.();
                }}
              >
                <View style={styles.modalOptionLeft}>
                  <Icon name="link-off" size={24} color={theme.error} />
                  <Text
                    style={[styles.modalOptionText, { color: theme.error }]}
                  >
                    Eliminar superserie
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleExerciseAction("superset")}
              >
                <View style={styles.modalOptionLeft}>
                  <Icon name="link" size={24} color={theme.primary} />
                  <Text style={styles.modalOptionText}>
                    Agregar a superserie
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleExerciseAction("delete")}
            >
              <View style={styles.modalOptionLeft}>
                <Icon name="delete" size={24} color={theme.error} />
                <Text style={[styles.modalOptionText, { color: theme.error }]}>
                  Eliminar ejercicio
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Modal de superseries */}
        <Modal
          isVisible={isSupersetModalVisible}
          onBackdropPress={() => setSupersetModalVisible(false)}
          onSwipeComplete={() => setSupersetModalVisible(false)}
          swipeDirection="down"
          style={styles.modalContainer}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          backdropColor={theme.shadowColor}
          backdropOpacity={0.5}
          backdropTransitionOutTiming={0}
          useNativeDriver
          hideModalContentWhileAnimating
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Superserie de {exercise.name} con...
              </Text>
              <TouchableOpacity onPress={() => setSupersetModalVisible(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Selecciona el ejercicio con el que deseas hacer superserie
            </Text>

            {filteredExercises.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon
                  name="fitness-center"
                  size={48}
                  color={theme.textTertiary}
                />
                <Text
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  No hay otros ejercicios en esta rutina
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.supersetList}>
                {filteredExercises.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.supersetItem,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => handleSelectSupersetExercise(item)}
                  >
                    <CachedExerciseImage
                      imageUrl={item.imageUrl}
                      style={[
                        styles.supersetImage,
                        { backgroundColor: theme.border },
                      ]}
                    />
                    <Text
                      style={[styles.supersetName, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Icon
                      name="chevron-right"
                      size={24}
                      color={theme.textTertiary}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </Modal>
      </Portal>
    </>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    titleContainer: {
      flex: 1,
      paddingVertical: 8,
    },
    title: {
      fontSize: RFValue(22),
      fontWeight: "600",
      flexShrink: 1,
      maxWidth: 180,
    },
    exerciseImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      marginRight: 12,
    },
    modalContainer: {
      justifyContent: "flex-end",
      margin: 0,
    },
    modalContent: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 30,
      maxHeight: "70%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: RFValue(18),
      fontWeight: "700",
      color: theme.text,
      flex: 1,
    },
    modalSubtitle: {
      fontSize: RFValue(14),
      color: theme.textSecondary,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    modalOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.backgroundSecondary,
    },
    modalOptionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    modalOptionText: {
      fontSize: RFValue(15),
      fontWeight: "600",
      color: theme.text,
    },
    supersetList: {
      maxHeight: 400,
    },
    supersetItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
    },
    supersetImage: {
      width: 48,
      height: 48,
      borderRadius: 8,
      marginRight: 12,
    },
    supersetName: {
      flex: 1,
      fontSize: RFValue(15),
      fontWeight: "600",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: RFValue(14),
      marginTop: 12,
      textAlign: "center",
    },
  });

export default ExerciseHeader;
