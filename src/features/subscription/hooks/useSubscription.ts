import { useEffect, useCallback } from 'react';
import { useSubscriptionStore } from '../../../store/useSubscriptionStore';
import { getMySubscription } from '../services/subscriptionService';

export function useSubscription() {
  const {
    subscription,
    features,
    isPremium,
    isLoading,
    setSubscription,
    setLoading,
    needsRefresh,
    canAccessFeature,
    getDaysRemaining,
    isExpired,
    isCanceled,
  } = useSubscriptionStore();

  /**
   * Fetches subscription status from the server
   */
  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMySubscription();
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [setSubscription, setLoading]);

  /**
   * Refreshes subscription if cache is stale
   */
  const refresh = useCallback(async () => {
    if (needsRefresh()) {
      await fetchSubscription();
    }
  }, [fetchSubscription, needsRefresh]);

  /**
   * Load subscription on mount if needed
   */
  useEffect(() => {
    if (!subscription || needsRefresh()) {
      fetchSubscription();
    }
  }, []);

  return {
    subscription,
    features,
    isPremium,
    isLoading,
    canAccessFeature,
    getDaysRemaining: getDaysRemaining(),
    isExpired: isExpired(),
    isCanceled: isCanceled(),
    refresh,
    fetchSubscription,
  };
}
