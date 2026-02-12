import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import {
  Bell,
  Calendar,
  ChevronRight,
  Crown,
  Download,
  LogOut,
  Moon,
  Trash2,
  User,
  Utensils,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { logout as logoutService } from "../features/login/services/authService";
import { SubscriptionPlan } from "../models/subscription.model";
import { useAuthStore } from "../store/useAuthStore";
import { useNotificationSettingsStore } from "../store/useNotificationSettingsStore";
import { useNutritionStore } from "../store/useNutritionStore";
import { useSubscriptionStore } from "../store/useSubscriptionStore";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const userProfile = useNutritionStore((state) => state.userProfile);
  const isProfileComplete = useNutritionStore(
    (state) => state.isProfileComplete
  );

  const { theme, isDark, themeMode, setThemeMode } = useTheme();

  // Subscription store
  const subscription = useSubscriptionStore((state) => state.subscription);
  const isPremium = useSubscriptionStore((state) => state.isPremium);

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

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
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
                !isPremium && styles.settingRowBorder,
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
            FitTrack v1.0.0
          </Text>
          <Text style={[styles.appInfoText, { color: theme.textTertiary }]}>
            Tu compañero de entrenamiento personal
          </Text>
        </View>
      </ScrollView>
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
});
