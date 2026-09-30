import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import CachedExerciseImage from "../../../components/CachedExerciseImage";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { getStaticExerciseImageUrl } from "../utils/normalizeExerciseImage";

interface Props {
  item: ExerciseRequestDto;
  isSelected: boolean;
  onSelect: (exercise: ExerciseRequestDto) => void;
  onRedirect?: (exercise: ExerciseRequestDto) => void;
}

const muscleLabel = (item: ExerciseRequestDto): string | null => {
  if (item.muscularGroup?.trim()) return item.muscularGroup.trim();

  const targetMuscles = (
    item as ExerciseRequestDto & { targetMuscles?: string[] }
  ).targetMuscles;
  const label = targetMuscles?.filter(Boolean).slice(0, 2).join(" · ");
  return label || null;
};

export default function ExerciseItem({
  item,
  isSelected,
  onSelect,
  onRedirect,
}: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const staticImageUrl = getStaticExerciseImageUrl(item);
  const muscles = muscleLabel(item);

  return (
    <TouchableOpacity
      style={[styles.exerciseItem, isSelected && styles.selectedItem]}
      onPress={() => onSelect(item)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <CachedExerciseImage
        imageUrl={staticImageUrl}
        style={styles.exerciseImage}
      />
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseTitle} numberOfLines={2}>
          {item.name}
        </Text>
        {muscles ? (
          <Text style={styles.exerciseMuscleGroup} numberOfLines={1}>
            {muscles}
          </Text>
        ) : null}
      </View>
      {onRedirect ? (
        <TouchableOpacity
          style={styles.redirectButton}
          onPress={() => onRedirect(item)}
          accessibilityLabel="Ver detalle del ejercicio"
        >
          <Icon name="arrow-forward" size={22} color={theme.primary} />
        </TouchableOpacity>
      ) : (
        <View
          style={[styles.selectionMark, isSelected && styles.selectionMarkOn]}
        >
          <Icon
            name={isSelected ? "check" : "add"}
            size={18}
            color={isSelected ? theme.onPrimary : theme.primary}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    exerciseItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    selectedItem: {
      backgroundColor: theme.selection,
      borderColor: theme.primary,
    },
    exerciseImage: {
      width: 72,
      height: 72,
      borderRadius: 12,
      marginRight: 12,
      backgroundColor: theme.backgroundSecondary,
    },
    exerciseInfo: {
      flex: 1,
      minWidth: 0,
    },
    exerciseTitle: {
      fontSize: RFValue(16),
      fontWeight: "700",
      color: theme.text,
    },
    exerciseMuscleGroup: {
      fontSize: RFValue(13),
      color: theme.textSecondary,
      marginTop: 4,
    },
    redirectButton: {
      padding: 8,
    },
    selectionMark: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: theme.primary,
      backgroundColor: theme.card,
      marginLeft: 8,
    },
    selectionMarkOn: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
  });
