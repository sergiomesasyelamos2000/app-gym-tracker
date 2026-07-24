import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import type { NutritionPlanResponseDto as NutritionPlan } from "@sergiomesasyelamos2000/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { useAuthStore } from "../../../store/useAuthStore";
import { CaughtError, getErrorMessage } from "../../../types";
import MacroSummary from "../components/plans/MacroSummary";
import PlanDaySection from "../components/plans/PlanDaySection";
import * as nutritionPlansService from "../services/nutritionPlansService";
import {
  formatPlanDate,
  getPlanStatusColor,
  PLAN_STATUS_LABELS,
} from "../utils/planHelpers";
import { NutritionStackParamList } from "./NutritionStack";

type Props = NativeStackScreenProps<
  NutritionStackParamList,
  "NutritionPlanDetailScreen"
>;

export default function NutritionPlanDetailScreen({ route, navigation }: Props) {
  const { planId } = route.params;
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPlan = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await nutritionPlansService.getNutritionPlanById(
        planId,
        user.id
      );
      setPlan(data);
    } catch (error: CaughtError) {
      console.error("Error loading nutrition plan:", error);
      Alert.alert(
        "Error",
        getErrorMessage(error) || "No se pudo cargar el plan",
        [{ text: "Volver", onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  }, [navigation, planId, user?.id]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleActivate = async () => {
    if (!plan) return;

    setActionLoading(true);
    try {
      const updated = await nutritionPlansService.activateNutritionPlan(plan.id);
      setPlan(updated);
      Alert.alert("Plan activado", "Este plan quedó marcado como activo.");
    } catch (error: CaughtError) {
      Alert.alert(
        "Error",
        getErrorMessage(error) || "No se pudo activar el plan"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    if (!plan) return;

    Alert.alert(
      "Eliminar plan",
      "¿Seguro que quieres eliminar este plan nutricional?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await nutritionPlansService.deleteNutritionPlan(plan.id);
              navigation.goBack();
            } catch (error: CaughtError) {
              Alert.alert(
                "Error",
                getErrorMessage(error) || "No se pudo eliminar el plan"
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !plan) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={RFValue(20)} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle del plan</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getPlanStatusColor(plan.status, theme);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={actionLoading}
        >
          <Ionicons name="arrow-back" size={RFValue(20)} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {plan.name}
        </Text>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={handleDelete}
          disabled={actionLoading}
        >
          <Ionicons name="trash-outline" size={22} color={theme.error} />
        </TouchableOpacity>
      </View>

      {actionLoading ? (
        <View style={styles.actionOverlay}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planMeta}>
                {plan.durationDays} días · Actualizado{" "}
                {formatPlanDate(plan.updatedAt)}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {PLAN_STATUS_LABELS[plan.status]}
              </Text>
            </View>
          </View>

          {plan.description ? (
            <Text style={styles.description}>{plan.description}</Text>
          ) : null}

          <Text style={styles.sectionLabel}>Promedio diario</Text>
          <MacroSummary
            theme={theme}
            totals={{
              calories: plan.avgDailyCalories,
              protein: plan.avgDailyProtein,
              carbs: plan.avgDailyCarbs,
              fat: plan.avgDailyFat,
            }}
          />

          {plan.macroSnapshot ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
                Objetivos del perfil
              </Text>
              <MacroSummary
                theme={theme}
                totals={{
                  calories: plan.macroSnapshot.dailyCalories,
                  protein: plan.macroSnapshot.protein,
                  carbs: plan.macroSnapshot.carbs,
                  fat: plan.macroSnapshot.fat,
                }}
              />
            </>
          ) : null}

          {plan.planData.ai ? (
            <Text style={styles.aiMeta}>
              Generado con {plan.planData.ai.provider} ({plan.planData.ai.model})
            </Text>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          {plan.status !== "active" ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.activateButton]}
              onPress={handleActivate}
              disabled={actionLoading}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.activateButtonText}>Activar plan</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.daysTitle}>Días del plan</Text>
        {plan.planData.days.map((day, index) => (
          <PlanDaySection
            key={`${day.dayIndex}-${day.label}`}
            day={day}
            theme={theme}
            defaultExpanded={index === 0}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
      fontSize: RFValue(15),
      fontWeight: "700",
      color: theme.text,
      paddingHorizontal: 8,
    },
    headerRight: {
      width: 40,
      alignItems: "flex-end",
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    actionOverlay: {
      paddingVertical: 6,
      alignItems: "center",
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    summaryCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 10,
    },
    planName: {
      fontSize: RFValue(17),
      fontWeight: "700",
      color: theme.text,
    },
    planMeta: {
      fontSize: RFValue(11),
      color: theme.textSecondary,
      marginTop: 4,
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusText: {
      fontSize: RFValue(10),
      fontWeight: "700",
    },
    description: {
      fontSize: RFValue(12),
      color: theme.textSecondary,
      marginBottom: 10,
    },
    sectionLabel: {
      fontSize: RFValue(12),
      fontWeight: "600",
      color: theme.text,
      marginBottom: 8,
    },
    aiMeta: {
      marginTop: 10,
      fontSize: RFValue(11),
      color: theme.textSecondary,
      fontStyle: "italic",
    },
    actionsRow: {
      marginBottom: 12,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 12,
      paddingVertical: 12,
    },
    activateButton: {
      backgroundColor: theme.primary,
    },
    activateButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: RFValue(13),
    },
    daysTitle: {
      fontSize: RFValue(16),
      fontWeight: "700",
      color: theme.text,
      marginBottom: 8,
    },
  });
