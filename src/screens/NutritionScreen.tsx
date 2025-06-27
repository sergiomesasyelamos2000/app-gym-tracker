import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Modal,
} from "react-native";
import Markdown from "react-native-markdown-display";
import Icon from "react-native-vector-icons/MaterialIcons";
import ReusableCameraView from "../components/ReusableCameraView";

export default function NutritionScreen() {
  const [chatInput, setChatInput] = useState("");
  type Message = {
    id: number;
    text: string;
    sender: string;
    imageUri?: string;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "¡Hola! Soy tu asistente de nutrición. ¿Cómo puedo ayudarte hoy?",
      sender: "bot",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false); // Estado para mostrar la cámara
  const [modalVisible, setModalVisible] = useState(false); // Estado para el modal
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null); // URI de la imagen seleccionada

  const handleImagePress = (uri: string) => {
    setSelectedImageUri(uri);
    setModalVisible(true); // Mostrar el modal
  };

  const sendMessage = async () => {
    if (chatInput.trim() === "" || loading) return;

    const userMsg = {
      id: messages.length + 1,
      text: chatInput,
      sender: "user",
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setLoading(true);

    try {
      const res = await fetch(
        "https://bfb5-79-116-226-78.ngrok-free.app/api/nutrition",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chatInput }),
        }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const { reply } = await res.json();

      const botMsg = {
        id: messages.length + 2,
        text: reply,
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      const errMsg = {
        id: messages.length + 2,
        text: "🚫 Hubo un error conectando con el servidor.",
        sender: "bot",
      };
      setMessages((prev) => [...prev, errMsg]);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoTaken = (photo: { uri: string }) => {
    setShowCamera(false); // Oculta la cámara

    // Agregar la imagen al chat
    const imageMsg = {
      id: messages.length + 1,
      text: "📸 Imagen tomada:",
      sender: "user",
      imageUri: photo.uri, // Agregar la URI de la imagen
    };
    setMessages((prev) => [...prev, imageMsg]);

    // Agregar mensaje al chat indicando que se está procesando la foto
    const processingMsg = {
      id: messages.length + 2,
      text: "📸 Procesando la foto...",
      sender: "bot",
    };
    setMessages((prev) => [...prev, processingMsg]);

    const formData = new FormData();
    formData.append("file", {
      uri: photo.uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as any);

    console.log("Enviando foto al backend:", formData);

    // Enviar la foto al backend
    (async () => {
      try {
        const res = await fetch(
          "https://bfb5-79-116-226-78.ngrok-free.app/api/nutrition/photo",
          {
            method: "POST",
            body: formData,
          }
        );

        // Verificar si la respuesta es válida
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const jsonResponse = await res.json(); // Parsear directamente como JSON

        console.log("Respuesta del servidor:", jsonResponse);

        // Formatear la respuesta del servidor
        const { items } = jsonResponse;
        const formattedResponse = `🍴 Alimento reconocido: ${items.name}\n📊 Información nutricional:\n- Calorías: ${items.calories} kcal\n- Proteínas: ${items.proteins.quantity} ${items.proteins.unit}\n- Carbohidratos: ${items.carbs.quantity} ${items.carbs.unit}\n- Grasas: ${items.fats.quantity} ${items.fats.unit}\n- Tamaño de porción: ${items.servingSize} g`;

        // Agregar la respuesta al chat
        const botMsg = {
          id: messages.length + 3,
          text: formattedResponse,
          sender: "bot",
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch (e) {
        const errMsg = {
          id: messages.length + 3,
          text: "🚫 Hubo un error procesando la respuesta del servidor.",
          sender: "bot",
        };
        setMessages((prev) => [...prev, errMsg]);
        console.error(e);
      }
    })();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {showCamera ? (
        <ReusableCameraView
          onPhotoTaken={handlePhotoTaken}
          onCloseCamera={() => setShowCamera(false)}
        />
      ) : (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nutrición</Text>
            <Text style={styles.headerSubtitle}>
              Crea dietas personalizadas con la ayuda de tu asistente de IA.
            </Text>
          </View>

          <ScrollView style={styles.chatContainer}>
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  message.sender === "user"
                    ? styles.userBubble
                    : styles.botBubble,
                ]}
              >
                {message.imageUri ? (
                  <View>
                    <Text style={styles.messageText}>{message.text}</Text>
                    <Image
                      source={{ uri: message.imageUri }}
                      style={styles.imagePreview}
                    />
                  </View>
                ) : message.sender === "bot" ? (
                  <Markdown>{message.text}</Markdown>
                ) : (
                  <Text style={styles.messageText}>{message.text}</Text>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribe tu mensaje..."
              value={chatInput}
              onChangeText={setChatInput}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={loading}
            >
              <Icon name="send" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => setShowCamera(true)} // Muestra la cámara
            >
              <Icon name="image" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal para mostrar la imagen ampliada */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Image
            source={{ uri: selectedImageUri || "" }}
            style={styles.fullscreenImage}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Icon name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#e0f2fe",
    marginTop: 4,
  },
  chatContainer: {
    flex: 1,
    marginBottom: 16,
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
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: "90%",
    height: "70%",
    resizeMode: "contain",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
  },
});
