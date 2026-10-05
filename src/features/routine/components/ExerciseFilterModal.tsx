import type { EquipmentDto, MuscleDto } from "@sergiomesasyelamos2000/shared";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { ExerciseFilterChip } from "./ExerciseFilterChip";
import {
  withSelectedChips,
  remapFilterSelectionIds,
  DERIVED_EQUIPMENT_PREFIX,
  DERIVED_MUSCLE_PREFIX,
  type ExerciseFilterDraft,
  type RankedFilterChips,
} from "../utils/exerciseFilterIndex";
import {
  getEquipmentAliasKeys,
  getMuscleAliasKeys,
} from "../utils/exerciseAliasKeys";

const EMPTY_IDS: readonly string[] = Object.freeze([]);

export type ExerciseFilterModalProps = {
  visible: boolean;
  equipmentRanked: RankedFilterChips<EquipmentDto>;
  muscleRanked: RankedFilterChips<MuscleDto>;
  seed: ExerciseFilterDraft;
  onApply: (draft: ExerciseFilterDraft) => void;
  onClose: () => void;
};

function ExerciseFilterModalComponent({
  visible,
  equipmentRanked,
  muscleRanked,
  seed,
  onApply,
  onClose,
}: ExerciseFilterModalProps) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [tempEquipmentIds, setTempEquipmentIds] = useState<readonly string[]>(
    EMPTY_IDS
  );
  const [tempMuscleIds, setTempMuscleIds] = useState<readonly string[]>(
    EMPTY_IDS
  );
  /** Freeze ranked chips for the open session so late option loads don't reshuffle. */
  const [sessionEquipmentRanked, setSessionEquipmentRanked] =
    useState(equipmentRanked);
  const [sessionMuscleRanked, setSessionMuscleRanked] = useState(muscleRanked);

  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setTempEquipmentIds(
        seed.equipmentIds.length ? [...seed.equipmentIds] : EMPTY_IDS
      );
      setTempMuscleIds(seed.muscleIds.length ? [...seed.muscleIds] : EMPTY_IDS);
      setSessionEquipmentRanked(equipmentRanked);
      setSessionMuscleRanked(muscleRanked);
    }
    wasVisibleRef.current = visible;
  }, [visible, seed, equipmentRanked, muscleRanked]);

  // If the user opens before idle index finishes, fill chips once when ready.
  useEffect(() => {
    if (!visible) return;
    if (
      sessionEquipmentRanked.all.length === 0 &&
      equipmentRanked.all.length > 0
    ) {
      setSessionEquipmentRanked(equipmentRanked);
      setTempEquipmentIds((prev) =>
        prev.length === 0
          ? prev
          : remapFilterSelectionIds(
              prev,
              equipmentRanked.all,
              getEquipmentAliasKeys,
              DERIVED_EQUIPMENT_PREFIX
            )
      );
    }
  }, [visible, equipmentRanked, sessionEquipmentRanked.all.length]);

  useEffect(() => {
    if (!visible) return;
    if (sessionMuscleRanked.all.length === 0 && muscleRanked.all.length > 0) {
      setSessionMuscleRanked(muscleRanked);
      setTempMuscleIds((prev) =>
        prev.length === 0
          ? prev
          : remapFilterSelectionIds(
              prev,
              muscleRanked.all,
              getMuscleAliasKeys,
              DERIVED_MUSCLE_PREFIX
            )
      );
    }
  }, [visible, muscleRanked, sessionMuscleRanked.all.length]);

  const displayedEquipment = useMemo(
    () => withSelectedChips(sessionEquipmentRanked, tempEquipmentIds),
    [sessionEquipmentRanked, tempEquipmentIds]
  );

  const displayedMuscle = useMemo(
    () => withSelectedChips(sessionMuscleRanked, tempMuscleIds),
    [sessionMuscleRanked, tempMuscleIds]
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleApply = useCallback(() => {
    onApply({
      equipmentIds: tempEquipmentIds,
      muscleIds: tempMuscleIds,
    });
    onClose();
  }, [onApply, onClose, tempEquipmentIds, tempMuscleIds]);

  const clearDraft = useCallback(() => {
    setTempEquipmentIds(EMPTY_IDS);
    setTempMuscleIds(EMPTY_IDS);
  }, []);

  const clearEquipment = useCallback(() => {
    setTempEquipmentIds((prev) => (prev.length === 0 ? prev : EMPTY_IDS));
  }, []);

  const clearMuscle = useCallback(() => {
    setTempMuscleIds((prev) => (prev.length === 0 ? prev : EMPTY_IDS));
  }, []);

  const toggleEquipment = useCallback((id: string) => {
    setTempEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const toggleMuscle = useCallback((id: string) => {
    setTempMuscleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Filtrar ejercicios</Text>

              <Text style={styles.modalSectionTitle}>Equipamiento</Text>
              <ScrollView
                style={styles.modalSectionScroll}
                contentContainerStyle={styles.modalChipsWrap}
                showsVerticalScrollIndicator={false}
              >
                <ExerciseFilterChip
                  label="Todos"
                  selected={tempEquipmentIds.length === 0}
                  onPress={clearEquipment}
                />
                {displayedEquipment.map((item) => (
                  <ExerciseFilterChip
                    key={item.id}
                    label={item.name}
                    selected={tempEquipmentIds.includes(item.id)}
                    onPress={() => toggleEquipment(item.id)}
                  />
                ))}
              </ScrollView>

              <Text style={styles.modalSectionTitle}>Músculo</Text>
              <ScrollView
                style={styles.modalSectionScroll}
                contentContainerStyle={styles.modalChipsWrap}
                showsVerticalScrollIndicator={false}
              >
                <ExerciseFilterChip
                  label="Todos"
                  selected={tempMuscleIds.length === 0}
                  onPress={clearMuscle}
                />
                {displayedMuscle.map((item) => (
                  <ExerciseFilterChip
                    key={item.id}
                    label={item.name}
                    selected={tempMuscleIds.includes(item.id)}
                    onPress={() => toggleMuscle(item.id)}
                  />
                ))}
              </ScrollView>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={clearDraft}
                >
                  <Text style={styles.modalSecondaryButtonText}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={handleClose}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={handleApply}
                >
                  <Text style={styles.modalPrimaryButtonText}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export const ExerciseFilterModal = memo(ExerciseFilterModalComponent);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: theme.overlay,
    },
    modalContent: {
      maxHeight: "80%",
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 16,
    },
    modalTitle: {
      color: theme.text,
      fontSize: RFValue(18),
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 20,
    },
    modalSectionTitle: {
      color: theme.textSecondary,
      fontSize: RFValue(13),
      fontWeight: "700",
      marginBottom: 8,
      marginTop: 6,
    },
    modalSectionScroll: {
      maxHeight: 180,
      marginBottom: 4,
    },
    modalChipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingBottom: 8,
    },
    modalButtonsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
      marginTop: 16,
    },
    modalSecondaryButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundSecondary,
      paddingVertical: 14,
      alignItems: "center",
    },
    modalSecondaryButtonText: {
      color: theme.textSecondary,
      fontSize: RFValue(13),
      fontWeight: "600",
    },
    modalPrimaryButton: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: theme.primary,
      paddingVertical: 14,
      alignItems: "center",
    },
    modalPrimaryButtonText: {
      color: theme.onPrimary,
      fontSize: RFValue(13),
      fontWeight: "700",
    },
  });
