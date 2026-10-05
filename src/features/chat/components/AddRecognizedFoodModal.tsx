import type { MealType } from "@sergiomesasyelamos2000/shared";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import { AppDialog } from "../../../ui/modal";
import { ADD_FOOD_MODAL_COPY } from "../nutritionChatCopy";

type Props = {
  visible: boolean;
  foodName: string;
  mealType: MealType;
  grams: string;
  saving: boolean;
  onChangeMealType: (meal: MealType) => void;
  onChangeGrams: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function AddRecognizedFoodModal({
  visible,
  foodName,
  mealType,
  grams,
  saving,
  onChangeMealType,
  onChangeGrams,
  onCancel,
  onSave,
}: Props) {
  const { theme } = useTheme();

  return (
    <AppDialog
      visible={visible}
      onDismiss={() => {
        if (!saving) onCancel();
      }}
      dismissOnBack={!saving}
      maxWidth={340}
      testID="add-recognized-food"
    >
      <Text style={[styles.title, { color: theme.text }]}>
        {ADD_FOOD_MODAL_COPY.title}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {foodName || "Alimento"}
      </Text>

      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {ADD_FOOD_MODAL_COPY.mealLabel}
      </Text>
      <View style={styles.mealTypesRow}>
        {ADD_FOOD_MODAL_COPY.meals.map((item) => {
          const selected = mealType === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.mealChip,
                {
                  borderColor: selected ? theme.primary : theme.border,
                  backgroundColor: selected
                    ? theme.primary
                    : theme.backgroundSecondary,
                },
              ]}
              onPress={() => onChangeMealType(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text
                style={{
                  color: selected ? theme.onPrimary : theme.text,
                  fontWeight: "600",
                  fontSize: RFValue(12),
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {ADD_FOOD_MODAL_COPY.gramsLabel}
      </Text>
      <TextInput
        value={grams}
        onChangeText={onChangeGrams}
        keyboardType="numeric"
        placeholder={ADD_FOOD_MODAL_COPY.gramsPlaceholder}
        placeholderTextColor={theme.inputPlaceholder}
        style={[
          styles.gramsInput,
          {
            color: theme.text,
            borderColor: theme.inputBorder,
            backgroundColor: theme.inputBackground,
          },
        ]}
      />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={onSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={ADD_FOOD_MODAL_COPY.save}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.onPrimary} />
          ) : (
            <Text style={[styles.primaryText, { color: theme.onPrimary }]}>
              {ADD_FOOD_MODAL_COPY.save}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={onCancel}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={ADD_FOOD_MODAL_COPY.cancel}
        >
          <Text style={[styles.secondaryText, { color: theme.text }]}>
            {ADD_FOOD_MODAL_COPY.cancel}
          </Text>
        </TouchableOpacity>
      </View>
    </AppDialog>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: RFValue(20),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: RFValue(14),
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: RFValue(13),
    fontWeight: "600",
    marginBottom: 8,
  },
  mealTypesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  mealChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  gramsInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: RFValue(15),
    marginBottom: 20,
  },
  buttons: {
    width: "100%",
    gap: 12,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: RFValue(14),
    fontWeight: "700",
  },
  secondaryText: {
    fontSize: RFValue(14),
    fontWeight: "600",
  },
});
