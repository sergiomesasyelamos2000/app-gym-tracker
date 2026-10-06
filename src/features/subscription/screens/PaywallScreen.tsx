import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Crown, Check } from "lucide-react-native";
import { ScreenHeader } from "../../common/components/ScreenHeader";
import { useNavigation } from "@react-navigation/native";
import type { BaseNavigation } from "../../../types";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  themeBarStyle,
  useOverlayStatusBar,
} from "../../../hooks/useFocusedStatusBar";
import { withOpacity } from "../../../utils/themeStyles";
import { SubscriptionLegalFooter } from "../components/SubscriptionLegalFooter";
import { useResponsive } from "../../../hooks/useResponsive";
import {
  SUBSCRIPTION_SECTION_GAP,
  subscriptionColumnStyle,
  subscriptionTypeScale,
  type SubscriptionTypeScale,
} from "../subscriptionLayout";

interface PaywallScreenProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  title?: string;
  message?: string;
}

export function PaywallScreen({
  visible,
  onClose,
  feature,
  title,
  message,
}: PaywallScreenProps) {
  const navigation = useNavigation<BaseNavigation>();
  const { theme, isDark } = useTheme();
  useOverlayStatusBar(themeBarStyle(isDark), visible);
  const { isSmallPhone } = useResponsive();
  const type = useMemo(
    () => subscriptionTypeScale(isSmallPhone),
    [isSmallPhone]
  );
  const styles = useMemo(
    () => createStyles(theme, type, isSmallPhone),
    [theme, type, isSmallPhone]
  );

  const handleUpgrade = () => {
    onClose();
    navigation.navigate("SubscriptionStack", {
      screen: "PlansScreen",
    });
  };

  const defaultTitle = "Desbloquea las Funciones Premium";
  const defaultMessage =
    "Actualiza a Premium para acceder a rutinas ilimitadas, análisis con IA, estadísticas avanzadas y más.";

  const premiumFeatures = [
    "Rutinas de entrenamiento ilimitadas",
    "Productos y comidas personalizadas ilimitadas",
    "Análisis de fotos de alimentos con IA",
    "Estadísticas e información avanzada",
    "Exportación de datos",
    "Soporte prioritario",
    "Experiencia sin anuncios",
  ];

  const crownSize = isSmallPhone ? 48 : 64;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <SafeAreaView
        style={styles.container}
        edges={Platform.OS === "ios" ? ["bottom"] : ["top", "bottom"]}
      >
        <ScreenHeader
          title="Premium"
          mode="close"
          onBack={onClose}
          backgroundColor={theme.backgroundSecondary}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <View style={styles.hero}>
              <View style={styles.iconContainer}>
                <Crown size={crownSize} color={theme.warning} />
              </View>
              <Text style={styles.title}>{title || defaultTitle}</Text>
              <Text style={styles.message}>{message || defaultMessage}</Text>
            </View>

            {feature && (
              <View style={styles.featureContext}>
                <Text style={styles.featureContextText}>
                  Estás intentando acceder a:{" "}
                  <Text style={styles.featureName}>{feature}</Text>
                </Text>
              </View>
            )}

            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Premium incluye:</Text>
              {premiumFeatures.map((feat, index) => (
                <View key={index} style={styles.featureRow}>
                  <Check
                    size={20}
                    color={theme.success}
                    style={styles.checkIcon}
                  />
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
            </View>

            <View style={styles.pricingPreview}>
              <View style={styles.pricingOption}>
                <Text style={styles.pricingLabel}>Mensual</Text>
                <Text style={styles.pricingPrice}>0.99€/mes</Text>
              </View>
              <View style={styles.pricingDivider} />
              <View style={styles.pricingOption}>
                <Text style={styles.pricingLabel}>Anual</Text>
                <Text style={styles.pricingPrice}>9.99€/año</Text>
                <Text style={styles.pricingSavings}>Ahorra 16%</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={handleUpgrade}
                activeOpacity={0.8}
              >
                <Crown
                  size={20}
                  color={theme.onPrimary}
                  style={styles.buttonIcon}
                />
                <Text style={styles.upgradeButtonText}>
                  Actualizar a Premium
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.laterButton} onPress={onClose}>
                <Text style={styles.laterButtonText}>Quizás más tarde</Text>
              </TouchableOpacity>
            </View>

            <SubscriptionLegalFooter />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (
  theme: Theme,
  type: SubscriptionTypeScale,
  isSmallPhone: boolean
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundSecondary,
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
    hero: {
      alignItems: "center",
      paddingBottom: 24,
    },
    iconContainer: {
      width: isSmallPhone ? 96 : 120,
      height: isSmallPhone ? 96 : 120,
      borderRadius: isSmallPhone ? 48 : 60,
      backgroundColor: withOpacity(theme.warning, 18),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    title: {
      fontSize: type.hero,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      marginBottom: 12,
    },
    message: {
      fontSize: type.body,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: type.bodyLineHeight,
    },
    featureContext: {
      marginBottom: 24,
      padding: 16,
      backgroundColor: theme.selection,
      borderRadius: 12,
    },
    featureContextText: {
      fontSize: type.feature,
      color: theme.info,
      textAlign: "center",
    },
    featureName: {
      fontWeight: "600",
    },
    featuresContainer: {
      marginBottom: 24,
    },
    featuresTitle: {
      fontSize: type.section,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 16,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    checkIcon: {
      marginRight: 12,
    },
    featureText: {
      fontSize: type.feature,
      color: theme.textSecondary,
      flex: 1,
    },
    pricingPreview: {
      flexDirection: "row",
      marginBottom: 24,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    pricingOption: {
      flex: 1,
      alignItems: "center",
    },
    pricingDivider: {
      width: 1,
      backgroundColor: theme.divider,
      marginHorizontal: 16,
    },
    pricingLabel: {
      fontSize: type.caption,
      fontWeight: "500",
      color: theme.textSecondary,
      marginBottom: 4,
    },
    pricingPrice: {
      fontSize: type.section,
      fontWeight: "700",
      color: theme.text,
    },
    pricingSavings: {
      marginTop: 4,
      fontSize: type.caption,
      fontWeight: "600",
      color: theme.success,
    },
    actions: {
      marginBottom: 16,
    },
    upgradeButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 12,
      marginBottom: 12,
      minHeight: 48,
    },
    buttonIcon: {
      marginRight: 8,
    },
    upgradeButtonText: {
      fontSize: type.button,
      fontWeight: "600",
      color: theme.onPrimary,
    },
    laterButton: {
      alignItems: "center",
      paddingVertical: 12,
    },
    laterButtonText: {
      fontSize: type.feature,
      fontWeight: "500",
      color: theme.textSecondary,
    },
  });
