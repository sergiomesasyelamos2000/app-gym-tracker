import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useSubscriptionStore } from '../store/useSubscriptionStore';

const AI_USAGE_KEY = 'ai_usage_limit';
const FREE_TIER_DAILY_LIMIT = 10; // Límite diario para usuarios gratuitos

interface AIUsageData {
  count: number;
  lastResetDate: string;
}

export function useAIUsageLimit() {
  const { isPremium } = useSubscriptionStore();
  const [remainingCalls, setRemainingCalls] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos de uso al montar
  useEffect(() => {
    loadUsageData();
  }, []);

  const loadUsageData = async () => {
    try {
      const data = await AsyncStorage.getItem(AI_USAGE_KEY);
      if (data) {
        const usageData: AIUsageData = JSON.parse(data);
        const today = new Date().toDateString();

        // Resetear si es un nuevo día
        if (usageData.lastResetDate !== today) {
          await resetUsage();
        } else {
          setRemainingCalls(FREE_TIER_DAILY_LIMIT - usageData.count);
        }
      } else {
        setRemainingCalls(FREE_TIER_DAILY_LIMIT);
      }
    } catch (error) {
      console.error('Error loading AI usage data:', error);
      setRemainingCalls(FREE_TIER_DAILY_LIMIT);
    } finally {
      setLoading(false);
    }
  };

  const resetUsage = async () => {
    const usageData: AIUsageData = {
      count: 0,
      lastResetDate: new Date().toDateString(),
    };
    await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify(usageData));
    setRemainingCalls(FREE_TIER_DAILY_LIMIT);
  };

  const incrementUsage = async (): Promise<boolean> => {
    // Usuarios premium tienen uso ilimitado
    if (isPremium) {
      return true;
    }

    try {
      const data = await AsyncStorage.getItem(AI_USAGE_KEY);
      let usageData: AIUsageData;

      if (data) {
        usageData = JSON.parse(data);
        const today = new Date().toDateString();

        // Resetear si es un nuevo día
        if (usageData.lastResetDate !== today) {
          usageData = {
            count: 0,
            lastResetDate: today,
          };
        }
      } else {
        usageData = {
          count: 0,
          lastResetDate: new Date().toDateString(),
        };
      }

      // Verificar límite
      if (usageData.count >= FREE_TIER_DAILY_LIMIT) {
        setRemainingCalls(0);
        return false;
      }

      // Incrementar contador
      usageData.count += 1;
      await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify(usageData));
      setRemainingCalls(FREE_TIER_DAILY_LIMIT - usageData.count);
      return true;
    } catch (error) {
      console.error('Error incrementing AI usage:', error);
      return true; // En caso de error, permitir el uso
    }
  };

  const canUseAI = (): boolean => {
    if (isPremium) return true;
    return remainingCalls !== null && remainingCalls > 0;
  };

  return {
    remainingCalls: isPremium ? null : remainingCalls, // null significa ilimitado
    canUseAI,
    incrementUsage,
    loading,
    isPremium,
    dailyLimit: FREE_TIER_DAILY_LIMIT,
  };
}
