import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { verifyPayment } from '../services/subscriptionService';
import { useSubscriptionStore } from '../../../store/useSubscriptionStore';
import type { SubscriptionStatusResponse } from '@sergiomesasyelamos2000/shared';
import type { BaseNavigation, CaughtError } from '../../../types';
import type { SubscriptionStackParamList } from './SubscriptionStack';

type CheckoutScreenRouteProp = RouteProp<
  SubscriptionStackParamList,
  'CheckoutScreen'
>;

export function CheckoutScreen() {
  const navigation = useNavigation<BaseNavigation>();
  const route = useRoute<CheckoutScreenRouteProp>();
  const params = route.params;
  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const { setSubscription } = useSubscriptionStore();

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    const { url } = navState;

    // Check if success URL
    if (url.includes('/subscription/success') || url.includes('session_id=')) {
      setVerifying(true);

      try {
        // Extract session ID from URL if present
        let sessionId = params.sessionId;
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const urlSessionId = urlParams.get('session_id');
        if (urlSessionId) {
          sessionId = urlSessionId;
        }

        // Verify payment
        const subscription = await verifyPayment(sessionId);

        // Update store
        const statusResponse: SubscriptionStatusResponse = {
          subscription,
          features: {
            maxRoutines: null,
            maxCustomProducts: null,
            maxCustomMeals: null,
            aiAnalysisEnabled: true,
            advancedStatsEnabled: true,
            exportDataEnabled: true,
            prioritySupportEnabled: true,
          },
          isPremium: true,
        };
        setSubscription(statusResponse);

        // Navigate to success screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'StatusScreen', params: { success: true } }],
        });
      } catch (error: CaughtError) {
        console.error('Error verifying payment:', error);
        Alert.alert(
          'Error de Verificación',
          'Pago exitoso pero la verificación falló. Por favor, contacta con soporte.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setVerifying(false);
      }
    }

    // Check if cancel URL
    if (url.includes('/subscription/cancel')) {
      Alert.alert('Pago Cancelado', 'Has cancelado el proceso de pago.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar Pago',
      '¿Estás seguro de que quieres cancelar el proceso de pago?',
      [
        { text: 'Continuar con el Pago', style: 'cancel' },
        { text: 'Cancelar', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  if (verifying) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.verifyingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.verifyingText}>Verificando pago...</Text>
          <Text style={styles.verifyingSubtext}>Por favor espera mientras confirmamos tu compra</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleCancel}>
          <X size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pago Seguro</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: params.checkoutUrl }}
        style={styles.webView}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  verifyingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  verifyingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
