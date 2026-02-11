import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Crown, X, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

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
  const navigation = useNavigation<any>();

  const handleUpgrade = () => {
    onClose();
    navigation.navigate('SubscriptionStack', {
      screen: 'PlansScreen',
    });
  };

  const defaultTitle = 'Desbloquea las Funciones Premium';
  const defaultMessage =
    'Actualiza a Premium para acceder a rutinas ilimitadas, análisis con IA, estadísticas avanzadas y más.';

  const premiumFeatures = [
    'Rutinas de entrenamiento ilimitadas',
    'Productos y comidas personalizadas ilimitadas',
    'Análisis de fotos de alimentos con IA',
    'Estadísticas e información avanzada',
    'Exportación de datos',
    'Soporte prioritario',
    'Experiencia sin anuncios',
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Crown size={24} color="#f59e0b" />
            <Text style={styles.headerTitle}>Premium</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={styles.iconContainer}>
              <Crown size={64} color="#f59e0b" />
            </View>
            <Text style={styles.title}>{title || defaultTitle}</Text>
            <Text style={styles.message}>{message || defaultMessage}</Text>
          </View>

          {/* Feature Context */}
          {feature && (
            <View style={styles.featureContext}>
              <Text style={styles.featureContextText}>
                Estás intentando acceder a: <Text style={styles.featureName}>{feature}</Text>
              </Text>
            </View>
          )}

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Premium incluye:</Text>
            {premiumFeatures.map((feat, index) => (
              <View key={index} style={styles.featureRow}>
                <Check size={20} color="#10b981" style={styles.checkIcon} />
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
          </View>

          {/* Pricing Preview */}
          <View style={styles.pricingPreview}>
            <View style={styles.pricingOption}>
              <Text style={styles.pricingLabel}>Mensual</Text>
              <Text style={styles.pricingPrice}>$9.99/mes</Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.pricingOption}>
              <Text style={styles.pricingLabel}>Anual</Text>
              <Text style={styles.pricingPrice}>$99.99/año</Text>
              <Text style={styles.pricingSavings}>Ahorra 17%</Text>
            </View>
          </View>

          {/* CTA Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgrade}
              activeOpacity={0.8}
            >
              <Crown size={20} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.upgradeButtonText}>Actualizar a Premium</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterButtonText}>Quizás más tarde</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Garantía de devolución de 7 días • Cancela cuando quieras
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  featureContext: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
  },
  featureContextText: {
    fontSize: 14,
    color: '#1e40af',
    textAlign: 'center',
  },
  featureName: {
    fontWeight: '600',
  },
  featuresContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  pricingPreview: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  pricingOption: {
    flex: 1,
    alignItems: 'center',
  },
  pricingDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  pricingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  pricingPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pricingSavings: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  actions: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
