/**
 * ProfileScreen - User profile and settings
 *
 * Shows user information, settings, and logout functionality
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../store/useAuthStore";
import { useNutritionStore } from "../store/useNutritionStore";
import { logout as logoutService } from "../features/login/services/authService";
import { LogOut, Mail, User, Calendar, Utensils, ChevronRight } from "lucide-react-native";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const userProfile = useNutritionStore((state) => state.userProfile);
  const isProfileComplete = useNutritionStore(
    (state) => state.isProfileComplete
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
              // Call backend logout endpoint
              await logoutService();
            } catch (error) {
              console.error("Error al cerrar sesión:", error);
            } finally {
              // Clear local auth state regardless of backend response
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C3BAA" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User color="#FFFFFF" size={48} />
              </View>
            )}
          </View>

          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          {user.createdAt && (
            <View style={styles.joinedContainer}>
              <Calendar color="#64748B" size={16} />
              <Text style={styles.joinedText}>
                Miembro desde {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de la cuenta</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <User color="#6C3BAA" size={20} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nombre completo</Text>
                <Text style={styles.infoValue}>{user.name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Mail color="#6C3BAA" size={20} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nutrition Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perfil de Nutrición</Text>

          <TouchableOpacity
            style={styles.nutritionCard}
            onPress={handleEditNutritionProfile}
          >
            <View style={styles.nutritionHeader}>
              <View style={styles.nutritionIconContainer}>
                <Utensils color="#6C3BAA" size={24} />
              </View>
              <View style={styles.nutritionContent}>
                <Text style={styles.nutritionTitle}>
                  {isProfileComplete()
                    ? "Editar Perfil de Nutrición"
                    : "Configurar Perfil de Nutrición"}
                </Text>
                <Text style={styles.nutritionSubtitle}>
                  {isProfileComplete()
                    ? "Actualiza tus datos y objetivos"
                    : "Completa tu perfil para empezar"}
                </Text>
              </View>
              <ChevronRight color="#94A3B8" size={20} />
            </View>

            {isProfileComplete() && userProfile && (
              <>
                <View style={styles.divider} />
                <View style={styles.nutritionStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Objetivo</Text>
                    <Text style={styles.statValue}>
                      {userProfile.goals.weightGoal === "lose"
                        ? "Perder peso"
                        : userProfile.goals.weightGoal === "gain"
                        ? "Ganar peso"
                        : "Mantener peso"}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Calorías diarias</Text>
                    <Text style={styles.statValue}>
                      {Math.round(userProfile.macroGoals.dailyCalories)} kcal
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Peso actual</Text>
                    <Text style={styles.statValue}>
                      {userProfile.anthropometrics.weight} kg
                    </Text>
                  </View>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones</Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <View style={styles.logoutContent}>
              {isLoggingOut ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <LogOut color="#DC2626" size={20} />
              )}
              <Text style={styles.logoutText}>
                {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>FitTrack v1.0.0</Text>
          <Text style={styles.appInfoText}>
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
    backgroundColor: "#F8FAFC",
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
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
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
    borderColor: "#6C3BAA",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#6C3BAA",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 12,
  },
  joinedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  joinedText: {
    fontSize: 14,
    color: "#64748B",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 4,
  },
  logoutButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    shadowColor: "#000",
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
    color: "#DC2626",
  },
  appInfo: {
    marginTop: 40,
    alignItems: "center",
  },
  appInfoText: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 4,
  },
  nutritionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nutritionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  nutritionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  nutritionContent: {
    flex: 1,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  nutritionSubtitle: {
    fontSize: 13,
    color: "#64748B",
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
    color: "#64748B",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
});
