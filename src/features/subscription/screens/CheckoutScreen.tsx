import React, { useMemo, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../common/components/ScreenHeader";
import { CheckoutSkeleton } from "../components/CheckoutSkeleton";
import {
  getMySubscription,
  verifyPayment,
} from "../services/subscriptionService";
import { useSubscriptionStore } from "../../../store/useSubscriptionStore";
import type { SubscriptionStatusResponse } from "@sergiomesasyelamos2000/shared";
import { SubscriptionPlan } from "@sergiomesasyelamos2000/shared";
import { getErrorMessage } from "../../../types";
import type { BaseNavigation, CaughtError } from "../../../types";
import type { SubscriptionStackParamList } from "./SubscriptionStack";
import { Theme, useTheme } from "../../../contexts/ThemeContext";

type CheckoutScreenRouteProp = RouteProp<
  SubscriptionStackParamList,
  "CheckoutScreen"
>;

type WebViewUrlEvent = {
  nativeEvent: { url?: string };
};

const isIgnorableCheckoutUrl = (url: string) =>
  !url || url === "about:blank";

export function CheckoutScreen() {
  const navigation = useNavigation<BaseNavigation>();
  const route = useRoute<CheckoutScreenRouteProp>();
  const params = route.params;
  const webViewRef = useRef<WebView>(null);
  const hasStartedVerificationRef = useRef(false);
  const hasFinishedFirstLoadRef = useRef(false);
  const latestStartUrlRef = useRef<string | null>(null);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [showCheckoutSkeleton, setShowCheckoutSkeleton] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const { setSubscription } = useSubscriptionStore();
  const isIos = Platform.OS === "ios";

  const handleLoadStart = (event: WebViewUrlEvent) => {
    const url = event.nativeEvent?.url ?? "";
    if (!isIgnorableCheckoutUrl(url)) {
      latestStartUrlRef.current = url;
    }
    if (hasFinishedFirstLoadRef.current) return;
    if (isIgnorableCheckoutUrl(url)) return;
    setShowCheckoutSkeleton(true);
  };

  const finishFirstLoad = (event: WebViewUrlEvent) => {
    const url = event.nativeEvent?.url ?? "";
    if (isIgnorableCheckoutUrl(url)) return;
    if (latestStartUrlRef.current && url !== latestStartUrlRef.current) {
      return;
    }
    if (hasFinishedFirstLoadRef.current) return;
    hasFinishedFirstLoadRef.current = true;
    setShowCheckoutSkeleton(false);
  };

  const handleLoadError = (event: WebViewUrlEvent) => {
    if (hasFinishedFirstLoadRef.current) return;
    const url = event.nativeEvent?.url ?? "";
    if (isIgnorableCheckoutUrl(url) && latestStartUrlRef.current) {
      return;
    }
    hasFinishedFirstLoadRef.current = true;
    setShowCheckoutSkeleton(false);
  };

  const resetCheckoutLoader = () => {
    hasFinishedFirstLoadRef.current = false;
    latestStartUrlRef.current = null;
    setShowCheckoutSkeleton(true);
  };

  const openStatusScreen = (success: boolean) => {
    const state = navigation.getState() as any;
    const routeNames: string[] = state?.routeNames || [];

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

    navigation.navigate("SubscriptionStack" as any, {
      screen: "StatusScreen",
      params: success ? { success: true } : {},
    });
  };

  const delay = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const isExpectedPlanActive = (
    plan: SubscriptionPlan,
    expectedPlan: SubscriptionPlan
  ) => {
    if (expectedPlan === SubscriptionPlan.MONTHLY) {
      return (
        plan === SubscriptionPlan.MONTHLY ||
        plan === SubscriptionPlan.YEARLY ||
        plan === SubscriptionPlan.LIFETIME
      );
    }

    return plan === expectedPlan;
  };

  const refreshSubscriptionWithRetries = async (
    expectedPlan: SubscriptionPlan,
    retries: number = 8
  ): Promise<SubscriptionStatusResponse> => {
    let latestData: SubscriptionStatusResponse | null = null;

    for (let attempt = 0; attempt < retries; attempt += 1) {
      const data = await getMySubscription();
      latestData = data;
      setSubscription(data);

      if (isExpectedPlanActive(data.subscription.plan, expectedPlan)) {
        return data;
      }

      await delay(1500);
    }

    if (latestData) {
      return latestData;
    }

    throw new Error("No se pudo obtener el estado de suscripción");
  };

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    const { url } = navState;
    const queryString = url.includes("?") ? url.split("?")[1] : "";
    const urlParams = new URLSearchParams(queryString);
    const sessionIdFromUrl = urlParams.get("session_id");
    const hasSuccessSignal =
      url.includes("/subscription/success") || Boolean(sessionIdFromUrl);

    if (hasSuccessSignal && !hasStartedVerificationRef.current) {
      hasStartedVerificationRef.current = true;
      setVerifying(true);

      try {
        const verificationId = sessionIdFromUrl || params.sessionId;

        if (verificationId) {
          await verifyPayment(verificationId, params.planId);
        }

        await refreshSubscriptionWithRetries(params.planId);

        // Keep verifying=true until replace unmounts this screen so the
        // WebView does not remount uncovered during the transition.
        openStatusScreen(true);
      } catch (error: CaughtError) {
        setVerifying(false);
        resetCheckoutLoader();
        Alert.alert(
          "No se pudo confirmar la suscripción",
          getErrorMessage(error) ||
            "El pago puede haberse completado, pero todavía no pudimos confirmar el cambio de plan. Espera unos segundos y reintenta.",
          [
            {
              text: "Reintentar",
              onPress: () => {
                hasStartedVerificationRef.current = false;
                void handleNavigationStateChange(navState);
              },
            },
            {
              text: "Ver suscripción",
              onPress: () => {
                openStatusScreen(false);
              },
            },
          ]
        );
      }
    }

    if (url.includes("/subscription/cancel")) {
      Alert.alert("Pago Cancelado", "Has cancelado el proceso de pago.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancelar Pago",
      "¿Estás seguro de que quieres cancelar el proceso de pago?",
      [
        { text: "Continuar con el Pago", style: "cancel" },
        {
          text: "Cancelar",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    const requestUrl = request?.url || "";

    if (requestUrl.startsWith("about:srcdoc")) {
      return false;
    }

    return true;
  };

  if (verifying) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenHeader
          title="Pago Seguro"
          mode="close"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.verifyingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.verifyingText}>Verificando pago...</Text>
          <Text style={styles.verifyingSubtext}>
            Por favor espera mientras confirmamos tu compra
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isIos) {
    const goToApplePlans = () => {
      const state = navigation.getState() as
        | { routeNames?: string[] }
        | undefined;
      const routeNames = state?.routeNames || [];

      if (routeNames.includes("PlansScreen")) {
        navigation.dispatch(StackActions.replace("PlansScreen"));
        return;
      }

      navigation.navigate("SubscriptionStack" as never, {
        screen: "PlansScreen",
      } as never);
    };

    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenHeader
          title="Pago Seguro"
          mode="close"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.verifyingContainer}>
          <Text style={styles.verifyingText}>Compra con App Store</Text>
          <Text style={styles.verifyingSubtext}>
            En iPhone y iPad, Premium se compra con In-App Purchase de la App
            Store. El checkout web no está disponible en iOS.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={goToApplePlans}>
            <Text style={styles.backButtonText}>Ver planes de App Store</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryBackButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title="Pago Seguro"
        mode="close"
        onBack={handleCancel}
      />

      <View style={styles.body}>
        <WebView
          ref={webViewRef}
          source={{ uri: params.checkoutUrl }}
          style={styles.webView}
          onLoadStart={handleLoadStart}
          onLoadEnd={finishFirstLoad}
          onError={handleLoadError}
          onHttpError={handleLoadError}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
        />

        {showCheckoutSkeleton ? (
          <View style={styles.skeletonLayer}>
            <CheckoutSkeleton />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    body: {
      flex: 1,
    },
    webView: {
      flex: 1,
    },
    skeletonLayer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.background,
      zIndex: 2,
    },
    verifyingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    verifyingText: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    verifyingSubtext: {
      marginTop: 8,
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
    },
    backButton: {
      marginTop: 20,
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    backButtonText: {
      color: theme.onPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    secondaryBackButton: {
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    secondaryBackButtonText: {
      color: theme.textSecondary,
      fontSize: 15,
      fontWeight: "600",
    },
  });
