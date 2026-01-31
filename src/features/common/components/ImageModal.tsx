import React from "react";
import { Image, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";

interface ImagenModalProps {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}

const ImageModal: React.FC<ImagenModalProps> = ({ uri, visible, onClose }) => {
  const { theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: withOpacity(theme.background, 95) },
        ]}
      >
        <Image
          source={{ uri: uri || "" }}
          style={styles.fullscreenImage}
          resizeMode="contain"
          testID="modal-image"
        />
        <TouchableOpacity
          testID="close-modal-button"
          style={[
            styles.closeButton,
            { backgroundColor: withOpacity(theme.text, 20) },
          ]}
          onPress={onClose}
        >
          <Icon name="close" size={30} color={theme.text} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ImageModal;
