import { useNavigation } from "@react-navigation/native";
import {
  Activity,
  Bell,
  Calendar,
  ChevronRight,
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
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { logout as logoutService } from "../features/login/services/authService";
import { useAuthStore } from "../store/useAuthStore";
import { useNotificationSettingsStore } from "../store/useNotificationSettingsStore";
import { useNutritionStore } from "../store/useNutritionStore";

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

  // Notification settings from store
  const restTimerNotificationsEnabled = useNotificationSettingsStore(
    (state) => state.restTimerNotificationsEnabled
  );
  const toggleRestTimerNotifications = useNotificationSettingsStore(
    (state) => state.toggleRestTimerNotifications
  );
  const workoutRemindersEnabled = useNotificationSettingsStore(
    (state) => state.workoutRemindersEnabled
  );
  const toggleWorkoutReminders = useNotificationSettingsStore(
    (state) => state.toggleWorkoutReminders
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

  const handleExportData = () => {
    navigation.navigate("ExportData");
  };

  const handleClearCache = () => {
    Alert.alert(
      "Limpiar Caché",
      "¿Estás seguro de que quieres limpiar el caché de la aplicación?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar",
          style: "destructive",
          onPress: () => {
            Alert.alert("Éxito", "Caché limpiado correctamente");
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

            {/* Workout Reminders */}
            <View style={styles.settingRow}>
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.warning + "20" },
                ]}
              >
                <Activity color={theme.warning} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Recordatorios de Entrenamiento
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Recordatorios para no olvidar entrenar
                </Text>
              </View>
              <Switch
                value={workoutRemindersEnabled}
                onValueChange={toggleWorkoutReminders}
                trackColor={{ false: theme.border, true: theme.primaryLight }}
                thumbColor={
                  workoutRemindersEnabled
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
            {/* Export Data */}
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

            {/* Clear Cache */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleClearCache}
            >
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.error + "20" },
                ]}
              >
                <Trash2 color={theme.error} size={20} />
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
                  Liberar espacio de almacenamiento
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
