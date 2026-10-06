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
import { ScreenHeader } from "../../common/components/ScreenHeader";
import { useAppleIapCheckout } from "../hooks/useAppleIapCheckout";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  themeBarStyle,
  useFocusedStatusBar,
} from "../../../hooks/useFocusedStatusBar";
import {
  SubscriptionPlan,
  PLAN_METADATA,
} from "@sergiomesasyelamos2000/shared";
import { createCheckoutSession } from "../services/subscriptionService";
import { getErrorMessage } from "../../../types";
import type { BaseNavigation, CaughtError } from "../../../types";
import { withOpacity } from "../../../utils/themeStyles";
import { useResponsive } from "../../../hooks/useResponsive";
import {
  SUBSCRIPTION_CARD_GAP,
  SUBSCRIPTION_SECTION_GAP,
  subscriptionColumnStyle,
  subscriptionTypeScale,
  type SubscriptionTypeScale,
} from "../subscriptionLayout";

export function PlansScreen() {
  const navigation = useNavigation<BaseNavigation>();
  const { subscription } = useSubscription();
  const { theme, isDark } = useTheme();
  useFocusedStatusBar(themeBarStyle(isDark));
  const { isSmallPhone } = useResponsive();
  const type = useMemo(
    () => subscriptionTypeScale(isSmallPhone),
    [isSmallPhone]
  );
  const styles = useMemo(() => createStyles(theme, type), [theme, type]);
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
      navigation.goBack();
      return;
    }

    if (isIos) {
      await purchasePlan(planId);
      return;
    }

    try {
      setLoading(true);

      const { sessionId, checkoutUrl } = await createCheckoutSession(planId);

      setLoading(false);
      navigation.navigate("CheckoutScreen", {
        sessionId,
        checkoutUrl,
        planId,
      });
    } catch (error: CaughtError) {
      console.error("Error creating checkout session:", error);
      setLoading(false);
      Alert.alert(
        "Error",
        getErrorMessage(error) ||
          "No se pudo crear la sesión de pago. Por favor, inténtalo de nuevo."
      );
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
      <ScreenHeader
        title="Elige tu Plan"
        onBack={() => navigation.goBack()}
        backgroundColor={theme.backgroundSecondary}
      />
      <View style={styles.body}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <Text style={styles.subtitle}>
              Desbloquea todas las funciones con Premium y lleva tu
              entrenamiento al siguiente nivel
            </Text>

            {subscription && (
              <View style={styles.currentPlanContainer}>
                <Text style={styles.currentPlanLabel}>Plan Actual:</Text>
                <Text style={styles.currentPlanText}>
                  {PLAN_METADATA[subscription.plan].name}
                </Text>
              </View>
            )}

            {isIos && (
              <View style={styles.noticeCard}>
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

            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSelect={handleSelectPlan}
                isCurrentPlan={subscription?.plan === plan.id}
                disabled={loading || appleLoading}
              />
            ))}

            <SubscriptionLegalFooter
              onRestorePurchases={restoreApplePurchases}
              restoreDisabled={appleLoading}
            />
          </View>
        </ScrollView>

        {(loading || appleLoading) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>
              {isIos ? "Preparando compra..." : "Creando sesión de pago..."}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme, type: SubscriptionTypeScale) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundSecondary,
    },
    body: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 8,
      paddingBottom: 32,
    },
    column: {
      ...subscriptionColumnStyle(),
      paddingTop: SUBSCRIPTION_SECTION_GAP,
    },
    subtitle: {
      fontSize: type.body,
      color: theme.textSecondary,
      lineHeight: type.bodyLineHeight,
      marginBottom: SUBSCRIPTION_SECTION_GAP,
    },
    currentPlanContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      marginBottom: 8,
    },
    currentPlanLabel: {
      fontSize: type.feature,
      color: theme.textSecondary,
      marginRight: 8,
    },
    currentPlanText: {
      fontSize: type.feature,
      fontWeight: "600",
      color: theme.success,
    },
    noticeCard: {
      borderWidth: 1,
      borderRadius: 16,
      marginBottom: SUBSCRIPTION_CARD_GAP,
      padding: 16,
      backgroundColor: withOpacity(theme.warning, 12),
      borderColor: theme.warning,
    },
    noticeTitle: {
      fontSize: type.body,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 6,
    },
    noticeText: {
      fontSize: type.feature,
      color: theme.textSecondary,
      lineHeight: Math.round(type.feature * 1.45),
    },
    noticeAction: {
      marginTop: 10,
      fontSize: type.feature,
      fontWeight: "700",
      color: theme.primary,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: withOpacity(theme.background, 92),
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    loadingText: {
      marginTop: 12,
      fontSize: type.body,
      color: theme.text,
    },
  });
