import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import { BaseNavigation } from "../../../types/common";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { SafeAreaView } from "react-native-safe-area-context";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";
import { useNutritionStore } from "../../../store/useNutritionStore";

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: "toggle" | "navigate" | "action";
  value?: boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
}

export default function SettingsScreen() {
  const navigation = useNavigation<BaseNavigation>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isProfileComplete = useNutritionStore(
    (state) => state.isProfileComplete
  );

  const [notifications, setNotifications] = useState(true);
  const [weeklyReminders, setWeeklyReminders] = useState(true);
  const [metricUnits, setMetricUnits] = useState(true);

  const handleEditMacros = () => {
    if (isProfileComplete()) {
      navigation.navigate("EditNutritionProfileScreen");
    } else {
      Alert.alert(
        "Perfil Incompleto",
        "Primero debes completar tu perfil de nutrición para poder editar tus macros.",
        [
          {
            text: "OK",
          },
        ]
      );
    }
  };

  const handleOpenAppearance = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate("Perfil");
      return;
    }
    Alert.alert(
      "Apariencia",
      "Cambia el tema claro/oscuro en Perfil → Apariencia."
    );
  };

  const handleExportData = () => {
    Alert.alert("Export Data", "Export your nutrition data as CSV or JSON", [
      { text: "Cancel", style: "cancel" },
      { text: "CSV", onPress: () => console.log("Export as CSV") },
      { text: "JSON", onPress: () => console.log("Export as JSON") },
    ]);
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "Are you sure you want to clear the app cache?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            Alert.alert("Success", "Cache cleared successfully");
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          console.log("User logged out");
        },
      },
    ]);
  };

  const generalSettings: SettingItem[] = [
    {
      id: "appearance",
      title: "Apariencia",
      subtitle: "Tema claro/oscuro en Perfil → Apariencia",
      icon: "moon",
      type: "navigate",
      onPress: handleOpenAppearance,
    },
    {
      id: "notifications",
      title: "Notifications",
      subtitle: "Receive app notifications",
      icon: "notifications",
      type: "toggle",
      value: notifications,
      onValueChange: setNotifications,
    },
    {
      id: "weekly-reminders",
      title: "Weekly Progress Reminders",
      subtitle: "Get reminded about your progress",
      icon: "calendar",
      type: "toggle",
      value: weeklyReminders,
      onValueChange: setWeeklyReminders,
    },
  ];

  const nutritionSettings: SettingItem[] = [
    {
      id: "edit-macros",
      title: "Edit Macro Goals",
      subtitle: "Adjust your daily macro targets",
      icon: "stats-chart",
      type: "navigate",
      onPress: handleEditMacros,
    },
    {
      id: "metric-units",
      title: "Use Metric Units",
      subtitle: "Display values in kg/cm",
      icon: "speedometer",
      type: "toggle",
      value: metricUnits,
      onValueChange: setMetricUnits,
    },
  ];

  const dataSettings: SettingItem[] = [
    {
      id: "export-data",
      title: "Export Data",
      subtitle: "Download your nutrition data",
      icon: "download",
      type: "action",
      onPress: handleExportData,
    },
    {
      id: "clear-cache",
      title: "Clear Cache",
      subtitle: "Free up storage space",
      icon: "trash",
      type: "action",
      onPress: handleClearCache,
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.type !== "toggle" ? item.onPress : undefined}
      disabled={item.type === "toggle"}
      activeOpacity={0.7}
    >
      <View style={styles.settingIconContainer}>
        <Ionicons name={item.icon} size={RFValue(20)} color={theme.primary} />
      </View>

      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>

      {item.type === "toggle" && item.onValueChange && (
        <Switch
          value={item.value}
          onValueChange={item.onValueChange}
          trackColor={{
            false: theme.border,
            true: withOpacity(theme.primary, 55),
          }}
          thumbColor={item.value ? theme.primary : theme.surfaceElevated}
        />
      )}

      {item.type === "navigate" && (
        <Ionicons
          name="chevron-forward"
          size={RFValue(20)}
          color={theme.textTertiary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={RFValue(24)}
            color={theme.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.settingsGroup}>
            {generalSettings.map(renderSettingItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition</Text>
          <View style={styles.settingsGroup}>
            {nutritionSettings.map(renderSettingItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.settingsGroup}>
            {dataSettings.map(renderSettingItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity
              style={[styles.settingItem, styles.logoutButton]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.settingIconContainer,
                  styles.logoutIconContainer,
                ]}
              >
                <Ionicons
                  name="log-out"
                  size={RFValue(20)}
                  color={theme.destructive}
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, styles.logoutText]}>
                  Logout
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>EvoFit</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutCopyright}>
            2024 EvoFit. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: RFValue(18),
      fontWeight: "600",
      color: theme.text,
    },
    headerRight: {
      width: 40,
    },
    content: {
      flex: 1,
    },
    section: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: RFValue(13),
      fontWeight: "600",
      color: theme.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    settingsGroup: {
      backgroundColor: theme.card,
      marginHorizontal: 16,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    settingIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: withOpacity(theme.primary, 12),
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: RFValue(15),
      fontWeight: "500",
      color: theme.text,
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: RFValue(12),
      color: theme.textSecondary,
    },
    logoutButton: {
      borderBottomWidth: 0,
    },
    logoutIconContainer: {
      backgroundColor: withOpacity(theme.destructive, 12),
    },
    logoutText: {
      color: theme.destructive,
    },
    aboutSection: {
      alignItems: "center",
      paddingVertical: 32,
      marginTop: 24,
    },
    aboutTitle: {
      fontSize: RFValue(16),
      fontWeight: "600",
      color: theme.primary,
      marginBottom: 4,
    },
    aboutVersion: {
      fontSize: RFValue(13),
      color: theme.textSecondary,
      marginBottom: 8,
    },
    aboutCopyright: {
      fontSize: RFValue(11),
      color: theme.textTertiary,
    },
  });
