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

  const [remainingCalls, setRemainingCalls] = useState<number | null>(() => {
    if (!userId || isPremium) return null;
    return FREE_TIER_TOTAL_LIMIT;
  });
  const [backendPremium, setBackendPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const effectiveIsPremium = isPremium || backendPremium;

  // Cargar datos de uso al montar o cuando cambia el usuario
  useEffect(() => {
    let isCancelled = false;

    if (userId) {
      if (isPremium) {
        setBackendPremium(true);
        setRemainingCalls(null);
        setLoading(false);
        return;
      }

      setBackendPremium(false);

      // Mostrar un valor inmediato para evitar que el banner tarde en aparecer.
      setRemainingCalls((prev) =>
        prev === null ? FREE_TIER_TOTAL_LIMIT : Math.max(0, prev)
      );
      setLoading(true);
      loadUsageData(userId, () => isCancelled);
    } else {
      setRemainingCalls(null);
      setLoading(false);
    }
    return () => {
      isCancelled = true;
    };
  }, [userId, isPremium]);

  const loadUsageData = async (
    currentUserId: string,
    isCancelled: () => boolean
  ) => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      // 1) Cargar cache local primero para pintar contador rápido.
      const cachedData = await AsyncStorage.getItem(getAIUsageKey(currentUserId));
      if (!isCancelled()) {
        if (cachedData) {
          const usageData: AIUsageData = JSON.parse(cachedData);
          setRemainingCalls(Math.max(0, FREE_TIER_TOTAL_LIMIT - usageData.count));
        } else {
          setRemainingCalls(FREE_TIER_TOTAL_LIMIT);
        }
      }
    } catch (error) {
      if (!isCancelled()) {
        setRemainingCalls(FREE_TIER_TOTAL_LIMIT);
      }
      console.error('Error loading cached AI usage data:', error);
    }

    try {
      // 2) Sincronizar con backend en segundo plano y corregir contador.
      const backendUsage = await getAIUsage(currentUserId);
      if (isCancelled()) return;

      if (backendUsage.isPremium || isPremium) {
        setBackendPremium(true);
        setRemainingCalls(null);
        return;
      }

      setBackendPremium(false);

      if (backendUsage.remaining !== null) {
        const normalizedRemaining = Math.max(0, backendUsage.remaining);
        setRemainingCalls(normalizedRemaining);

        const usedFromBackend = Math.max(
          0,
          FREE_TIER_TOTAL_LIMIT - normalizedRemaining
        );
        await AsyncStorage.setItem(
          getAIUsageKey(currentUserId),
          JSON.stringify({ count: usedFromBackend })
        );
      }
    } catch (error) {
      if (!isCancelled()) {
        console.warn('Could not sync AI usage from backend, keeping local cache');
      }
    } finally {
      if (!isCancelled()) {
        setLoading(false);
      }
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    // Usuarios premium tienen uso ilimitado
    if (effectiveIsPremium) {
      return true;
    }

    // Si todavía estamos sincronizando estado con backend, no bloquear por cliente.
    if (loading) {
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
    if (effectiveIsPremium) return true;
    if (loading) return true;
    return remainingCalls !== null && remainingCalls > 0;
  };

  return {
    remainingCalls: effectiveIsPremium ? null : remainingCalls, // null significa ilimitado
    canUseAI,
    incrementUsage,
    loading,
    isPremium: effectiveIsPremium,
    dailyLimit: FREE_TIER_TOTAL_LIMIT,
  };
}
