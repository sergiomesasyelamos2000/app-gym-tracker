import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import ImageModal from "../features/common/components/ImageModal";
import { MessageBubble } from "../features/chat/components/MessageBubble";
import ReusableCameraView from "../features/common/components/ReusableCameraView";
import {
  addMessage,
  sendMessageThunk,
  sendPhotoThunk,
} from "../store/chatSlice";
import {
  useAppDispatch,
  useAppSelector,
} from "../features/common/hooks/useStore";
import { ChatInput } from "../features/chat/components/ChatInput";
import { useTheme } from "../contexts/ThemeContext";

export default function NutritionScreen() {
  const [chatInput, setChatInput] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false); // Estado para mostrar el spinner

  const messages = useAppSelector((state) => state.chat.messages);
  const loading = useAppSelector((state) => state.chat.loading);
  const dispatch = useAppDispatch();
  const { theme } = useTheme();

  const handleSend = async () => {
    if (!chatInput.trim() || loading) return;

    dispatch(addMessage({ id: Date.now(), text: chatInput, sender: "user" }));
    setChatInput("");
    setLoadingMessage(true); // Mostrar el spinner

    try {
      await dispatch(sendMessageThunk(chatInput));
    } finally {
      setLoadingMessage(false); // Ocultar el spinner
    }
  };

  const handlePhotoTaken = (photo: { uri: string }) => {
    setShowCamera(false);
    dispatch(
      addMessage({
        id: Date.now(),
        text: "📸 Imagen tomada:",
        sender: "user",
        imageUri: photo.uri,
      })
    );
    const formData = new FormData();
    formData.append("file", {
      uri: photo.uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as any);

    setLoadingMessage(true); // Mostrar el spinner

    dispatch(sendPhotoThunk(formData)).finally(() => {
      setLoadingMessage(false); // Ocultar el spinner
    });
  };

  const handleImagePress = (uri: string) => {
    setSelectedImageUri(uri);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundSecondary }]}>
      {showCamera ? (
        <ReusableCameraView
          onPhotoTaken={handlePhotoTaken}
          onCloseCamera={() => setShowCamera(false)}
        />
      ) : (
        <View style={styles.container}>
          <View style={[styles.header, { backgroundColor: theme.primary }]}>
            <Text style={styles.headerTitle}>Nutrición</Text>
            <Text style={[styles.headerSubtitle, { color: "#E0F2FE" }]}>
              Crea dietas personalizadas con la ayuda de tu asistente de IA.
            </Text>
          </View>
          <ScrollView style={styles.chatContainer}>
            {messages.map((msg: any) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onImagePress={handleImagePress}
              />
            ))}
            {loadingMessage && (
              <View style={[styles.spinnerContainer, { backgroundColor: theme.card }]}>
                <Text style={[styles.spinnerText, { color: theme.text }]}>Pensando...</Text>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            )}
          </ScrollView>
          <ChatInput
            value={chatInput}
            onChangeText={setChatInput}
            onSend={handleSend}
            onOpenCamera={() => setShowCamera(true)}
            loading={loading}
          />
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  chatContainer: {
    flex: 1,
    marginBottom: 16,
  },
  spinnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  spinnerText: {
    fontSize: 16,
    marginRight: 8,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: "80%",
  },
  userBubble: {
    backgroundColor: "#4CAF50",
    alignSelf: "flex-end",
  },
  botBubble: {
    backgroundColor: "#e0f2fe",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 12,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#a5d6a7",
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
});
