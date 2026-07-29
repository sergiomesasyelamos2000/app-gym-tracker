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
import { Crown, X, Check } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { BaseNavigation } from "../../../types";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";
import { SubscriptionLegalFooter } from "../components/SubscriptionLegalFooter";

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Crown size={24} color={theme.warning} />
            <Text style={styles.headerTitle}>Premium</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.iconContainer}>
              <Crown size={64} color={theme.warning} />
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
              <Text style={styles.upgradeButtonText}>Actualizar a Premium</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterButtonText}>Quizás más tarde</Text>
            </TouchableOpacity>
          </View>

          <SubscriptionLegalFooter />
        </ScrollView>
      </View>
    </Modal>
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
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerTitle: {
      marginLeft: 8,
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 32,
    },
    hero: {
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 24,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: withOpacity(theme.warning, 18),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      marginBottom: 12,
    },
    message: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
    featureContext: {
      marginHorizontal: 24,
      marginBottom: 24,
      padding: 16,
      backgroundColor: theme.selection,
      borderRadius: 12,
    },
    featureContextText: {
      fontSize: 14,
      color: theme.info,
      textAlign: "center",
    },
    featureName: {
      fontWeight: "600",
    },
    featuresContainer: {
      marginHorizontal: 24,
      marginBottom: 24,
    },
    featuresTitle: {
      fontSize: 18,
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
      fontSize: 15,
      color: theme.textSecondary,
      flex: 1,
    },
    pricingPreview: {
      flexDirection: "row",
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
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
      fontSize: 12,
      fontWeight: "500",
      color: theme.textSecondary,
      marginBottom: 4,
    },
    pricingPrice: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    pricingSavings: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "600",
      color: theme.success,
    },
    actions: {
      paddingHorizontal: 24,
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
    },
    buttonIcon: {
      marginRight: 8,
    },
    upgradeButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.onPrimary,
    },
    laterButton: {
      alignItems: "center",
      paddingVertical: 12,
    },
    laterButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.textSecondary,
    },
  });
