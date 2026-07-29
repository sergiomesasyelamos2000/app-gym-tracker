import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { StackActions, useNavigation } from "@react-navigation/native";
import {
  deepLinkToSubscriptions,
  ErrorCode,
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

const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;
  if (!("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

const isUserCancelledPurchase = (error: unknown): boolean => {
  const code = getErrorCode(error);
  if (code === ErrorCode.UserCancelled || code === "user-cancelled") {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("user cancelled") ||
    message.includes("user canceled") ||
    message.includes("cancelled the purchase") ||
    message.includes("canceled the purchase")
  );
};

const getApplePurchaseErrorMessage = (error: unknown): string => {
  const code = getErrorCode(error);

  switch (code) {
    case ErrorCode.NetworkError:
    case "network-error":
      return "Comprueba tu conexion e intentalo de nuevo.";
    case ErrorCode.ItemUnavailable:
    case ErrorCode.SkuNotFound:
    case "item-unavailable":
    case "sku-not-found":
      return "Este plan no esta disponible ahora mismo.";
    case ErrorCode.AlreadyOwned:
    case ErrorCode.DuplicatePurchase:
    case "already-owned":
    case "duplicate-purchase":
      return "Ya tienes este plan. Prueba a restaurar compras.";
    case ErrorCode.BillingUnavailable:
    case ErrorCode.IapNotAvailable:
    case "billing-unavailable":
    case "iap-not-available":
      return "Las compras no estan disponibles en este dispositivo.";
    case ErrorCode.ServiceError:
    case ErrorCode.ServiceTimeout:
    case ErrorCode.RemoteError:
    case "service-error":
    case "service-timeout":
    case "remote-error":
      return "La App Store no responde ahora mismo. Intentalo de nuevo en unos segundos.";
    default:
      return "No se pudo completar la compra. Intentalo de nuevo.";
  }
};

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

      if (isUserCancelledPurchase(error)) {
        return;
      }

      Alert.alert(
        "No se pudo completar la compra",
        getApplePurchaseErrorMessage(error)
      );
    },
    onError: (error) => {
      setLoading(false);

      if (isUserCancelledPurchase(error)) {
        return;
      }

      Alert.alert(
        "No se pudo conectar con la App Store",
        "Intentalo de nuevo en unos segundos."
      );
    },
  });

  finishTransactionRef.current = finishTransaction;

  useEffect(() => {
    if (!connected || !hasAppleIapConfiguration()) {
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
    } catch {
      setLoading(false);
    }
  };

  const restoreApplePurchases = async () => {
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
      if (isUserCancelledPurchase(error)) {
        return;
      }

      Alert.alert(
        "No se pudieron restaurar las compras",
        "Intentalo de nuevo en unos segundos."
      );
    } finally {
      setLoading(false);
    }
  };

  const openAppleSubscriptionManagement = async () => {
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
