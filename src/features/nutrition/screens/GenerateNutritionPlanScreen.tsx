import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { SafeAreaView } from "react-native-safe-area-context";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { CaughtError, getErrorMessage } from "../../../types";
import { HealthDisclaimerCard } from "../../common/components/HealthDisclaimerCard";
import * as nutritionPlansService from "../services/nutritionPlansService";
import { NutritionStackParamList } from "./NutritionStack";

type Props = NativeStackScreenProps<
  NutritionStackParamList,
  "GenerateNutritionPlanScreen"
>;

const DURATION_OPTIONS = [7, 14, 21, 30];

export default function GenerateNutritionPlanScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [durationDays, setDurationDays] = useState(7);
  const [name, setName] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [excludedFoods, setExcludedFoods] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const plan = await nutritionPlansService.generateNutritionPlan({
        durationDays,
        name: name.trim() || undefined,
        preferences: {
          dietaryRestrictions: dietaryRestrictions.trim() || undefined,
          excludedFoods: excludedFoods.trim() || undefined,
          additionalNotes: additionalNotes.trim() || undefined,
        },
      });

      navigation.replace("NutritionPlanDetailScreen", { planId: plan.id });
    } catch (error: CaughtError) {
      console.error("Error generating nutrition plan:", error);
      const message = getErrorMessage(error);
      const isTimeout =
        error instanceof Error && error.name === "AbortError";

      Alert.alert(
        "Error",
        isTimeout
          ? "La generación tardó demasiado. Inténtalo de nuevo."
          : message || "No se pudo generar el plan nutricional"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={generating}
        >
          <Ionicons name="arrow-back" size={RFValue(20)} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generar plan IA</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.description}>
            Crearemos un plan estructurado según tu perfil, macros y rutina de
            entrenamiento. El proceso puede tardar hasta un minuto.
          </Text>

          <HealthDisclaimerCard variant="compact" style={{ marginHorizontal: 0 }} />

          <Text style={styles.label}>Duración del plan</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((days) => {
              const selected = durationDays === days;
              return (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.durationChip,
                    selected && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setDurationDays(days)}
                  disabled={generating}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      selected && styles.durationChipTextSelected,
                    ]}
                  >
                    {days}d
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Nombre (opcional)</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Plan semanal IA"
            placeholderTextColor={theme.textSecondary}
            editable={!generating}
          />

          <Text style={styles.label}>Restricciones dietéticas</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={dietaryRestrictions}
            onChangeText={setDietaryRestrictions}
            placeholder="Ej: sin lactosa, vegetariano..."
            placeholderTextColor={theme.textSecondary}
            multiline
            editable={!generating}
          />

          <Text style={styles.label}>Alimentos a excluir</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={excludedFoods}
            onChangeText={setExcludedFoods}
            placeholder="Ej: mariscos, gluten..."
            placeholderTextColor={theme.textSecondary}
            multiline
            editable={!generating}
          />

          <Text style={styles.label}>Notas adicionales</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            placeholder="Preferencias de cocina, horarios, presupuesto..."
            placeholderTextColor={theme.textSecondary}
            multiline
            editable={!generating}
          />

          <TouchableOpacity
            style={[styles.generateButton, generating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generar plan</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 40,
      alignItems: "flex-start",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: RFValue(16),
      fontWeight: "700",
      color: theme.text,
    },
    headerRight: {
      width: 40,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    description: {
      fontSize: RFValue(13),
      color: theme.textSecondary,
      lineHeight: RFValue(18),
      marginBottom: 16,
    },
    label: {
      fontSize: RFValue(12),
      fontWeight: "600",
      color: theme.text,
      marginBottom: 8,
      marginTop: 8,
    },
    durationRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
    },
    durationChip: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: theme.card,
    },
    durationChipText: {
      fontSize: RFValue(13),
      color: theme.text,
      fontWeight: "600",
    },
    durationChipTextSelected: {
      color: "#fff",
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.text,
      backgroundColor: theme.card,
      fontSize: RFValue(13),
    },
    inputMultiline: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    generateButton: {
      marginTop: 24,
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    generateButtonDisabled: {
      opacity: 0.8,
    },
    generateButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: RFValue(14),
    },
  });
