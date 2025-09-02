import React from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import CircularProgress from "react-native-circular-progress-indicator";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function MacrosScreen({ navigation }: { navigation: any }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hoy</Text>
          <Text style={styles.headerSubtitle}>
            Todavía puedes comer{" "}
            <Text style={styles.caloriesHighlight}>2937</Text> calorías
          </Text>
          <Text style={styles.caloriesConsumed}>0 calorías consumidas</Text>
          <Text style={styles.caloriesMeta}>Meta: 2937</Text>
        </View>

        {/* Calorías */}
        <View style={styles.caloriesCard}>
          <Text style={styles.caloriesCardText}>0 kcal</Text>
        </View>

        {/* Macros */}
        <View style={styles.macrosRow}>
          <View style={styles.macrosCircle}>
            <CircularProgress
              value={0}
              radius={45}
              maxValue={100}
              title={"Carbohidratos"}
              titleStyle={styles.circleTitle}
              progressValueColor={styles.circleValue.color}
              activeStrokeColor={styles.circleCarbs.color}
              inActiveStrokeColor={styles.circleInactive.color}
              inActiveStrokeOpacity={0.3}
            />
            <Text style={styles.macrosRemaining}>367g restantes</Text>
          </View>

          <View style={styles.macrosCircle}>
            <CircularProgress
              value={0}
              radius={45}
              maxValue={100}
              title={"Proteína"}
              titleStyle={styles.circleTitle}
              progressValueColor={styles.circleValue.color}
              activeStrokeColor={styles.circleProteins.color}
              inActiveStrokeColor={styles.circleInactive.color}
              inActiveStrokeOpacity={0.3}
            />
            <Text style={styles.macrosRemaining}>183g restantes</Text>
          </View>

          <View style={styles.macrosCircle}>
            <CircularProgress
              value={0}
              radius={45}
              maxValue={100}
              title={"Grasa"}
              titleStyle={styles.circleTitle}
              progressValueColor={styles.circleValue.color}
              activeStrokeColor={styles.circleFats.color}
              inActiveStrokeColor={styles.circleInactive.color}
              inActiveStrokeOpacity={0.3}
            />
            <Text style={styles.macrosRemaining}>81g restantes</Text>
          </View>
        </View>

        {/* Consejo del día */}
        <View style={styles.tipCard}>
          <Text style={styles.tipHeader}>CONSEJO DEL DÍA</Text>
          <Text style={styles.tipText}>
            ¿Es sodio o es sal? Evita confundir estos términos. El sodio es
            parte de la sal, pero no es lo mismo. Cuida tu consumo diario.
          </Text>
        </View>
      </ScrollView>

      {/* Botón para añadir productos */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("ProductListScreen")}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  screen: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#808080",
  },
  caloriesHighlight: {
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  caloriesConsumed: {
    fontSize: 14,
    color: "#6FCF97",
    marginTop: 4,
  },
  caloriesMeta: {
    fontSize: 14,
    color: "#808080",
    marginTop: 4,
  },
  caloriesCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
    elevation: 2,
  },
  caloriesCardText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  macrosCircle: {
    alignItems: "center",
  },
  circleTitle: {
    fontSize: 12,
    color: "#808080",
  },
  circleValue: {
    color: "#1A1A1A",
  },
  circleCarbs: {
    color: "#6FCF97",
  },
  circleProteins: {
    color: "#409CFF",
  },
  circleFats: {
    color: "#FFB74D",
  },
  circleInactive: {
    color: "#E0E0E0",
  },
  macrosRemaining: {
    fontSize: 12,
    color: "#808080",
    marginTop: 4,
  },
  tipCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FFB74D",
  },
  tipHeader: {
    fontSize: 12,
    color: "#409CFF",
    fontWeight: "bold",
    letterSpacing: 1.2,
  },
  tipText: {
    fontSize: 14,
    color: "#1A1A1A",
    marginTop: 4,
  },
  addButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#6FCF97",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
});
