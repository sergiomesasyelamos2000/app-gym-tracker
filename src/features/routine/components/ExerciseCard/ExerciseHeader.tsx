import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Image,
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
import { ExerciseRequestDto } from "../../../../models";
import { useTheme } from "../../../../contexts/ThemeContext";

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
          <Image
            source={
              exercise.imageUrl
                ? { uri: `data:image/png;base64,${exercise.imageUrl}` }
                : require("./../../../../../assets/not-image.png")
            }
            style={styles.exerciseImage}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={3} ellipsizeMode="tail">
            {exercise.name}
          </Text>
        </View>

        {/* 🔥 CAMBIO: Solo mostrar si showOptions es true Y no es readonly */}
        {showOptions && !readonly && (
          <TouchableOpacity onPress={openExerciseOptions}>
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
          backdropOpacity={0.5}
          useNativeDriver
          hideModalContentWhileAnimating
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Opciones de ejercicio</Text>

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => handleExerciseAction("reorder")}
            >
              <Icon name="swap-vert" size={22} color={theme.primary} />
              <Text style={[styles.modalItemText, { color: theme.text }]}>Reordenar ejercicios</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => handleExerciseAction("replace")}
            >
              <Icon name="sync" size={22} color={theme.primary} />
              <Text style={[styles.modalItemText, { color: theme.text }]}>Reemplazar ejercicio</Text>
            </TouchableOpacity>

            {hasSuperset ? (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setActionModalVisible(false);
                  onRemoveSuperset?.();
                }}
              >
                <Icon name="link-off" size={22} color={theme.error} />
                <Text style={[styles.modalItemText, { color: theme.error }]}>
                  Eliminar superserie
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => handleExerciseAction("superset")}
              >
                <Icon name="link" size={22} color={theme.primary} />
                <Text style={[styles.modalItemText, { color: theme.text }]}>Agregar a superserie</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.modalDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => handleExerciseAction("delete")}
            >
              <Icon name="delete" size={22} color={theme.error} />
              <Text style={[styles.modalItemText, styles.deleteText, { color: theme.error }]}>
                Eliminar ejercicio
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Modal de superseries */}
        <Modal
          isVisible={isSupersetModalVisible}
          onBackdropPress={() => {
            setSupersetModalVisible(false);
          }}
          onSwipeComplete={() => setSupersetModalVisible(false)}
          swipeDirection="down"
          style={styles.modalContainer}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          backdropOpacity={0.5}
          useNativeDriver
          hideModalContentWhileAnimating
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Superserie de {exercise.name} con...
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Selecciona el ejercicio con el que deseas hacer superserie
            </Text>

            {filteredExercises.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="fitness-center" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No hay otros ejercicios en esta rutina
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.supersetList}>
                {filteredExercises.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.supersetItem, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                    onPress={() => handleSelectSupersetExercise(item)}
                  >
                    <Image
                      source={
                        item.imageUrl
                          ? { uri: `data:image/png;base64,${item.imageUrl}` }
                          : require("./../../../../../assets/not-image.png")
                      }
                      style={[styles.supersetImage, { backgroundColor: theme.border }]}
                    />
                    <Text style={[styles.supersetName, { color: theme.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Icon name="chevron-right" size={24} color={theme.textTertiary} />
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

const styles = StyleSheet.create({
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
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: RFValue(20),
    fontWeight: "700",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: RFValue(14),
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  modalItemText: {
    fontSize: RFValue(16),
    marginLeft: 12,
    fontWeight: "500",
  },
  deleteText: {
  },
  modalDivider: {
    height: 1,
    marginVertical: 8,
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
