import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Crown, ArrowRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../hooks/useSubscription';

interface UpgradeBannerProps {
  message?: string;
  compact?: boolean;
}

export function UpgradeBanner({ message, compact }: UpgradeBannerProps) {
  const navigation = useNavigation<any>();
  const { isPremium, getDaysRemaining } = useSubscription();

  // Don't show banner if user is premium
  if (isPremium) {
    return null;
  }

  const handlePress = () => {
    navigation.navigate('SubscriptionStack', {
      screen: 'PlansScreen',
    });
  };

  const defaultMessage = compact
    ? 'Desbloquea las Funciones Premium'
    : '¡Actualiza a Premium para rutinas ilimitadas, análisis con IA y más!';

  return (
    <TouchableOpacity
      style={[styles.banner, compact && styles.bannerCompact]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Crown size={compact ? 20 : 24} color="#ffffff" />
      </View>
      <View style={styles.content}>
        <Text style={[styles.message, compact && styles.messageCompact]}>
          {message || defaultMessage}
        </Text>
      </View>
      <ArrowRight size={compact ? 16 : 20} color="#ffffff" style={styles.arrow} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerCompact: {
    paddingVertical: 10,
    marginVertical: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20,
  },
  messageCompact: {
    fontSize: 13,
  },
  arrow: {
    marginLeft: 8,
  },
});
