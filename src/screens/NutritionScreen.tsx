import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { ChatInput } from "../features/chat/components/ChatInput";
import { MessageBubble } from "../features/chat/components/MessageBubble";
import ImageModal from "../features/common/components/ImageModal";
import {
  useAppDispatch,
  useAppSelector,
} from "../features/common/hooks/useStore";
import {
  addMessage,
  loadChatHistory,
  Message,
  saveChatHistory,
  sendMessageThunk,
  sendPhotoThunk,
} from "../store/chatSlice";
import { useAuthStore } from "../store/useAuthStore";
import { useAIUsageLimit } from "../hooks/useAIUsageLimit";
import { useNavigation } from "@react-navigation/native";
import { Crown } from "lucide-react-native";

// Typing indicator component with animated dots
const TypingIndicator = ({ theme }: { theme: any }) => {
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
        ]),
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
  }, []);

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
      style={[styles.typingIndicatorContainer, { backgroundColor: theme.card }]}
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

// Empty state component
const EmptyState = ({ theme }: { theme: any }) => (
  <View style={styles.emptyStateContainer}>
    <Ionicons
      name="nutrition-outline"
      size={80}
      color={theme.textSecondary}
      style={styles.emptyStateIcon}
    />
    <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
      ¡Hola! Soy tu asistente de nutrición
    </Text>
    <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
      Puedo ayudarte a crear dietas personalizadas, calcular macros, y mucho
      más. ¿En qué puedo ayudarte hoy?
    </Text>
    <View style={styles.suggestionsContainer}>
      <View style={[styles.suggestionChip, { backgroundColor: theme.card }]}>
        <Text style={[styles.suggestionText, { color: theme.text }]}>
          💪 Crear plan de dieta
        </Text>
      </View>
      <View style={[styles.suggestionChip, { backgroundColor: theme.card }]}>
        <Text style={[styles.suggestionText, { color: theme.text }]}>
          📊 Calcular macros
        </Text>
      </View>
      <View style={[styles.suggestionChip, { backgroundColor: theme.card }]}>
        <Text style={[styles.suggestionText, { color: theme.text }]}>
          📸 Analizar comida
        </Text>
      </View>
    </View>
  </View>
);

export default function NutritionScreen() {
  const [chatInput, setChatInput] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messages = useAppSelector((state) => state.chat.messages);
  const loading = useAppSelector((state) => state.chat.loading);
  const nextId = useAppSelector((state) => state.chat.nextId);
  const user = useAuthStore((state) => state.user);
  const dispatch = useAppDispatch();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();

  // Hook para límite de uso de IA
  const { remainingCalls, canUseAI, incrementUsage, isPremium, dailyLimit } = useAIUsageLimit();

  const flatListRef = useRef<FlatList>(null);
  const scrollButtonOpacity = useRef(new Animated.Value(0)).current;

  // Load chat history on mount
  useEffect(() => {
    if (user?.id) {
      dispatch(loadChatHistory(user.id));
    }
  }, [user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Save chat history when messages change
  useEffect(() => {
    if (messages.length > 1 && user?.id) {
      const state = { messages, loading, nextId };
      dispatch(saveChatHistory({ state: state as any, userId: user.id }));
    }
  }, [messages, nextId, user?.id]);

  // Animate scroll button appearance
  useEffect(() => {
    Animated.timing(scrollButtonOpacity, {
      toValue: showScrollButton ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showScrollButton]);

  const handleSend = async () => {
    if (!chatInput.trim() || loading) return;

    // Verificar límite de uso para usuarios gratuitos
    if (!canUseAI()) {
      Alert.alert(
        "Límite Alcanzado",
        `Has alcanzado el límite de ${dailyLimit} consultas diarias en el plan gratuito. Actualiza a Premium para consultas ilimitadas.`,
        [
          {
            text: "Actualizar a Premium",
            onPress: () => {
              navigation.navigate("SubscriptionStack", {
                screen: "PlansScreen",
              });
            },
          },
          { text: "Cancelar", style: "cancel" },
        ]
      );
      return;
    }

    const messageText = chatInput;
    dispatch(addMessage({ text: messageText, sender: "user" }));
    setChatInput("");
    setLoadingMessage(true);

    try {
      // Incrementar uso antes de enviar
      const allowed = await incrementUsage();
      if (!allowed) {
        Alert.alert(
          "Límite Alcanzado",
          `Has alcanzado el límite de ${dailyLimit} consultas diarias. El límite se restablecerá mañana.`
        );
        return;
      }

      await dispatch(sendMessageThunk({ text: messageText, userId: user?.id }));
    } catch (error) {
      console.error("❌ Error sending message:", error);
    } finally {
      setLoadingMessage(false);
    }
  };

  const handleImagePicker = async () => {
    // Verificar límite de uso para usuarios gratuitos
    if (!canUseAI()) {
      Alert.alert(
        "Límite Alcanzado",
        `Has alcanzado el límite de ${dailyLimit} consultas diarias en el plan gratuito. Actualiza a Premium para análisis ilimitados.`,
        [
          {
            text: "Actualizar a Premium",
            onPress: () => {
              navigation.navigate("SubscriptionStack", {
                screen: "PlansScreen",
              });
            },
          },
          { text: "Cancelar", style: "cancel" },
        ]
      );
      return;
    }

    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permisos necesarios",
          "Necesitamos permisos para acceder a tus fotos",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Incrementar uso antes de enviar
        const allowed = await incrementUsage();
        if (!allowed) {
          Alert.alert(
            "Límite Alcanzado",
            `Has alcanzado el límite de ${dailyLimit} consultas diarias. El límite se restablecerá mañana.`
          );
          return;
        }

        const photo = result.assets[0];
        dispatch(
          addMessage({
            text: "📸 Imagen seleccionada:",
            sender: "user",
            imageUri: photo.uri,
          }),
        );

        const formData = new FormData();
        formData.append("file", {
          uri: photo.uri,
          name: "photo.jpg",
          type: "image/jpeg",
        } as any);

        setLoadingMessage(true);
        dispatch(sendPhotoThunk(formData)).finally(() => {
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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    setShowScrollButton(
      !isAtBottom && contentSize.height > layoutMeasurement.height,
    );
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const renderMessage: ListRenderItem<Message> = useCallback(
    ({ item }) => (
      <MessageBubble message={item} onImagePress={handleImagePress} />
    ),
    [handleImagePress],
  );

  const renderEmptyComponent = useCallback(
    () => <EmptyState theme={theme} />,
    [theme],
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.backgroundSecondary }]}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <View style={styles.headerContent}>
            <Ionicons name="nutrition" size={32} color="#fff" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Nutrición IA</Text>
              <Text style={[styles.headerSubtitle, { color: "#E0F2FE" }]}>
                Tu asistente personalizado
              </Text>
            </View>
          </View>
        </View>

        {/* Banner de uso de IA para usuarios gratuitos */}
        {!isPremium && remainingCalls !== null && (
          <TouchableOpacity
            style={[
              styles.usageBanner,
              {
                backgroundColor: remainingCalls > 3 ? theme.info + "20" : theme.warning + "20",
                borderColor: remainingCalls > 3 ? theme.info : theme.warning,
              },
            ]}
            onPress={() => {
              navigation.navigate("SubscriptionStack", {
                screen: "PlansScreen",
              });
            }}
            activeOpacity={0.7}
          >
            <View style={styles.usageBannerContent}>
              <View style={styles.usageBannerLeft}>
                <Ionicons
                  name={remainingCalls > 3 ? "information-circle" : "warning"}
                  size={20}
                  color={remainingCalls > 3 ? theme.info : theme.warning}
                />
                <Text
                  style={[
                    styles.usageBannerText,
                    { color: remainingCalls > 3 ? theme.info : theme.warning },
                  ]}
                >
                  {remainingCalls > 0
                    ? `${remainingCalls} de ${dailyLimit} consultas restantes hoy`
                    : "Límite diario alcanzado"}
                </Text>
              </View>
              <View style={styles.usageBannerRight}>
                <Crown size={16} color={theme.warning} />
                <Text style={[styles.upgradeBannerText, { color: theme.warning }]}>
                  Actualizar
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.chatWrapper}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => `msg-${item.id}`}
            contentContainerStyle={[
              styles.chatContentContainer,
              messages.length === 0 && { flexGrow: 1 },
            ]}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={renderEmptyComponent}
            ListFooterComponent={
              loadingMessage ? <TypingIndicator theme={theme} /> : null
            }
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
              >
                <Ionicons name="arrow-down" size={24} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <ChatInput
          value={chatInput}
          onChangeText={setChatInput}
          onSend={handleSend}
          onOpenCamera={handleImagePicker}
          loading={loading}
        />
      </KeyboardAvoidingView>
      <ImageModal
        uri={selectedImageUri}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.9,
  },
  usageBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  usageBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  usageBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  usageBannerText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  usageBannerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  upgradeBannerText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chatWrapper: {
    flex: 1,
    position: "relative",
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContentContainer: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyStateIcon: {
    marginBottom: 24,
    opacity: 0.6,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Typing indicator styles
  typingIndicatorContainer: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  // Scroll to bottom button
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
