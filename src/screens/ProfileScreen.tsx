import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import {
  Bell,
  Brain,
  Calendar,
  ChevronRight,
  Crown,
  Download,
  ExternalLink,
  LogOut,
  Moon,
  Shield,
  Trash2,
  User,
  Utensils,
} from "lucide-react-native";
import React, { useState } from "react";
import type { BaseNavigation } from "../types/common";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import {
  deleteAccount as deleteAccountService,
  logout as logoutService,
  updateUserProfile as updateUserProfileService,
} from "../features/login/services/authService";
import { SubscriptionPlan } from "@sergiomesasyelamos2000/shared";
import { useAuthStore } from "../store/useAuthStore";
import { useNotificationSettingsStore } from "../store/useNotificationSettingsStore";
import { useNutritionStore } from "../store/useNutritionStore";
import { useSubscriptionStore } from "../store/useSubscriptionStore";

const PRIVACY_POLICY_URL = "https://evofitofficial.lovable.app/privacy";

const AI_DATA_SHARING_DETAILS = [
  {
    title: "Chat de nutrición y entrenamiento",
    provider: "Google Gemini y Groq",
    description:
      "Cuando usas el chat con IA, EvoFit puede enviar tu mensaje, el historial reciente de la conversación y un contexto resumido de tu perfil para personalizar la respuesta.",
    dataShared:
      "Texto del mensaje, historial reciente, edad, peso, altura, nivel de actividad, objetivos de calorías y macros, resumen de rutinas, sesiones recientes, frecuencia de entrenamiento e identificador interno de usuario.",
  },
  {
    title: "Análisis de fotos de comida",
    provider: "Google Gemini",
    description:
      "Cuando analizas una foto de comida, EvoFit envía la imagen para identificar alimentos y estimar calorías y macronutrientes.",
    dataShared:
      "Imagen subida por el usuario y metadatos técnicos mínimos del archivo, como el tipo de imagen.",
  },
];

const NON_SHARED_WITH_AI = [
  "Contraseña, tokens de autenticación y datos de pago no se envían a proveedores de IA.",
  "Nombre y email no se incluyen en las solicitudes de IA para el chat o el análisis de fotos, salvo que el usuario los escriba manualmente en su mensaje o aparezcan en una imagen subida.",
];

export default function ProfileScreen() {
  const navigation = useNavigation<BaseNavigation>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedPicture, setEditedPicture] = useState<string | undefined>(
    undefined
  );
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);
  const userProfile = useNutritionStore((state) => state.userProfile);
  const isProfileComplete = useNutritionStore(
    (state) => state.isProfileComplete
  );

  const { theme, isDark, themeMode, setThemeMode } = useTheme();

  // Subscription store
  const subscription = useSubscriptionStore((state) => state.subscription);
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const clearSubscription = useSubscriptionStore(
    (state) => state.clearSubscription
  );

  // Notification settings from store
  const restTimerNotificationsEnabled = useNotificationSettingsStore(
    (state) => state.restTimerNotificationsEnabled
  );
  const toggleRestTimerNotifications = useNotificationSettingsStore(
    (state) => state.toggleRestTimerNotifications
  );

  const handleEditNutritionProfile = () => {
    if (isProfileComplete()) {
      navigation.navigate("Macros", {
        screen: "EditNutritionProfileScreen",
      });
    } else {
      Alert.alert(
        "Perfil de Nutrición",
        "Aún no has configurado tu perfil de nutrición. ¿Deseas configurarlo ahora?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Configurar",
            onPress: () => {
              if (user?.id) {
                navigation.navigate("Macros", {
                  screen: "UserProfileSetupScreen",
                  params: { userId: user.id },
                });
              }
            },
          },
        ]
      );
    }
  };

  const handleThemeChange = async (value: boolean) => {
    await setThemeMode(value ? "dark" : "light");
  };

  const openEditProfileModal = () => {
    if (!user) return;
    setEditedName(user.name || "");
    setEditedEmail(user.email || "");
    setEditedPicture(user.picture);
    setIsEditModalVisible(true);
  };

  const closeEditProfileModal = () => {
    if (isSavingProfile) return;
    setIsEditModalVisible(false);
  };

  const handlePickProfileImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permisos necesarios",
          "Necesitamos permisos para acceder a tus fotos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: "base64",
        });
        setEditedPicture(`data:image/jpeg;base64,${base64}`);
      }
    } catch (error) {
      console.error("Error selecting profile image:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    const trimmedName = editedName.trim();
    const trimmedEmail = editedEmail.trim().toLowerCase();

    if (!trimmedName) {
      Alert.alert("Nombre requerido", "El nombre no puede estar vacío.");
      return;
    }

    if (!trimmedEmail) {
      Alert.alert("Email requerido", "El email no puede estar vacío.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert("Email inválido", "Introduce un correo electrónico válido.");
      return;
    }

    try {
      setIsSavingProfile(true);
      const updatedUser = await updateUserProfileService(user.id, {
        name: trimmedName,
        email: trimmedEmail,
        picture: editedPicture,
      });

      updateUser(updatedUser);
      setIsEditModalVisible(false);
      Alert.alert(
        "Perfil actualizado",
        "Tus datos se han guardado correctamente."
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Error",
        "No se pudo actualizar el perfil. Inténtalo de nuevo."
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSubscription = () => {
    if (isPremium) {
      navigation.navigate("SubscriptionStatus");
    } else {
      navigation.navigate("PlansScreen");
    }
  };

  const handleExportData = () => {
    navigation.navigate("ExportData");
  };

  const handleOpenPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (error) {
      Alert.alert(
        "No se pudo abrir la política",
        "Inténtalo de nuevo en unos segundos."
      );
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Limpiar Caché",
      "Se eliminarán los siguientes datos del dispositivo:\n\n• Ejercicios guardados\n• Rutinas offline\n• Datos temporales\n\n¿Deseas continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Limpiar",
          style: "destructive",
          onPress: async () => {
            try {
              // Get all keys from AsyncStorage
              const keys = await AsyncStorage.getAllKeys();

              // Filter keys to remove (cache-related keys)
              const cacheKeys = keys.filter(
                (key) =>
                  key.includes("cache") ||
                  key.includes("exercises") ||
                  key.includes("offline") ||
                  key.includes("last_sync")
              );

              // Remove cache keys
              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
              }

              Alert.alert(
                "Caché Limpiada",
                `Se eliminaron ${cacheKeys.length} elementos de la caché. La app cargará datos frescos la próxima vez que te conectes.`,
                [{ text: "OK" }]
              );
            } catch (error) {
              Alert.alert(
                "Error",
                "No se pudo limpiar la caché. Intenta de nuevo.",
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Cerrar sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logoutService();
            } catch (error) {
              console.error("Error al cerrar sesión:", error);
            } finally {
              await logout();
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    if (!user?.id || isDeletingAccount) return;

    Alert.alert(
      "Eliminar cuenta",
      "Esta acción eliminará permanentemente tu cuenta y tus datos asociados. No se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmación final",
              "¿Seguro que quieres eliminar tu cuenta de EvoFit permanentemente?",
              [
                { text: "No", style: "cancel" },
                {
                  text: "Eliminar cuenta",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      setIsDeletingAccount(true);
                      await deleteAccountService(user.id);
                      clearSubscription();
                      await logout();
                    } catch (error) {
                      console.error("Error deleting account:", error);
                      Alert.alert(
                        "Error",
                        "No se pudo eliminar la cuenta. Inténtalo de nuevo."
                      );
                    } finally {
                      setIsDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={theme.background}
          hidden={false}
          translucent={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.backgroundSecondary}
        hidden={false}
        translucent={false}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Perfil
          </Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <View style={styles.avatarContainer}>
            {user.picture ? (
              <Image
                source={{ uri: user.picture }}
                style={[styles.avatar, { borderColor: theme.primary }]}
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: theme.primary },
                ]}
              >
                <User color="#FFFFFF" size={48} />
              </View>
            )}
          </View>

          <Text style={[styles.userName, { color: theme.text }]}>
            {user.name}
          </Text>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
            {user.email}
          </Text>

          <TouchableOpacity
            style={[
              styles.editProfileButton,
              {
                backgroundColor: theme.primary + "20",
                borderColor: theme.primary,
              },
            ]}
            onPress={openEditProfileModal}
          >
            <Text
              style={[styles.editProfileButtonText, { color: theme.primary }]}
            >
              Editar perfil
            </Text>
          </TouchableOpacity>

          {user.createdAt && (
            <View style={styles.joinedContainer}>
              <Calendar color={theme.textSecondary} size={16} />
              <Text style={[styles.joinedText, { color: theme.textSecondary }]}>
                Miembro desde {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Premium/Subscription Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {isPremium ? "SUSCRIPCIÓN" : "ACTUALIZAR A PREMIUM"}
          </Text>

          <TouchableOpacity
            style={[
              styles.settingCard,
              {
                backgroundColor: theme.card,
                borderColor: isPremium ? theme.border : theme.warning + "40",
                borderWidth: 1,
              },
            ]}
            onPress={handleSubscription}
          >
            <View style={styles.settingRow}>
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.warning + "20" },
                ]}
              >
                <Crown color={theme.warning} size={24} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  {isPremium
                    ? "Gestionar Suscripción"
                    : "🚀 Desbloquear Premium"}
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {isPremium
                    ? `Plan ${
                        subscription?.plan === SubscriptionPlan.LIFETIME
                          ? "de por Vida"
                          : subscription?.plan === SubscriptionPlan.YEARLY
                          ? "Anual"
                          : "Mensual"
                      } · Activo`
                    : "Rutinas ilimitadas, AI, y más"}
                </Text>
              </View>
              <ChevronRight color={theme.textTertiary} size={20} />
            </View>

            {!isPremium && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.divider, marginVertical: 12 },
                ]}
              />
            )}
            {!isPremium && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.warning, fontWeight: "600" },
                  ]}
                >
                  ✨ Prueba todas las funciones premium
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Nutrition Profile Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PERFIL DE NUTRICIÓN
          </Text>

          <TouchableOpacity
            style={[
              styles.settingCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={handleEditNutritionProfile}
          >
            <View style={styles.settingRow}>
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.primaryLight + "20" },
                ]}
              >
                <Utensils color={theme.primary} size={24} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  {isProfileComplete()
                    ? "Editar Perfil de Nutrición"
                    : "Configurar Perfil de Nutrición"}
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {isProfileComplete()
                    ? "Actualiza tus datos y objetivos de macros"
                    : "Completa tu perfil para empezar"}
                </Text>
              </View>
              <ChevronRight color={theme.textTertiary} size={20} />
            </View>

            {isProfileComplete() && userProfile && (
              <>
                <View
                  style={[styles.divider, { backgroundColor: theme.divider }]}
                />
                <View style={styles.nutritionStats}>
                  <View style={styles.statItem}>
                    <Text
                      style={[styles.statLabel, { color: theme.textSecondary }]}
                    >
                      Objetivo
                    </Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {userProfile.goals.weightGoal === "lose"
                        ? "Perder peso"
                        : userProfile.goals.weightGoal === "gain"
                        ? "Ganar peso"
                        : "Mantener peso"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: theme.divider },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <Text
                      style={[styles.statLabel, { color: theme.textSecondary }]}
                    >
                      Calorías
                    </Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {Math.round(userProfile.macroGoals.dailyCalories)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: theme.divider },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <Text
                      style={[styles.statLabel, { color: theme.textSecondary }]}
                    >
                      Peso
                    </Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {userProfile.anthropometrics.weight} kg
                    </Text>
                  </View>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            GENERAL
          </Text>

          <View
            style={[
              styles.settingsGroup,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {/* Dark Mode */}
            <View
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderBottomColor: theme.divider },
              ]}
            >
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.primaryLight + "20" },
                ]}
              >
                <Moon color={theme.primary} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Modo Oscuro
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {themeMode === "auto"
                    ? "Automático (Sistema)"
                    : isDark
                    ? "Activado"
                    : "Desactivado"}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleThemeChange}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={isDark ? theme.primary : theme.inputBackground}
              />
            </View>

            {/* Rest Timer Notifications */}
            <View
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderBottomColor: theme.divider },
              ]}
            >
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.info + "20" },
                ]}
              >
                <Bell color={theme.info} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Notificaciones de Descanso
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Alertas cuando termina el tiempo de descanso
                </Text>
              </View>
              <Switch
                value={restTimerNotificationsEnabled}
                onValueChange={toggleRestTimerNotifications}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={
                  restTimerNotificationsEnabled
                    ? theme.primary
                    : theme.inputBackground
                }
              />
            </View>
          </View>
        </View>

        {/* Data Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            DATOS
          </Text>

          <View
            style={[
              styles.settingsGroup,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {/* Export Data - Only for Premium */}
            {isPremium && (
              <TouchableOpacity
                style={[
                  styles.settingRow,
                  styles.settingRowBorder,
                  { borderBottomColor: theme.divider },
                ]}
                onPress={handleExportData}
              >
                <View
                  style={[
                    styles.settingIconContainer,
                    { backgroundColor: theme.success + "20" },
                  ]}
                >
                  <Download color={theme.success} size={20} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>
                    Exportar Datos
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Descarga tus datos de nutrición y entrenamiento
                  </Text>
                </View>
                <ChevronRight color={theme.textTertiary} size={20} />
              </TouchableOpacity>
            )}

            {/* Clear Cache - Available for all users */}
            <TouchableOpacity
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderBottomColor: theme.divider },
              ]}
              onPress={handleClearCache}
            >
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.warning + "20" },
                ]}
              >
                <Trash2 color={theme.warning} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Limpiar Caché
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Elimina ejercicios y datos guardados offline
                </Text>
              </View>
              <ChevronRight color={theme.textTertiary} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderBottomColor: theme.divider },
              ]}
              onPress={() => setIsPrivacyModalVisible(true)}
            >
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.info + "20" },
                ]}
              >
                <Shield color={theme.info} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Privacidad y datos
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Qué datos se comparten con IA y terceros
                </Text>
              </View>
              <ChevronRight color={theme.textTertiary} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleOpenPrivacyPolicy}
            >
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.primary + "20" },
                ]}
              >
                <ExternalLink color={theme.primary} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Política de privacidad
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Consulta la política completa en la web oficial
                </Text>
              </View>
              <ChevronRight color={theme.textTertiary} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            CUENTA
          </Text>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.error + "25",
                marginBottom: 12,
              },
            ]}
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
          >
            <View style={styles.logoutContent}>
              {isDeletingAccount ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <Trash2 color={theme.error} size={20} />
              )}
              <Text style={[styles.logoutText, { color: theme.error }]}>
                {isDeletingAccount ? "Eliminando cuenta..." : "Eliminar cuenta"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              { backgroundColor: theme.card, borderColor: theme.error + "40" },
            ]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <View style={styles.logoutContent}>
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <LogOut color={theme.error} size={20} />
              )}
              <Text style={[styles.logoutText, { color: theme.error }]}>
                {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: theme.textTertiary }]}>
            EvoFit v1.0.0
          </Text>
          <Text style={[styles.appInfoText, { color: theme.textTertiary }]}>
            Tu compañero de entrenamiento personal
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditProfileModal}
        statusBarTranslucent={Platform.OS === "android"}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Editar perfil
            </Text>

            <TouchableOpacity
              style={styles.modalAvatarContainer}
              onPress={handlePickProfileImage}
            >
              {editedPicture ? (
                <Image
                  source={{ uri: editedPicture }}
                  style={[styles.modalAvatar, { borderColor: theme.primary }]}
                />
              ) : (
                <View
                  style={[
                    styles.modalAvatarPlaceholder,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <User color="#FFFFFF" size={28} />
                </View>
              )}
              <Text
                style={[styles.modalAvatarHint, { color: theme.textSecondary }]}
              >
                Cambiar foto
              </Text>
            </TouchableOpacity>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>
                Nombre
              </Text>
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Tu nombre"
                placeholderTextColor={theme.textTertiary}
                style={[
                  styles.modalInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundSecondary,
                  },
                ]}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>
                Email
              </Text>
              <TextInput
                value={editedEmail}
                onChangeText={setEditedEmail}
                placeholder="email@ejemplo.com"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.modalInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundSecondary,
                  },
                ]}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={closeEditProfileModal}
                disabled={isSavingProfile}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                    Guardar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPrivacyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPrivacyModalVisible(false)}
        statusBarTranslucent={Platform.OS === "android"}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              styles.privacyModalCard,
              { backgroundColor: theme.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Privacidad y datos
            </Text>

            <ScrollView
              style={styles.privacyScroll}
              contentContainerStyle={styles.privacyScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.privacyIntroCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.privacyIntroHeader}>
                  <Brain color={theme.primary} size={18} />
                  <Text
                    style={[styles.privacyIntroTitle, { color: theme.text }]}
                  >
                    Uso de IA de terceros
                  </Text>
                </View>
                <Text
                  style={[
                    styles.privacyParagraph,
                    { color: theme.textSecondary },
                  ]}
                >
                  EvoFit utiliza proveedores externos de IA para el chat de
                  nutrición y entrenamiento, y para el análisis de fotos de
                  comida.
                </Text>
                <Text
                  style={[
                    styles.privacyParagraph,
                    { color: theme.textSecondary },
                  ]}
                >
                  Puedes consultar esta información en Perfil &gt; Datos &gt;
                  Privacidad y datos.
                </Text>
              </View>

              {AI_DATA_SHARING_DETAILS.map((item) => (
                <View
                  key={item.title}
                  style={[
                    styles.privacyDetailCard,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.privacyCardTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.privacyProvider,
                      { color: theme.primary },
                    ]}
                  >
                    Proveedor: {item.provider}
                  </Text>
                  <Text
                    style={[
                      styles.privacyParagraph,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {item.description}
                  </Text>
                  <Text style={[styles.privacyLabel, { color: theme.text }]}>
                    Datos compartidos
                  </Text>
                  <Text
                    style={[
                      styles.privacyParagraph,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {item.dataShared}
                  </Text>
                </View>
              ))}

              <View
                style={[
                  styles.privacyDetailCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.privacyCardTitle, { color: theme.text }]}>
                  Datos que no compartimos con IA
                </Text>
                {NON_SHARED_WITH_AI.map((item) => (
                  <Text
                    key={item}
                    style={[
                      styles.privacyBullet,
                      { color: theme.textSecondary },
                    ]}
                  >
                    • {item}
                  </Text>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setIsPrivacyModalVisible(false)}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Cerrar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleOpenPrivacyPolicy}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                  Ver política
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  profileCard: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 12,
  },
  editProfileButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  editProfileButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  joinedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  joinedText: {
    fontSize: 14,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  settingCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsGroup: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  nutritionStats: {
    flexDirection: "row",
    paddingTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    marginHorizontal: 8,
  },
  logoutButton: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  appInfo: {
    marginTop: 40,
    alignItems: "center",
  },
  appInfoText: {
    fontSize: 12,
    marginBottom: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
  },
  privacyModalCard: {
    maxHeight: "82%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  privacyScroll: {
    maxHeight: 520,
  },
  privacyScrollContent: {
    paddingBottom: 8,
  },
  privacyIntroCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  privacyIntroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  privacyIntroTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  privacyDetailCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  privacyCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  privacyProvider: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  privacyLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  privacyParagraph: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  privacyBullet: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  modalAvatarContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    marginBottom: 8,
  },
  modalAvatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  modalAvatarHint: {
    fontSize: 13,
    fontWeight: "500",
  },
  modalField: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "500",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
