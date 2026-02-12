import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import CachedExerciseImage from "../../../components/CachedExerciseImage";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { ExerciseRequestDto } from "../../../models";

interface Props {
  item: ExerciseRequestDto;
  isSelected: boolean;
  onSelect: (exercise: ExerciseRequestDto) => void;
  onRedirect?: (exercise: ExerciseRequestDto) => void;
}

export default function ExerciseItem({
  item,
  isSelected,
  onSelect,
  onRedirect,
}: Props) {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity
      style={[
        styles.exerciseItem,
        isSelected && styles.selectedItem,
        {
          borderWidth: isDark ? 1 : isSelected ? 2 : 0, // ✅ Usar isDark directamente, no theme.isDark
          borderColor: isSelected ? theme.primary : theme.border,
        },
      ]}
      onPress={() => onSelect(item)}
    >
      <CachedExerciseImage
        imageUrl={item.imageUrl}
        style={styles.exerciseImage}
      />
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseTitle}>{item.name}</Text>
        {item.muscularGroup && (
          <Text style={styles.exerciseMuscleGroup}>
            Grupo muscular: {item.muscularGroup}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.redirectButton}
        onPress={() => onRedirect?.(item)}
      >
        <Icon name="arrow-forward" size={24} color={theme.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    exerciseItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      elevation: 2,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    selectedItem: {
      backgroundColor: theme.primaryDark + "40", // ✅ Simplificado - siempre usar primaryDark con opacidad
    },
    exerciseImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      marginRight: 12,
    },
    exerciseInfo: {
      flex: 1,
    },
    exerciseTitle: {
      fontSize: RFValue(18),
      fontWeight: "bold",
      color: theme.text,
    },
    exerciseMuscleGroup: {
      fontSize: RFValue(14),
      color: theme.textSecondary,
      marginTop: 4,
    },
    redirectButton: {
      padding: 8,
    },
  });
