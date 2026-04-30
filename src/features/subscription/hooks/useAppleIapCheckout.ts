import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { StackActions, useNavigation } from "@react-navigation/native";
import {
  deepLinkToSubscriptions,
  getReceiptDataIOS,
  requestReceiptRefreshIOS,
  useIAP,
  type Purchase,
} from "expo-iap";
import { SubscriptionPlan } from "@sergiomesasyelamos2000/shared";
import { useAuthStore } from "../../../store/useAuthStore";
import { useSubscriptionStore } from "../../../store/useSubscriptionStore";
import {
  APPLE_IAP_LIFETIME_IDS,
  APPLE_IAP_PRODUCT_IDS,
  APPLE_IAP_SUBSCRIPTION_IDS,
  hasAppleIapConfiguration,
  verifyApplePurchase,
} from "../services/appleIapService";
import { getErrorMessage } from "../../../types";
import type { BaseNavigation } from "../../../types";

const isIos = Platform.OS === "ios";

export function useAppleIapCheckout() {
  const navigation = useNavigation<BaseNavigation>();
  const user = useAuthStore((state) => state.user);
  const setSubscription = useSubscriptionStore((state) => state.setSubscription);
  const [loading, setLoading] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const finishTransactionRef = useRef<
    | ((args: { purchase: Purchase; isConsumable?: boolean }) => Promise<void>)
    | null
  >(null);

  const openStatusScreen = (success: boolean) => {
    const state = navigation.getState() as
      | { routeNames?: string[] }
      | undefined;
    const routeNames = state?.routeNames || [];

    if (routeNames.includes("StatusScreen")) {
      navigation.dispatch(
        StackActions.replace("StatusScreen", success ? { success: true } : {})
      );
      return;
    }

    if (routeNames.includes("SubscriptionStatus")) {
      navigation.dispatch(
        StackActions.replace(
          "SubscriptionStatus",
          success ? { success: true } : {}
        )
      );
      return;
    }

    navigation.navigate("SubscriptionStack" as never, {
      screen: "StatusScreen",
      params: success ? { success: true } : {},
    } as never);
  };

  const {
    connected,
    subscriptions,
    products,
    fetchProducts,
    requestPurchase,
    restorePurchases,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        const receiptData =
          (await getReceiptDataIOS()) || (await requestReceiptRefreshIOS());

        if (!receiptData) {
          throw new Error("No se pudo obtener el recibo de Apple.");
        }

        const verified = await verifyApplePurchase({
          receiptData,
          productId: purchase.productId,
          transactionId:
            "transactionId" in purchase && purchase.transactionId
              ? purchase.transactionId
              : purchase.id,
          purchaseToken: purchase.purchaseToken || undefined,
        });

        setSubscription(verified);
        await finishTransactionRef.current?.({
          purchase,
          isConsumable: false,
        });
        openStatusScreen(true);
        Alert.alert("Compra completada", "Tu acceso Premium ya esta activo.");
      } catch (error) {
        Alert.alert(
          "No se pudo validar la compra",
          getErrorMessage(error) ||
            "La compra se realizo, pero no pudimos verificarla todavia."
        );
      } finally {
        setLoading(false);
      }
    },
    onPurchaseError: (error) => {
      setLoading(false);
      Alert.alert(
        "Error en la compra",
        error.message || "No se pudo completar la compra."
      );
    },
    onError: (error) => {
      setLoading(false);
      Alert.alert(
        "Error",
        getErrorMessage(error) ||
          "No se pudo conectar con la App Store en este momento."
      );
    },
  });

  finishTransactionRef.current = finishTransaction;

  useEffect(() => {
    if (!isIos || !connected || !hasAppleIapConfiguration()) {
      setProductsLoaded(false);
      return;
    }

    let cancelled = false;

    const loadProducts = async () => {
      try {
        if (APPLE_IAP_SUBSCRIPTION_IDS.length > 0) {
          await fetchProducts({
            skus: APPLE_IAP_SUBSCRIPTION_IDS,
            type: "subs",
          });
        }

        if (APPLE_IAP_LIFETIME_IDS.length > 0) {
          await fetchProducts({
            skus: APPLE_IAP_LIFETIME_IDS,
            type: "in-app",
          });
        }

        if (!cancelled) {
          setProductsLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setProductsLoaded(false);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [connected, fetchProducts]);

  const purchasePlan = async (plan: SubscriptionPlan) => {
    if (!isIos) {
      throw new Error("Apple IAP solo esta disponible en iOS.");
    }

    if (!user?.id) {
      Alert.alert("Error", "Debes iniciar sesion para comprar Premium.");
      return;
    }

    if (!hasAppleIapConfiguration()) {
      Alert.alert(
        "IAP no configurado",
        "Faltan los product IDs de Apple en la configuracion de la app."
      );
      return;
    }

    const productId = APPLE_IAP_PRODUCT_IDS[plan];
    if (!productId) {
      Alert.alert(
        "Producto no disponible",
        "Este plan no tiene un producto de App Store configurado."
      );
      return;
    }

    const availableProductIds = [
      ...subscriptions.map((product) => product.id),
      ...products.map((product) => product.id),
    ];

    if (!availableProductIds.includes(productId)) {
      Alert.alert(
        "Producto no cargado",
        "La App Store todavia no ha cargado este plan. Intentalo de nuevo en unos segundos."
      );
      return;
    }

    setLoading(true);

    try {
      await requestPurchase({
        request: {
          apple: {
            sku: productId,
            appAccountToken: user.id,
            andDangerouslyFinishTransactionAutomatically: false,
          },
        },
        type: plan === SubscriptionPlan.LIFETIME ? "in-app" : "subs",
      });
    } catch (error) {
      setLoading(false);
      Alert.alert(
        "Error",
        getErrorMessage(error) ||
          "No se pudo iniciar la compra en la App Store."
      );
    }
  };

  const restoreApplePurchases = async () => {
    if (!isIos) return;

    setLoading(true);
    try {
      await restorePurchases({ alsoPublishToEventListenerIOS: true });
      const receiptData =
        (await requestReceiptRefreshIOS()) || (await getReceiptDataIOS());

      if (!receiptData) {
        throw new Error("No se encontro un recibo de Apple para restaurar.");
      }

      const verified = await verifyApplePurchase({ receiptData });
      setSubscription(verified);
      openStatusScreen(false);
      Alert.alert(
        "Compras restauradas",
        "Hemos sincronizado tu suscripcion desde la App Store."
      );
    } catch (error) {
      Alert.alert(
        "No se pudieron restaurar las compras",
        getErrorMessage(error) || "Intentalo de nuevo en unos segundos."
      );
    } finally {
      setLoading(false);
    }
  };

  const openAppleSubscriptionManagement = async () => {
    if (!isIos) return;

    try {
      await deepLinkToSubscriptions();
    } catch (error) {
      Alert.alert(
        "No se pudo abrir Suscripciones",
        getErrorMessage(error) ||
          "Abre Ajustes > tu Apple ID > Suscripciones manualmente."
      );
    }
  };

  return {
    connected,
    loading,
    productsLoaded,
    subscriptions,
    products,
    purchasePlan,
    restoreApplePurchases,
    openAppleSubscriptionManagement,
    hasConfiguration: hasAppleIapConfiguration(),
  };
}
