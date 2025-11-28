import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Vibration,
  Dimensions,
  BackHandler,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";

const { width } = Dimensions.get("window");
const SCAN_AREA_SIZE = Math.min(width * 0.7, 300);

type Props = {
  onBarCodeScanned?: (data: string) => void;
  onCloseCamera?: () => void;
};

export default function ReusableCameraView({
  onBarCodeScanned,
  onCloseCamera,
}: Props) {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Flag para saber si el componente está montado
  const isMounted = useRef(true);

  // Cleanup al desmontar
  useEffect(() => {
    isMounted.current = true;
    // Reset scanned state cuando el componente se monta
    setScanned(false);
    setError(null);

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Manejar el botón de retroceso en Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isMounted.current) {
          onCloseCamera?.();
        }
        return true;
      }
    );

    return () => backHandler.remove();
  }, [onCloseCamera]);

  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!scanned && isMounted.current) {
        setScanned(true);
        Vibration.vibrate(100);

        // Pequeño delay para dar feedback visual
        setTimeout(() => {
          if (isMounted.current) {
            onBarCodeScanned?.(data);
          }
        }, 300);
      }
    },
    [scanned, onBarCodeScanned]
  );

  const handleCameraError = useCallback((error: any) => {
    if (isMounted.current) {
      console.error("Error en cámara:", error);
      const errorMessage = error?.message || error?.toString() || "Error desconocido";
      setError(`No se pudo iniciar la cámara: ${errorMessage}`);
      setCameraReady(false);
    }
  }, []);

  const handleCameraReady = useCallback(() => {
    if (isMounted.current) {
      console.log("Cámara lista");
      setCameraReady(true);
      setError(null);
    }
  }, []);

  const handleClose = () => {
    if (isMounted.current) {
      onCloseCamera?.();
    }
  };

  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission();
      if (!result.granted && isMounted.current) {
        setError("Permiso de cámara denegado. Actívalo en ajustes.");
      }
    } catch (err) {
      if (isMounted.current) {
        setError("Error al solicitar permisos");
      }
    }
  };

  const handleRetry = () => {
    if (isMounted.current) {
      setError(null);
      setScanned(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View
          style={[
            styles.permissionIconContainer,
            { backgroundColor: withOpacity(theme.primary, 10) },
          ]}
        >
          <Icon name="qr-code-scanner" size={80} color={theme.primary} />
        </View>
        <Text style={[styles.permissionTitle, { color: theme.text }]}>
          Permiso de Cámara
        </Text>
        <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
          Necesitamos acceso a tu cámara para escanear códigos de barras
        </Text>
        <TouchableOpacity
          onPress={handleRequestPermission}
          style={[
            styles.permissionButton,
            { backgroundColor: theme.primary, shadowColor: theme.primary },
          ]}
        >
          <Text style={styles.permissionButtonText}>Permitir Cámara</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleClose} style={styles.secondaryButton}>
          <Text
            style={[styles.secondaryButtonText, { color: theme.textSecondary }]}
          >
            Cancelar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View
          style={[
            styles.errorIconContainer,
            { backgroundColor: withOpacity(theme.error, 10) },
          ]}
        >
          <Icon name="error-outline" size={80} color={theme.error} />
        </View>
        <Text style={[styles.errorTitle, { color: theme.text }]}>Error</Text>
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>
          {error}
        </Text>

        <TouchableOpacity
          onPress={handleClose}
          style={[styles.errorButton, { backgroundColor: theme.error }]}
        >
          <Text style={styles.errorButtonText}>Cerrar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRetry} style={styles.secondaryButton}>
          <Text
            style={[styles.secondaryButtonText, { color: theme.textSecondary }]}
          >
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderCorner = (
    position: "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
  ) => {
    const styleMap = {
      topLeft: [
        styles.corner,
        styles.cornerTopLeft,
        { borderColor: theme.primary },
      ],
      topRight: [
        styles.corner,
        styles.cornerTopRight,
        { borderColor: theme.primary },
      ],
      bottomLeft: [
        styles.corner,
        styles.cornerBottomLeft,
        { borderColor: theme.primary },
      ],
      bottomRight: [
        styles.corner,
        styles.cornerBottomRight,
        { borderColor: theme.primary },
      ],
    };

    return <View style={styleMap[position]} />;
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={"back" as CameraType}
        ref={cameraRef}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        onMountError={handleCameraError}
        onCameraReady={handleCameraReady}
        barcodeScannerSettings={{
          barcodeTypes: [
            "aztec",
            "ean13",
            "ean8",
            "qr",
            "pdf417",
            "upc_e",
            "datamatrix",
            "code39",
            "code93",
            "itf14",
            "codabar",
            "code128",
            "upc_a",
          ],
        }}
      />

      {/* Header - Positioned absolutely over camera */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Icon name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Escanear Código</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Overlay - Positioned absolutely over camera */}
      <View style={styles.overlay}>
        <View style={[styles.overlaySection, styles.overlayTop]} />

        <View style={styles.overlayMiddle}>
          <View style={[styles.overlaySection, styles.overlaySide]} />

          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              {renderCorner("topLeft")}
              {renderCorner("topRight")}
              {renderCorner("bottomLeft")}
              {renderCorner("bottomRight")}

              <View
                style={[
                  styles.scanLine,
                  {
                    backgroundColor: theme.primary,
                    shadowColor: theme.primary,
                  },
                ]}
              />

              <View
                style={[
                  styles.scanGlow,
                  {
                    borderColor: withOpacity(theme.primary, 30),
                    shadowColor: theme.primary,
                  },
                ]}
              />
            </View>

            <Text style={styles.instructionText}>
              Coloca el código de barras dentro del marco
            </Text>
          </View>

          <View style={[styles.overlaySection, styles.overlaySide]} />
        </View>

        <View style={[styles.overlaySection, styles.overlayBottom]}>
          <View style={styles.bottomInfo}>
            <Icon name="info" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.helpText}>
              El escaneo es automático cuando el código está bien enfocado
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlaySection: {
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  overlayTop: {
    flex: 1.5,
  },
  overlayMiddle: {
    flexDirection: "row",
    height: SCAN_AREA_SIZE + 80,
  },
  overlaySide: {
    flex: 1,
  },
  overlayBottom: {
    flex: 2,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 30,
  },
  scanAreaContainer: {
    width: SCAN_AREA_SIZE,
    alignItems: "center",
    paddingVertical: 20,
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderWidth: 0,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.02)",
    position: "relative",
  },
  scanLine: {
    width: "100%",
    height: 3,
    position: "absolute",
    top: "50%",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  scanGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 5,
  },
  corner: {
    position: "absolute",
    width: 25,
    height: 25,
    opacity: 0.85,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  instructionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 25,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  bottomInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 40,
  },
  helpText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 40,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 15,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 15,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  errorButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 15,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
