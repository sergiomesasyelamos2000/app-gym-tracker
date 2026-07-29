import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
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
import { useAppleIapCheckout } from "../hooks/useAppleIapCheckout";
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
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";
import { getErrorMessage } from "../../../types";
import type { BaseNavigation, CaughtError } from "../../../types";
import type { SubscriptionStackParamList } from "./SubscriptionStack";
import { SubscriptionLegalFooter } from "../components/SubscriptionLegalFooter";

type StatusScreenRouteProp = RouteProp<
  SubscriptionStackParamList,
  "StatusScreen"
>;

export function StatusScreen() {
  const navigation = useNavigation<BaseNavigation>();
  const route = useRoute<StatusScreenRouteProp>();
  const { success } = route.params || {};
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isIos = Platform.OS === "ios";
  const {
    restoreApplePurchases,
    openAppleSubscriptionManagement,
    loading: appleIapLoading,
  } = useAppleIapCheckout();

  const {
    subscription,
    isPremium,
    isLoading,
    getDaysRemaining,
    isCanceled,
    fetchSubscription,
  } = useSubscription();

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
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
              await cancelSubscription(false);
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
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const planMetadata = PLAN_METADATA[subscription.plan];
  const daysRemaining = getDaysRemaining;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {success && (
          <View style={styles.successBanner}>
            <CheckCircle size={24} color={theme.success} />
            <Text style={styles.successText}>
              ¡Bienvenido a Premium! Tu suscripción está activa.
            </Text>
          </View>
        )}

        <View style={styles.header}>
          <Crown
            size={32}
            color={isPremium ? theme.warning : theme.textTertiary}
          />
          <Text style={styles.title}>Mi Suscripción</Text>
        </View>

        <View style={[styles.card, isPremium && styles.premiumCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.planName}>{planMetadata.name}</Text>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            )}
          </View>

          <Text style={styles.planDescription}>{planMetadata.description}</Text>

          {isPremium && (
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <CreditCard size={20} color={theme.textSecondary} />
                <Text style={styles.detailLabel}>Precio:</Text>
                <Text style={styles.detailValue}>
                  {planMetadata.price.toFixed(2)}€
                  {planMetadata.interval &&
                    planMetadata.interval !== "lifetime" && (
                      <>/{planMetadata.interval === "month" ? "mes" : "año"}</>
                    )}
                  {planMetadata.interval === "lifetime" && " (pago único)"}
                </Text>
              </View>

              {subscription.currentPeriodEnd &&
                subscription.plan !== SubscriptionPlan.LIFETIME && (
                  <View style={styles.detailRow}>
                    <Calendar size={20} color={theme.textSecondary} />
                    <Text style={styles.detailLabel}>
                      {isCanceled ? "Expira:" : "Se renueva:"}
                    </Text>
                    <Text style={styles.detailValue}>
                      {new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString("es-ES")}
                      {daysRemaining !== undefined &&
                        ` (${daysRemaining} días)`}
                    </Text>
                  </View>
                )}

              {isCanceled && (
                <View style={styles.canceledNotice}>
                  <Text style={styles.canceledText}>
                    Tu suscripción se cancelará al final del período de
                    facturación.
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>Funciones Incluidas:</Text>
            <FeatureList features={planMetadata.features} />
          </View>

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
              !isIos &&
              !isCanceled &&
              subscription.plan !== SubscriptionPlan.LIFETIME && (
                <>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={handleManageSubscription}
                    disabled={actionLoading}
                  >
                    <Text style={styles.buttonTextSecondary}>
                      Gestionar Suscripción
                    </Text>
                    <ArrowRight size={20} color={theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.buttonDanger]}
                    onPress={handleCancelSubscription}
                    disabled={actionLoading}
                  >
                    <Text style={styles.buttonTextDanger}>
                      Cancelar Suscripción
                    </Text>
                  </TouchableOpacity>
                </>
              )}

            {isPremium && isCanceled && !isIos && (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleReactivateSubscription}
                disabled={actionLoading}
              >
                <Text style={styles.buttonTextPrimary}>
                  Reactivar Suscripción
                </Text>
              </TouchableOpacity>
            )}

            {isPremium && !isIos && (
              <TouchableOpacity
                style={[styles.button, styles.buttonOutline]}
                onPress={handleChangePlan}
                disabled={actionLoading}
              >
                <Text style={styles.buttonTextOutline}>
                  Ver Todos los Planes
                </Text>
              </TouchableOpacity>
            )}

            {isIos && (
              <View style={styles.iosNotice}>
                <Text style={styles.iosNoticeText}>
                  Las compras de Premium en iPhone y iPad se hacen con App
                  Store. Las renovaciones, cancelaciones y reembolsos se
                  gestionan desde Apple.
                </Text>
              </View>
            )}

            {isIos &&
              isPremium &&
              subscription.plan !== SubscriptionPlan.LIFETIME && (
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={openAppleSubscriptionManagement}
                  disabled={actionLoading || appleIapLoading}
                >
                  <Text style={styles.buttonTextSecondary}>
                    Gestionar en App Store
                  </Text>
                  <ArrowRight size={20} color={theme.text} />
                </TouchableOpacity>
              )}

            {isIos && (
              <TouchableOpacity
                style={[styles.button, styles.buttonOutline]}
                onPress={restoreApplePurchases}
                disabled={actionLoading || appleIapLoading}
              >
                <Text style={styles.buttonTextOutline}>Restaurar compras</Text>
              </TouchableOpacity>
            )}

            {isIos && isPremium && (
              <TouchableOpacity
                style={[styles.button, styles.buttonOutline]}
                onPress={handleChangePlan}
                disabled={actionLoading || appleIapLoading}
              >
                <Text style={styles.buttonTextOutline}>
                  Ver todos los planes
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {(actionLoading || appleIapLoading) && (
            <View style={styles.actionLoadingOverlay}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <SubscriptionLegalFooter
            onRestorePurchases={restoreApplePurchases}
            restoreDisabled={actionLoading || appleIapLoading}
          />
          <Text style={[styles.footerText, { marginTop: 16 }]}>
            ¿Preguntas? Contáctanos en evofit.support@gmail.com
          </Text>
        </View>
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
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: withOpacity(theme.success, 18),
      padding: 16,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
    },
    successText: {
      marginLeft: 12,
      fontSize: 14,
      fontWeight: "600",
      color: theme.success,
      flex: 1,
    },
    header: {
      alignItems: "center",
      paddingVertical: 24,
    },
    title: {
      marginTop: 12,
      fontSize: 28,
      fontWeight: "700",
      color: theme.text,
    },
    card: {
      backgroundColor: theme.card,
      marginHorizontal: 16,
      borderRadius: 16,
      padding: 24,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    premiumCard: {
      borderWidth: 2,
      borderColor: theme.warning,
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
      color: theme.text,
    },
    premiumBadge: {
      backgroundColor: withOpacity(theme.warning, 18),
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    premiumBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.warning,
    },
    planDescription: {
      fontSize: 14,
      color: theme.textSecondary,
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
      color: theme.textSecondary,
      marginRight: 8,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
      flex: 1,
    },
    canceledNotice: {
      backgroundColor: withOpacity(theme.error, 16),
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    canceledText: {
      fontSize: 13,
      color: theme.error,
    },
    featuresSection: {
      marginBottom: 20,
    },
    featuresTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
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
      backgroundColor: theme.primary,
    },
    buttonSecondary: {
      backgroundColor: theme.backgroundSecondary,
    },
    buttonDanger: {
      backgroundColor: withOpacity(theme.error, 16),
    },
    buttonOutline: {
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: theme.border,
    },
    buttonTextPrimary: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    buttonTextSecondary: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
      marginRight: 8,
    },
    buttonTextDanger: {
      color: theme.error,
      fontSize: 16,
      fontWeight: "600",
    },
    buttonTextOutline: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    actionLoadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.overlay,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 16,
    },
    iosNotice: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      backgroundColor: theme.backgroundSecondary,
      borderColor: theme.border,
    },
    iosNoticeText: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      color: theme.text,
    },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 24,
      alignItems: "center",
    },
    footerText: {
      fontSize: 12,
      color: theme.textTertiary,
      textAlign: "center",
    },
  });
