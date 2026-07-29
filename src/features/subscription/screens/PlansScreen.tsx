import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlanCard } from "../components/PlanCard";
import { SubscriptionLegalFooter } from "../components/SubscriptionLegalFooter";
import { useSubscription } from "../hooks/useSubscription";
import { useAppleIapCheckout } from "../hooks/useAppleIapCheckout";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  SubscriptionPlan,
  PLAN_METADATA,
} from "@sergiomesasyelamos2000/shared";
import { createCheckoutSession } from "../services/subscriptionService";
import { getErrorMessage } from "../../../types";
import type { BaseNavigation, CaughtError } from "../../../types";

export function PlansScreen() {
  const navigation = useNavigation<BaseNavigation>();
  const { subscription } = useSubscription();
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(false);
  const isIos = Platform.OS === "ios";
  const {
    purchasePlan,
    restoreApplePurchases,
    openAppleSubscriptionManagement,
    hasConfiguration: hasAppleIapConfiguration,
    connected: appleStoreConnected,
    loading: appleLoading,
    productsLoaded,
  } = useAppleIapCheckout();

  const handleSelectPlan = async (planId: SubscriptionPlan) => {
    if (planId === SubscriptionPlan.FREE) {
      // User wants to stay on free plan
      navigation.goBack();
      return;
    }

    if (isIos) {
      await purchasePlan(planId);
      return;
    }

    try {
      setLoading(true);

      // Create checkout session
      const { sessionId, checkoutUrl } = await createCheckoutSession(planId);

      // Navigate to checkout screen
      navigation.navigate("CheckoutScreen", {
        sessionId,
        checkoutUrl,
        planId,
      });
    } catch (error: CaughtError) {
      console.error("Error creating checkout session:", error);
      Alert.alert(
        "Error",
        getErrorMessage(error) ||
          "No se pudo crear la sesión de pago. Por favor, inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    PLAN_METADATA[SubscriptionPlan.FREE],
    PLAN_METADATA[SubscriptionPlan.MONTHLY],
    PLAN_METADATA[SubscriptionPlan.YEARLY],
    PLAN_METADATA[SubscriptionPlan.LIFETIME],
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Elige tu Plan</Text>
          <Text style={styles.subtitle}>
            Desbloquea todas las funciones con Premium y lleva tu entrenamiento
            al siguiente nivel
          </Text>
        </View>

        {/* Current Plan Info */}
        {subscription && (
          <View style={styles.currentPlanContainer}>
            <Text style={styles.currentPlanLabel}>Plan Actual:</Text>
            <Text style={styles.currentPlanText}>
              {PLAN_METADATA[subscription.plan].name}
            </Text>
          </View>
        )}

        {isIos && (
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isDark
                  ? "rgba(245, 158, 11, 0.12)"
                  : "#fffbeb",
                borderColor: theme.warning,
              },
            ]}
          >
            <Text style={styles.noticeTitle}>Compras con App Store</Text>
            <Text style={styles.noticeText}>
              En iPhone y iPad, Premium se compra dentro de la App Store.
              {hasAppleIapConfiguration
                ? appleStoreConnected
                  ? productsLoaded
                    ? " Los planes se cargan desde StoreKit y se compran dentro de la App Store."
                    : " Cargando productos desde la App Store..."
                  : " Esperando conexion con la App Store..."
                : " Faltan los product IDs de Apple en la configuracion del build."}
            </Text>
            {appleStoreConnected && hasAppleIapConfiguration && (
              <Text
                style={styles.noticeAction}
                onPress={openAppleSubscriptionManagement}
              >
                Gestionar suscripciones
              </Text>
            )}
          </View>
        )}

        {/* Plan Cards */}
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelect={handleSelectPlan}
            isCurrentPlan={subscription?.plan === plan.id}
            disabled={loading || appleLoading}
          />
        ))}

        {/* Loading Overlay */}
        {(loading || appleLoading) && (
          <View
            style={[
              styles.loadingOverlay,
              {
                backgroundColor: isDark
                  ? "rgba(15, 23, 42, 0.9)"
                  : "rgba(255, 255, 255, 0.9)",
              },
            ]}
          >
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>
              {isIos ? "Preparando compra..." : "Creando sesión de pago..."}
            </Text>
          </View>
        )}

        {/* Footer */}
        <SubscriptionLegalFooter
          onRestorePurchases={restoreApplePurchases}
          restoreDisabled={appleLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 16,
    },
    title: {
      fontSize: 32,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 24,
    },
    currentPlanContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginBottom: 8,
    },
    currentPlanLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginRight: 8,
    },
    currentPlanText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.success,
    },
    noticeCard: {
      borderWidth: 1,
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 16,
    },
    noticeTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 6,
    },
    noticeText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    noticeAction: {
      marginTop: 10,
      fontSize: 14,
      fontWeight: "700",
      color: theme.primary,
    },
    loadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.textSecondary,
    },
  });
