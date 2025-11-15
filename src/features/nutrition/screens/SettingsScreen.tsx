import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RFValue } from "react-native-responsive-fontsize";
import { useNavigation } from "@react-navigation/native";

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
  const navigation = useNavigation();

  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [weeklyReminders, setWeeklyReminders] = useState(true);
  const [metricUnits, setMetricUnits] = useState(true);

  const handleEditMacros = () => {
    // Navigate to edit macro goals screen
    Alert.alert("Navigation", "Navigate to Edit Macro Goals screen");
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
            // Clear cache logic
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
          // Logout logic
          console.log("User logged out");
        },
      },
    ]);
  };

  const generalSettings: SettingItem[] = [
    {
      id: "dark-mode",
      title: "Dark Mode",
      subtitle: "Enable dark theme",
      icon: "moon",
      type: "toggle",
      value: darkMode,
      onValueChange: setDarkMode,
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
        <Ionicons name={item.icon} size={RFValue(20)} color="#6C3BAA" />
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
          trackColor={{ false: "#D0D0D0", true: "#9F7AC9" }}
          thumbColor={item.value ? "#6C3BAA" : "#F4F3F4"}
        />
      )}

      {item.type === "navigate" && (
        <Ionicons name="chevron-forward" size={RFValue(20)} color="#999" />
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
          <Ionicons name="arrow-back" size={RFValue(24)} color="#333" />
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
                <Ionicons name="log-out" size={RFValue(20)} color="#E74C3C" />
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
          <Text style={styles.aboutTitle}>Gym Tracker</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutCopyright}>
            2024 Gym Tracker. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: RFValue(18),
    fontWeight: "600",
    color: "#333",
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
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  settingsGroup: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
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
    borderBottomColor: "#F0F0F0",
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F5EFFF",
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
    color: "#333",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: RFValue(12),
    color: "#666",
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  logoutIconContainer: {
    backgroundColor: "#FFEBEE",
  },
  logoutText: {
    color: "#E74C3C",
  },
  aboutSection: {
    alignItems: "center",
    paddingVertical: 32,
    marginTop: 24,
  },
  aboutTitle: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#6C3BAA",
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: RFValue(13),
    color: "#666",
    marginBottom: 8,
  },
  aboutCopyright: {
    fontSize: RFValue(11),
    color: "#999",
  },
});
