import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Crown,
  Calendar,
  CreditCard,
  ArrowRight,
  CheckCircle,
} from "lucide-react-native";
import { useSubscription } from "../hooks/useSubscription";
import { FeatureList } from "../components/FeatureList";
import { UpgradeButton } from "../components/UpgradeButton";
import {
  cancelSubscription,
  reactivateSubscription,
  getCustomerPortalUrl,
} from "../services/subscriptionService";
import {
  SubscriptionPlan,
  PLAN_METADATA,
} from "@sergiomesasyelamos2000/shared";
import { useTheme } from "../../../contexts/ThemeContext";
import { getErrorMessage } from "../../../types";
import type { BaseNavigation, CaughtError } from "../../../types";
import type { SubscriptionStackParamList } from "./SubscriptionStack";

type StatusScreenRouteProp = RouteProp<
  SubscriptionStackParamList,
  "StatusScreen"
>;

export function StatusScreen() {
  const navigation = useNavigation<BaseNavigation>();
  const route = useRoute<StatusScreenRouteProp>();
  const { success } = route.params || {};
  const { theme, isDark } = useTheme();

  const {
    subscription,
    features,
    isPremium,
    isLoading,
    getDaysRemaining,
    isCanceled,
    fetchSubscription,
  } = useSubscription();

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Refresh subscription data when screen mounts
    fetchSubscription();
  }, []);

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancelar Suscripción",
      "¿Estás seguro de que quieres cancelar tu suscripción? Seguirás teniendo acceso hasta el final de tu período de facturación.",
      [
        { text: "Mantener Suscripción", style: "cancel" },
        {
          text: "Cancelar Suscripción",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await cancelSubscription(false); // Cancel at period end
              await fetchSubscription();
              Alert.alert(
                "Éxito",
                "Tu suscripción se cancelará al final del período de facturación."
              );
            } catch (error: CaughtError) {
              Alert.alert(
                "Error",
                getErrorMessage(error) || "No se pudo cancelar la suscripción"
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReactivateSubscription = async () => {
    try {
      setActionLoading(true);
      await reactivateSubscription();
      await fetchSubscription();
      Alert.alert("Éxito", "¡Tu suscripción ha sido reactivada!");
    } catch (error: CaughtError) {
      Alert.alert(
        "Error",
        getErrorMessage(error) || "No se pudo reactivar la suscripción"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setActionLoading(true);
      const { portalUrl } = await getCustomerPortalUrl();
      await Linking.openURL(portalUrl);
    } catch (error: CaughtError) {
      Alert.alert(
        "Error",
        getErrorMessage(error) || "No se pudo abrir el portal de cliente"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = () => {
    navigation.navigate("PlansScreen");
  };

  if (isLoading || !subscription) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const planMetadata = PLAN_METADATA[subscription.plan];
  const daysRemaining = getDaysRemaining;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Banner */}
        {success && (
          <View>
            <View
              style={[
                styles.successBanner,
                {
                  backgroundColor: isDark
                    ? "rgba(16, 185, 129, 0.18)"
                    : "#d1fae5",
                },
              ]}
            >
              <CheckCircle size={24} color={theme.success} />
              <Text
                style={[
                  styles.successText,
                  { color: isDark ? "#A7F3D0" : "#065f46" },
                ]}
              >
                ¡Bienvenido a Premium! Tu suscripción está activa.
              </Text>
            </View>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Crown
            size={32}
            color={isPremium ? theme.warning : theme.textTertiary}
          />
          <Text style={[styles.title, { color: theme.text }]}>
            Mi Suscripción
          </Text>
        </View>

        {/* Current Plan Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              shadowColor: theme.shadowColor,
            },
            isPremium && styles.premiumCard,
            isPremium && { borderColor: theme.warning },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.planName, { color: theme.text }]}>
              {planMetadata.name}
            </Text>
            {isPremium && (
              <View
                style={[
                  styles.premiumBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(245, 158, 11, 0.18)"
                      : "#fef3c7",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.premiumBadgeText,
                    { color: isDark ? "#FCD34D" : "#92400e" },
                  ]}
                >
                  Premium
                </Text>
              </View>
            )}
          </View>

          <Text
            style={[styles.planDescription, { color: theme.textSecondary }]}
          >
            {planMetadata.description}
          </Text>

          {/* Subscription Details */}
          {isPremium && (
            <View style={styles.detailsContainer}>
              {/* Price */}
              <View style={styles.detailRow}>
                <CreditCard size={20} color={theme.textSecondary} />
                <Text
                  style={[styles.detailLabel, { color: theme.textSecondary }]}
                >
                  Precio:
                </Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {planMetadata.price.toFixed(2)}€
                  {planMetadata.interval &&
                    planMetadata.interval !== "lifetime" && (
                      <>/{planMetadata.interval === "month" ? "mes" : "año"}</>
                    )}
                  {planMetadata.interval === "lifetime" && " (pago único)"}
                </Text>
              </View>

              {/* Renewal Date */}
              {subscription.currentPeriodEnd &&
                subscription.plan !== SubscriptionPlan.LIFETIME && (
                  <View style={styles.detailRow}>
                    <Calendar size={20} color={theme.textSecondary} />
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {isCanceled ? "Expira:" : "Se renueva:"}
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString("es-ES")}
                      {daysRemaining !== undefined &&
                        ` (${daysRemaining} días)`}
                    </Text>
                  </View>
                )}

              {/* Canceled Notice */}
              {isCanceled && (
                <View
                  style={[
                    styles.canceledNotice,
                    {
                      backgroundColor: isDark
                        ? "rgba(239, 68, 68, 0.16)"
                        : "#fef2f2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.canceledText,
                      { color: isDark ? "#FCA5A5" : "#991b1b" },
                    ]}
                  >
                    Tu suscripción se cancelará al final del período de
                    facturación.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={[styles.featuresTitle, { color: theme.text }]}>
              Funciones Incluidas:
            </Text>
            <FeatureList features={planMetadata.features} />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {!isPremium && (
              <UpgradeButton
                onPress={handleChangePlan}
                variant="primary"
                size="large"
                style={styles.actionButton}
              />
            )}

            {isPremium &&
              !isCanceled &&
              subscription.plan !== SubscriptionPlan.LIFETIME && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.buttonSecondary,
                      {
                        backgroundColor: isDark
                          ? theme.backgroundSecondary
                          : "#f3f4f6",
                      },
                    ]}
                    onPress={handleManageSubscription}
                    disabled={actionLoading}
                  >
                    <Text
                      style={[
                        styles.buttonTextSecondary,
                        { color: theme.text },
                      ]}
                    >
                      Gestionar Suscripción
                    </Text>
                    <ArrowRight size={20} color={theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.buttonDanger,
                      {
                        backgroundColor: isDark
                          ? "rgba(239, 68, 68, 0.16)"
                          : "#fef2f2",
                      },
                    ]}
                    onPress={handleCancelSubscription}
                    disabled={actionLoading}
                  >
                    <Text
                      style={[
                        styles.buttonTextDanger,
                        { color: isDark ? "#FCA5A5" : theme.error },
                      ]}
                    >
                      Cancelar Suscripción
                    </Text>
                  </TouchableOpacity>
                </>
              )}

            {isPremium && isCanceled && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleReactivateSubscription}
                disabled={actionLoading}
              >
                <Text style={styles.buttonTextPrimary}>
                  Reactivar Suscripción
                </Text>
              </TouchableOpacity>
            )}

            {isPremium && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonOutline,
                  { borderColor: theme.border },
                ]}
                onPress={handleChangePlan}
                disabled={actionLoading}
              >
                <Text style={[styles.buttonTextOutline, { color: theme.text }]}>
                  Ver Todos los Planes
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {actionLoading && (
            <View
              style={[
                styles.actionLoadingOverlay,
                {
                  backgroundColor: isDark
                    ? "rgba(15, 23, 42, 0.82)"
                    : "rgba(255, 255, 255, 0.8)",
                },
              ]}
            >
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>
            ¿Preguntas? Contáctanos en evofit.support@gmail.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  successText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#065f46",
    flex: 1,
  },
  closeFlowButton: {
    marginTop: 12,
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeFlowButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    paddingVertical: 24,
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  card: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumCard: {
    borderWidth: 2,
    borderColor: "#f59e0b",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  premiumBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
  planDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6b7280",
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  canceledNotice: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  canceledText: {
    fontSize: 13,
    color: "#991b1b",
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonPrimary: {
    backgroundColor: "#3b82f6",
  },
  buttonSecondary: {
    backgroundColor: "#f3f4f6",
  },
  buttonDanger: {
    backgroundColor: "#fef2f2",
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  buttonTextPrimary: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  buttonTextDanger: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextOutline: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  actionLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
});
