import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MealType,
  RecognizeFoodResponseDto,
  FoodEntryResponseDto as FoodEntry,
} from "@sergiomesasyelamos2000/shared";
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import { Theme, useTheme } from "../contexts/ThemeContext";
import { useFocusedStatusBar } from "../hooks/useFocusedStatusBar";
import { withOpacity } from "../utils/themeStyles";
import { AddRecognizedFoodModal } from "../features/chat/components/AddRecognizedFoodModal";
import { ChatInput } from "../features/chat/components/ChatInput";
import { MessageBubble } from "../features/chat/components/MessageBubble";
import { NutritionChatEmptyState } from "../features/chat/components/NutritionChatEmptyState";
import { NutritionChatHeader } from "../features/chat/components/NutritionChatHeader";
import { NutritionChatSkeleton } from "../features/chat/components/NutritionChatSkeleton";
import ImageModal from "../features/common/components/ImageModal";
import {
  LOW_QUERY_THRESHOLD,
  nutritionChatQuotaBadge,
} from "../features/chat/nutritionChatCopy";
import { useAIUsageLimit } from "../hooks/useAIUsageLimit";
import { useAuthStore } from "../store/useAuthStore";
import { useNutritionStore } from "../store/useNutritionStore";
import { addFoodEntry as addFoodEntryToDiary } from "../features/nutrition/services/nutritionService";
import {
  selectLoading,
  useChatStore,
  useMessages,
} from "../store/useChatStore";
import type { Message } from "../store/useChatStore";
import type { BaseNavigation } from "../types";

const TypingIndicator = ({ theme }: { theme: Theme }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = animateDot(dot1, 0);
    const animation2 = animateDot(dot2, 150);
    const animation3 = animateDot(dot3, 300);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (animValue: Animated.Value) => ({
    opacity: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
    ],
  });

  return (
    <View
      style={[
        styles.typingIndicatorContainer,
        {
          backgroundColor: withOpacity(theme.primary, 6),
          borderColor: withOpacity(theme.primary, 16),
        },
      ]}
    >
      <View style={styles.typingIndicatorContent}>
        <Animated.View
          style={[
            styles.typingDot,
            { backgroundColor: theme.primary },
            dotStyle(dot1),
          ]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            { backgroundColor: theme.primary },
            dotStyle(dot2),
          ]}
        />
        <Animated.View
          style={[
            styles.typingDot,
            { backgroundColor: theme.primary },
            dotStyle(dot3),
          ]}
        />
      </View>
    </View>
  );
};

export default function NutritionScreen() {
  const [chatInput, setChatInput] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [pendingFood, setPendingFood] =
    useState<RecognizeFoodResponseDto | null>(null);
  const [pendingMealType, setPendingMealType] = useState<MealType>("lunch");
  const [pendingGrams, setPendingGrams] = useState("");
  const [savingRecognizedFood, setSavingRecognizedFood] = useState(false);

  const messages = useMessages();
  const loading = useChatStore(selectLoading);
  const user = useAuthStore((state) => state.user);

  const addMessage = useChatStore((state) => state.addMessage);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const sendPhoto = useChatStore((state) => state.sendPhoto);
  const setCurrentUser = useChatStore((state) => state.setCurrentUser);
  const addLocalFoodEntry = useNutritionStore((state) => state.addFoodEntry);

  const { theme } = useTheme();
  useFocusedStatusBar("light-content");
  const navigation = useNavigation<BaseNavigation>();

  const {
    remainingCalls,
    canUseAI,
    incrementUsage,
    isPremium,
    dailyLimit,
    loading: usageLoading,
  } = useAIUsageLimit();

  const flatListRef = useRef<FlatList>(null);
  const scrollButtonOpacity = useRef(new Animated.Value(0)).current;

  const openPlans = useCallback(() => {
    navigation.navigate("SubscriptionStack", {
      screen: "PlansScreen",
    });
  }, [navigation]);

  const quotaBadge = useMemo(() => {
    if (isPremium) return null;
    return nutritionChatQuotaBadge(remainingCalls, dailyLimit);
  }, [isPremium, remainingCalls, dailyLimit]);

  const showCrown =
    !isPremium &&
    remainingCalls !== null &&
    remainingCalls <= LOW_QUERY_THRESHOLD;

  useEffect(() => {
    if (user?.id) {
      setCurrentUser(user.id);
    }
  }, [user?.id, setCurrentUser]);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    Animated.timing(scrollButtonOpacity, {
      toValue: showScrollButton ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showScrollButton, scrollButtonOpacity]);

  const showLimitAlert = useCallback(
    (forPhoto: boolean) => {
      Alert.alert(
        "Límite Alcanzado",
        forPhoto
          ? `Has alcanzado el límite de ${dailyLimit} consultas en el plan gratuito. Actualiza a Premium para análisis ilimitados.`
          : `Has alcanzado el límite de ${dailyLimit} consultas en el plan gratuito. Actualiza a Premium para consultas ilimitadas.`,
        [
          {
            text: "Actualizar a Premium",
            onPress: openPlans,
          },
          { text: "Cancelar", style: "cancel" },
        ]
      );
    },
    [dailyLimit, openPlans]
  );

  const submitMessage = useCallback(
    async (rawText: string, clearComposer: boolean) => {
      if (!rawText.trim() || loading) return;

      if (!canUseAI()) {
        showLimitAlert(false);
        return;
      }

      if (!user?.id) {
        Alert.alert("Error", "Debes iniciar sesión para usar el chat");
        return;
      }

      const messageText = rawText.trim();
      addMessage({ text: messageText, sender: "user" }, user.id);
      if (clearComposer) {
        setChatInput("");
      }
      setLoadingMessage(true);

      try {
        const allowed = await incrementUsage();
        if (!allowed) {
          Alert.alert(
            "Límite Alcanzado",
            `Has alcanzado el límite de ${dailyLimit} consultas en el plan gratuito.`
          );
          return;
        }

        await sendMessage(messageText, user.id);
      } catch (error) {
        console.error("❌ Error sending message:", error);
      } finally {
        setLoadingMessage(false);
      }
    },
    [
      loading,
      canUseAI,
      showLimitAlert,
      user?.id,
      addMessage,
      incrementUsage,
      dailyLimit,
      sendMessage,
    ]
  );

  const handleSend = async () => {
    await submitMessage(chatInput, true);
  };

  const handleImagePicker = async () => {
    if (!canUseAI()) {
      showLimitAlert(true);
      return;
    }

    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permisos necesarios",
          "Necesitamos permisos para acceder a tus fotos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (!user?.id) {
          Alert.alert("Error", "Debes iniciar sesión para usar el chat");
          return;
        }

        const allowed = await incrementUsage();
        if (!allowed) {
          Alert.alert(
            "Límite Alcanzado",
            `Has alcanzado el límite de ${dailyLimit} consultas en el plan gratuito.`
          );
          return;
        }

        const photo = result.assets[0];
        addMessage(
          {
            text: "📸 Imagen seleccionada:",
            sender: "user",
            imageUri: photo.uri,
          },
          user.id
        );

        const formData = new FormData();
        const fileBlob: { uri: string; name: string; type: string } = {
          uri: photo.uri,
          name: "photo.jpg",
          type: "image/jpeg",
        };
        formData.append("file", fileBlob as unknown as Blob);

        setLoadingMessage(true);
        sendPhoto(formData, user.id).finally(() => {
          setLoadingMessage(false);
        });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  };

  const handleImagePress = useCallback((uri: string) => {
    setSelectedImageUri(uri);
    setModalVisible(true);
  }, []);

  const getTodayDateString = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
  };

  const normalizeNameForCode = (name: string) =>
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const saveRecognizedFoodToDiary = async (
    food: RecognizeFoodResponseDto,
    mealType: MealType,
    grams: number
  ) => {
    if (!user?.id) {
      Alert.alert("Error", "Debes iniciar sesión");
      return;
    }

    const productCodeBase = normalizeNameForCode(food.name || "alimento");
    const productCode = `ai-${productCodeBase || "food"}-${Date.now()}`;

    const baseServingSize = Number(food.servingSize || 0);
    const safeBaseServing = baseServingSize > 0 ? baseServingSize : grams;
    const ratio =
      safeBaseServing > 0 && grams > 0 ? grams / safeBaseServing : 1;

    const payload = {
      userId: user.id,
      productCode,
      productName: food.name || "Alimento detectado",
      date: getTodayDateString(),
      mealType,
      quantity: Math.max(1, Math.round(grams)),
      unit: "gram" as const,
      calories: Math.max(0, Math.round(Number(food.calories || 0) * ratio)),
      protein: Math.max(0, Number(food.proteins || 0) * ratio),
      carbs: Math.max(0, Number(food.carbs || 0) * ratio),
      fat: Math.max(0, Number(food.fats || 0) * ratio),
    };

    try {
      const saved = await addFoodEntryToDiary(payload);
      addLocalFoodEntry(saved as FoodEntry);
      Alert.alert("Añadido", `${payload.productName} guardado en el diario`, [
        {
          text: "Ver en Macros",
          onPress: () => navigation.navigate("Macros"),
        },
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error saving recognized food:", error);
      Alert.alert("Error", "No se pudo guardar el alimento en el diario");
    }
  };

  const closeAddFoodModal = () => {
    setShowAddFoodModal(false);
    setPendingFood(null);
    setPendingGrams("");
    setPendingMealType("lunch");
  };

  const handleConfirmAddRecognizedFood = async () => {
    if (!pendingFood) return;
    const parsed = Number(pendingGrams.replace(",", "."));
    const defaultGrams = Math.round(Number(pendingFood.servingSize || 100));
    const safeGrams =
      Number.isFinite(parsed) && parsed > 0
        ? parsed
        : Math.max(1, defaultGrams);

    try {
      setSavingRecognizedFood(true);
      await saveRecognizedFoodToDiary(pendingFood, pendingMealType, safeGrams);
      closeAddFoodModal();
    } finally {
      setSavingRecognizedFood(false);
    }
  };

  const handleAddRecognizedFood = (food: RecognizeFoodResponseDto) => {
    const suggestedGrams = Math.round(Number(food.servingSize || 100));
    setPendingFood(food);
    setPendingMealType("lunch");
    setPendingGrams(String(Math.max(1, suggestedGrams)));
    setShowAddFoodModal(true);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    setShowScrollButton(
      !isAtBottom && contentSize.height > layoutMeasurement.height
    );
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const renderMessage: ListRenderItem<Message> = useCallback(
    ({ item }) => (
      <MessageBubble
        message={item}
        onImagePress={handleImagePress}
        onAddRecognizedFood={handleAddRecognizedFood}
      />
    ),
    [handleImagePress]
  );

  const renderEmptyComponent = useCallback(
    () => (
      <NutritionChatEmptyState
        onSendPrompt={(text) => {
          void submitMessage(text, false);
        }}
        onPickPhoto={() => {
          void handleImagePicker();
        }}
        disabled={loading || loadingMessage}
      />
    ),
    [submitMessage, loading, loadingMessage]
  );

  const hasUserMessage = messages.some((message) => message.sender === "user");

  const renderListFooter = useCallback(
    () => (
      <>
        {!hasUserMessage ? (
          <NutritionChatEmptyState
            onSendPrompt={(text) => {
              void submitMessage(text, false);
            }}
            onPickPhoto={() => {
              void handleImagePicker();
            }}
            disabled={loading || loadingMessage}
          />
        ) : null}
        {loadingMessage ? <TypingIndicator theme={theme} /> : null}
      </>
    ),
    [hasUserMessage, submitMessage, loading, loadingMessage, theme]
  );

  if (usageLoading) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={[styles.safeArea, { backgroundColor: theme.primary }]}
      >
        <NutritionChatSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: theme.primary }]}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <NutritionChatHeader
          quotaBadge={quotaBadge}
          showCrown={showCrown}
          onPressPlans={openPlans}
        />

        <View style={styles.chatWrapper}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => `msg-${item.id}`}
            contentContainerStyle={[
              styles.chatContentContainer,
              !hasUserMessage && { flexGrow: 1 },
            ]}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={renderEmptyComponent}
            ListFooterComponent={renderListFooter}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
          />

          {showScrollButton && (
            <Animated.View
              style={[
                styles.scrollToBottomButton,
                { opacity: scrollButtonOpacity },
              ]}
            >
              <TouchableOpacity
                onPress={scrollToBottom}
                style={[
                  styles.scrollToBottomButtonInner,
                  { backgroundColor: theme.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ir al final del chat"
              >
                <Ionicons name="arrow-down" size={24} color={theme.onPrimary} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <ChatInput
          value={chatInput}
          onChangeText={setChatInput}
          onSend={handleSend}
          onPickPhoto={handleImagePicker}
          loading={loading}
        />
      </KeyboardAvoidingView>
      <ImageModal
        uri={selectedImageUri}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
      <AddRecognizedFoodModal
        visible={showAddFoodModal}
        foodName={pendingFood?.name || "Alimento"}
        mealType={pendingMealType}
        grams={pendingGrams}
        saving={savingRecognizedFood}
        onChangeMealType={setPendingMealType}
        onChangeGrams={setPendingGrams}
        onCancel={closeAddFoodModal}
        onSave={() => {
          void handleConfirmAddRecognizedFood();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  chatWrapper: {
    flex: 1,
    position: "relative",
  },
  chatContentContainer: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  scrollToBottomButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
  scrollToBottomButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  typingIndicatorContainer: {
    alignSelf: "flex-start",
    marginVertical: 8,
    marginHorizontal: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: "80%",
  },
  typingIndicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
