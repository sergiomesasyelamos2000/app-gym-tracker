import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import React, { useState, useRef, useCallback } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

type Photo = { uri: string };

type Props = {
  onPhotoTaken?: (photo: Photo) => void;
  onBarCodeScanned?: (data: string) => void;
  onCloseCamera?: () => void;
};

export default function ReusableCameraView({
  onPhotoTaken,
  onBarCodeScanned,
  onCloseCamera,
}: Props) {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [scanned, setScanned] = useState(false);

  // Cambiar cámara (frontal/trasera)
  const toggleCameraFacing = useCallback(() => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  }, []);

  // Tomar foto
  const takePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      onPhotoTaken?.(photo);
    }
  };

  // Escanear código de barras
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!scanned) {
      setScanned(true);
      onBarCodeScanned?.(data);
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Icon name="camera-off" size={50} color="gray" />
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          <Icon name="lock-open" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
        onBarcodeScanned={handleBarCodeScanned}
      >
        {/* Botón cerrar */}
        <TouchableOpacity style={styles.closeButton} onPress={onCloseCamera}>
          <Icon name="close" size={30} color="white" />
        </TouchableOpacity>

        {/* Controles inferiores */}
        <View style={styles.buttonContainer}>
          {/* Botón captura */}
          <TouchableOpacity style={styles.circularButton} onPress={takePhoto}>
            <View style={styles.innerCircle} />
          </TouchableOpacity>

          {/* Botón flip cámara */}
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraFacing}
          >
            <Icon name="flip-camera-ios" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  circularButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  innerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "red",
  },
  flipButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "gray",
    borderRadius: 5,
  },
});
