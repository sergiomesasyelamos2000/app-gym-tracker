import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { getAIUsage } from '../features/nutrition/services/nutritionService';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { useAuthStore } from '../store/useAuthStore';

const AI_USAGE_KEY_PREFIX = 'ai_usage_limit'; // Prefijo base
const FREE_TIER_TOTAL_LIMIT = 10; // Límite total para usuarios gratuitos

interface AIUsageData {
  count: number;
}

// Helper para obtener la clave específica del usuario
const getAIUsageKey = (userId: string): string => `${AI_USAGE_KEY_PREFIX}_${userId}`;

export function useAIUsageLimit() {
  const { isPremium } = useSubscriptionStore();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const [remainingCalls, setRemainingCalls] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos de uso al montar o cuando cambia el usuario
  useEffect(() => {
    if (userId) {
      loadUsageData();
    } else {
      setRemainingCalls(null);
      setLoading(false);
    }
  }, [userId, isPremium]);

  const loadUsageData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Source of truth from backend
      const backendUsage = await getAIUsage(userId);
      if (backendUsage.isPremium || isPremium) {
        setRemainingCalls(null);
        return;
      }

      if (backendUsage.remaining !== null) {
        setRemainingCalls(Math.max(0, backendUsage.remaining));

        const usedFromBackend = Math.max(
          0,
          FREE_TIER_TOTAL_LIMIT - backendUsage.remaining
        );
        await AsyncStorage.setItem(
          getAIUsageKey(userId),
          JSON.stringify({ count: usedFromBackend })
        );
        return;
      }
    } catch (error) {
      console.warn('Could not sync AI usage from backend, using local cache');
    }

    try {
      const data = await AsyncStorage.getItem(getAIUsageKey(userId));
      if (data) {
        const usageData: AIUsageData = JSON.parse(data);
        setRemainingCalls(Math.max(0, FREE_TIER_TOTAL_LIMIT - usageData.count));
      } else {
        setRemainingCalls(FREE_TIER_TOTAL_LIMIT);
      }
    } catch (error) {
      console.error('Error loading AI usage data:', error);
      setRemainingCalls(FREE_TIER_TOTAL_LIMIT);
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    // Usuarios premium tienen uso ilimitado
    if (isPremium) {
      return true;
    }

    // Sin userId, no se puede incrementar (bloquear)
    if (!userId) {
      console.warn('Cannot increment AI usage: no user ID');
      return false;
    }

    if (remainingCalls !== null && remainingCalls <= 0) {
      return false;
    }

    try {
      const data = await AsyncStorage.getItem(getAIUsageKey(userId));
      let usageData: AIUsageData;

      if (data) {
        usageData = JSON.parse(data);
      } else {
        usageData = {
          count: 0,
        };
      }

      // Verificar límite
      if (usageData.count >= FREE_TIER_TOTAL_LIMIT) {
        setRemainingCalls(0);
        return false;
      }

      // Incrementar contador
      usageData.count += 1;
      await AsyncStorage.setItem(getAIUsageKey(userId), JSON.stringify(usageData));
      setRemainingCalls(Math.max(0, FREE_TIER_TOTAL_LIMIT - usageData.count));
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
    dailyLimit: FREE_TIER_TOTAL_LIMIT,
  };
}
