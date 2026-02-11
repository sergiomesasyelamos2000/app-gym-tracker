import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, X } from 'lucide-react-native';
import { verifyPayment } from '../services/subscriptionService';
import { useSubscriptionStore } from '../../../store/useSubscriptionStore';

interface CheckoutScreenParams {
  sessionId: string;
  checkoutUrl: string;
  planId: string;
}

export function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as CheckoutScreenParams;
  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const { setSubscription } = useSubscriptionStore();

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;

    // Check if success URL
    if (url.includes('/subscription/success') || url.includes('session_id=')) {
      setVerifying(true);

      try {
        // Verify payment
        const subscription = await verifyPayment(params.sessionId);

        // Update store
        const statusResponse = {
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
      } catch (error: any) {
        console.error('Error verifying payment:', error);
        Alert.alert(
          'Verification Error',
          'Payment successful but verification failed. Please contact support.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setVerifying(false);
      }
    }

    // Check if cancel URL
    if (url.includes('/subscription/cancel')) {
      Alert.alert('Payment Canceled', 'You canceled the payment process.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel the payment process?',
      [
        { text: 'Continue Payment', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  if (verifying) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.verifyingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.verifyingText}>Verifying payment...</Text>
          <Text style={styles.verifyingSubtext}>Please wait while we confirm your purchase</Text>
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
        <Text style={styles.headerTitle}>Secure Checkout</Text>
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
