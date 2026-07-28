import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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
import { useNutritionStore } from "../../../store/useNutritionStore";
import { CaughtError, getErrorMessage } from "../../../types";
import { HealthDisclaimerCard } from "../../common/components/HealthDisclaimerCard";
import PlanCard from "../components/plans/PlanCard";
import * as nutritionPlansService from "../services/nutritionPlansService";
import { sortPlansByRecent } from "../utils/planHelpers";
import { NutritionStackParamList } from "./NutritionStack";

type Props = NativeStackScreenProps<
  NutritionStackParamList,
  "NutritionPlansListScreen"
>;

export default function NutritionPlansListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const hasProfile = useNutritionStore((state) => state.hasProfile);
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [plans, setPlans] = useState<NutritionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlans = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await nutritionPlansService.getNutritionPlans(user.id);
      setPlans(sortPlansByRecent(data));
    } catch (error: CaughtError) {
      console.error("Error loading nutrition plans:", error);
      Alert.alert(
        "Error",
        getErrorMessage(error) || "No se pudieron cargar los planes nutricionales"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPlans();
    }, [loadPlans])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPlans();
  };

  const handleGeneratePress = () => {
    if (!hasProfile) {
      Alert.alert(
        "Perfil incompleto",
        "Completa tu perfil de nutrición antes de generar un plan personalizado.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Configurar perfil",
            onPress: () =>
              navigation.navigate("UserProfileSetupScreen", {
                userId: user!.id,
              }),
          },
        ]
      );
      return;
    }

    navigation.navigate("GenerateNutritionPlanScreen");
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="calendar-outline"
        size={RFValue(64)}
        color={theme.border}
      />
      <Text style={styles.emptyTitle}>Sin planes nutricionales</Text>
      <Text style={styles.emptySubtitle}>
        Genera tu primer plan personalizado con IA según tu perfil y entrenamiento.
      </Text>
      <HealthDisclaimerCard variant="compact" style={{ marginHorizontal: 0, width: "100%" }} />
      <TouchableOpacity style={styles.emptyButton} onPress={handleGeneratePress}>
        <Ionicons name="sparkles-outline" size={18} color="#fff" />
        <Text style={styles.emptyButtonText}>Generar plan con IA</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={RFValue(20)} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Planes Nutricionales</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={RFValue(20)} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planes Nutricionales</Text>
        <TouchableOpacity style={styles.headerRight} onPress={handleGeneratePress}>
          <Ionicons name="add-circle-outline" size={26} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          plans.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <PlanCard
            plan={item}
            theme={theme}
            onPress={() =>
              navigation.navigate("NutritionPlanDetailScreen", {
                planId: item.id,
              })
            }
          />
        )}
      />
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
      fontSize: RFValue(16),
      fontWeight: "700",
      color: theme.text,
    },
    headerRight: {
      width: 40,
      alignItems: "flex-end",
    },
    listContent: {
      padding: 16,
      paddingBottom: 32,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: RFValue(18),
      fontWeight: "700",
      color: theme.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: RFValue(13),
      color: theme.textSecondary,
      textAlign: "center",
      marginTop: 8,
      lineHeight: RFValue(18),
    },
    emptyButton: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    emptyButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: RFValue(13),
    },
  });
