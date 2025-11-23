import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import { RFValue } from "react-native-responsive-fontsize";
import {
  ActivityLevel,
  Gender,
  UserAnthropometrics,
  UserGoals,
  WeightGoal,
} from "../../../models/nutrition.model";
import { useAuthStore } from "../../../store/useAuthStore";
import { useNutritionStore } from "../../../store/useNutritionStore";
import {
  calculateMacroGoals,
  getEstimatedTimeToGoal,
} from "../../../utils/macroCalculator";
import { createUserProfile } from "../services/nutritionService";
import { NutritionStackParamList } from "./NutritionStack";

const { width, height } = Dimensions.get("window");

type Props = NativeStackScreenProps<
  NutritionStackParamList,
  "UserProfileSetupScreen"
>;

export default function UserProfileSetupScreen({ navigation, route }: Props) {
  const currentUser = useAuthStore((state) => state.user);
  const userId = route.params?.userId || currentUser?.id;
  const setUserProfile = useNutritionStore((state) => state.setUserProfile);

  // Validar que tenemos un userId válido
  React.useEffect(() => {
    if (!userId) {
      Alert.alert(
        "Error",
        "No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    }
  }, [userId]);

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Form data
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel>("moderately_active");
  const [weightGoal, setWeightGoal] = useState<WeightGoal>("maintain");
  const [targetWeight, setTargetWeight] = useState("");
  const [weeklyWeightChange, setWeeklyWeightChange] = useState(0.5);

  // Modal states
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  const activityLevels: {
    value: ActivityLevel;
    label: string;
    description: string;
  }[] = [
    {
      value: "sedentary",
      label: "Sedentario",
      description: "Poco o ningún ejercicio",
    },
    {
      value: "lightly_active",
      label: "Ligero",
      description: "Ejercicio ligero 1-3 días/semana",
    },
    {
      value: "moderately_active",
      label: "Moderado",
      description: "Ejercicio moderado 3-5 días/semana",
    },
    {
      value: "very_active",
      label: "Activo",
      description: "Ejercicio intenso 6-7 días/semana",
    },
    {
      value: "extra_active",
      label: "Muy Activo",
      description: "Ejercicio muy intenso y trabajo físico",
    },
  ];

  const weightGoals: { value: WeightGoal; label: string; icon: string }[] = [
    { value: "lose", label: "Perder Peso", icon: "trending-down" },
    { value: "maintain", label: "Mantener Peso", icon: "remove" },
    { value: "gain", label: "Ganar Peso", icon: "trending-up" },
  ];

  const handleNext = () => {
    if (currentStep === 1 && !age) {
      Alert.alert("Error", "Por favor ingresa tu edad");
      return;
    }
    if (currentStep === 2 && !weight) {
      Alert.alert("Error", "Por favor ingresa tu peso");
      return;
    }
    if (currentStep === 3 && !height) {
      Alert.alert("Error", "Por favor ingresa tu estatura");
      return;
    }
    if (currentStep === 5 && weightGoal !== "maintain" && !targetWeight) {
      Alert.alert("Error", "Por favor ingresa tu peso objetivo");
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const anthropometrics: UserAnthropometrics = {
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age),
        gender,
        activityLevel,
      };

      const goals: UserGoals = {
        weightGoal,
        targetWeight:
          weightGoal === "maintain"
            ? parseFloat(weight)
            : parseFloat(targetWeight),
        weeklyWeightChange,
      };

      const macroGoals = calculateMacroGoals(anthropometrics, goals);

      const profile = {
        userId,
        anthropometrics,
        goals,
        macroGoals,
        preferences: {
          weightUnit: "kg" as const,
          heightUnit: "cm" as const,
        },
      };

      console.log("📝 Attempting to create user profile...");
      console.log("User ID:", userId);
      console.log("Anthropometrics:", anthropometrics);
      console.log("Goals:", goals);
      console.log("Macro Goals:", macroGoals);

      // Save to backend
      const savedProfile = await createUserProfile(profile);

      console.log("✅ Profile created successfully:", savedProfile);

      // Save to local store
      setUserProfile(savedProfile);

      // Navigate to MacrosScreen
      navigation.replace("MacrosScreen");
    } catch (error: any) {
      console.error("❌ Error saving profile:", error);
      console.error("Error details:", {
        message: error?.message,
        response: error?.response,
        data: error?.response?.data,
      });

      let errorMessage =
        "No se pudo guardar el perfil. Por favor intenta de nuevo.";

      // Extract more specific error message if available
      if (error?.message) {
        if (error.message.includes("ya existe")) {
          errorMessage =
            "Ya existe un perfil para este usuario. Intenta actualizar el perfil existente.";
        } else if (error.message.includes("authenticated")) {
          errorMessage = "Sesión expirada. Por favor inicia sesión nuevamente.";
        } else if (error.message.includes("Network")) {
          errorMessage = "Error de conexión. Verifica tu conexión a internet.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      Alert.alert("Error al Guardar Perfil", errorMessage, [
        {
          text: "OK",
          style: "default",
        },
      ]);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index < currentStep
              ? styles.progressDotActive
              : styles.progressDotInactive,
          ]}
        />
      ))}
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuál es tu género?</Text>
            <Text style={styles.stepSubtitle}>
              Esto nos ayuda a calcular tus necesidades calóricas
            </Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === "male" && styles.optionSelected,
                ]}
                onPress={() => setGender("male")}
              >
                <Ionicons
                  name="male"
                  size={40}
                  color={gender === "male" ? "#fff" : "#6C3BAA"}
                />
                <Text
                  style={[
                    styles.optionText,
                    gender === "male" && styles.optionTextSelected,
                  ]}
                >
                  Hombre
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === "female" && styles.optionSelected,
                ]}
                onPress={() => setGender("female")}
              >
                <Ionicons
                  name="female"
                  size={40}
                  color={gender === "female" ? "#fff" : "#6C3BAA"}
                />
                <Text
                  style={[
                    styles.optionText,
                    gender === "female" && styles.optionTextSelected,
                  ]}
                >
                  Mujer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  gender === "other" && styles.optionSelected,
                ]}
                onPress={() => setGender("other")}
              >
                <Ionicons
                  name="male-female"
                  size={40}
                  color={gender === "other" ? "#fff" : "#6C3BAA"}
                />
                <Text
                  style={[
                    styles.optionText,
                    gender === "other" && styles.optionTextSelected,
                  ]}
                >
                  Otro
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>¿Cuántos años tienes?</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Ej: 25"
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuál es tu peso actual?</Text>
            <Text style={styles.stepSubtitle}>
              Ingresa tu peso en kilogramos
            </Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[styles.input, styles.largeInput]}
                value={weight}
                onChangeText={setWeight}
                placeholder="Ej: 70"
                keyboardType="decimal-pad"
              />
              <Text style={styles.unitLabel}>kg</Text>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuál es tu estatura?</Text>
            <Text style={styles.stepSubtitle}>
              Ingresa tu estatura en centímetros
            </Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[styles.input, styles.largeInput]}
                value={height}
                onChangeText={setHeight}
                placeholder="Ej: 175"
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>cm</Text>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>
              ¿Cuál es tu nivel de actividad?
            </Text>
            <Text style={styles.stepSubtitle}>
              Selecciona el que mejor te describa
            </Text>
            <TouchableOpacity
              style={styles.activitySelector}
              onPress={() => setShowActivityModal(true)}
            >
              <View>
                <Text style={styles.activityLabel}>
                  {activityLevels.find((a) => a.value === activityLevel)?.label}
                </Text>
                <Text style={styles.activityDescription}>
                  {
                    activityLevels.find((a) => a.value === activityLevel)
                      ?.description
                  }
                </Text>
              </View>
              <Ionicons name="chevron-down" size={24} color="#808080" />
            </TouchableOpacity>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cuál es tu objetivo?</Text>
            <Text style={styles.stepSubtitle}>Selecciona tu meta de peso</Text>
            <View style={styles.goalsContainer}>
              {weightGoals.map((goal) => (
                <TouchableOpacity
                  key={goal.value}
                  style={[
                    styles.goalOption,
                    weightGoal === goal.value && styles.optionSelected,
                  ]}
                  onPress={() => setWeightGoal(goal.value)}
                >
                  <Ionicons
                    name={goal.icon as any}
                    size={32}
                    color={weightGoal === goal.value ? "#fff" : "#6C3BAA"}
                  />
                  <Text
                    style={[
                      styles.goalText,
                      weightGoal === goal.value && styles.optionTextSelected,
                    ]}
                  >
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {weightGoal !== "maintain" && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  ¿Cuál es tu peso objetivo?
                </Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={styles.input}
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    placeholder={`Ej: ${weightGoal === "lose" ? "65" : "75"}`}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.unitLabel}>kg</Text>
                </View>
              </View>
            )}
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>
              ¿Qué tan rápido quieres lograrlo?
            </Text>
            <Text style={styles.stepSubtitle}>
              {weightGoal === "lose"
                ? "Pérdida de peso recomendada: 0.5 kg/semana"
                : weightGoal === "gain"
                ? "Ganancia de peso recomendada: 0.35 kg/semana"
                : "Mantener peso actual"}
            </Text>
            {weightGoal !== "maintain" && (
              <>
                <View style={styles.rateContainer}>
                  {[0.25, 0.5, 0.75, 1.0].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[
                        styles.rateOption,
                        weeklyWeightChange === rate && styles.optionSelected,
                      ]}
                      onPress={() => setWeeklyWeightChange(rate)}
                    >
                      <Text
                        style={[
                          styles.rateText,
                          weeklyWeightChange === rate &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {rate} kg
                      </Text>
                      <Text
                        style={[
                          styles.rateSubtext,
                          weeklyWeightChange === rate &&
                            styles.optionTextSelected,
                        ]}
                      >
                        por semana
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {weight && targetWeight && (
                  <View style={styles.estimateCard}>
                    <Text style={styles.estimateTitle}>Tiempo estimado:</Text>
                    <Text style={styles.estimateValue}>
                      {
                        getEstimatedTimeToGoal(
                          parseFloat(weight),
                          parseFloat(targetWeight),
                          weeklyWeightChange
                        ).months
                      }{" "}
                      meses
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={28} color="#6C3BAA" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Configura tu Perfil</Text>
        </View>

        {renderProgressBar()}
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentStep === totalSteps ? "Completar" : "Siguiente"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Activity Level Modal */}
      <Modal
        isVisible={showActivityModal}
        onBackdropPress={() => setShowActivityModal(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Nivel de Actividad</Text>
          {activityLevels.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={styles.modalOption}
              onPress={() => {
                setActivityLevel(level.value);
                setShowActivityModal(false);
              }}
            >
              <View>
                <Text style={styles.modalOptionLabel}>{level.label}</Text>
                <Text style={styles.modalOptionDescription}>
                  {level.description}
                </Text>
              </View>
              {activityLevel === level.value && (
                <Ionicons name="checkmark-circle" size={24} color="#6C3BAA" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: RFValue(20),
    fontWeight: "700",
    color: "#1A1A1A",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    backgroundColor: "#6C3BAA",
  },
  progressDotInactive: {
    backgroundColor: "#D1D5DB",
  },
  stepContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: RFValue(22),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: RFValue(14),
    color: "#808080",
    marginBottom: 30,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 30,
  },
  genderOption: {
    width: width * 0.28,
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionSelected: {
    backgroundColor: "#6C3BAA",
    borderColor: "#6C3BAA",
  },
  optionText: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 8,
  },
  optionTextSelected: {
    color: "#fff",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  inputWithUnit: {
    position: "relative",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: RFValue(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  largeInput: {
    fontSize: RFValue(32),
    fontWeight: "700",
    textAlign: "center",
    paddingRight: 60,
  },
  unitLabel: {
    position: "absolute",
    right: 20,
    top: "50%",
    transform: [{ translateY: -12 }],
    fontSize: RFValue(20),
    fontWeight: "600",
    color: "#808080",
  },
  activitySelector: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activityLabel: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#1A1A1A",
  },
  activityDescription: {
    fontSize: RFValue(13),
    color: "#808080",
    marginTop: 4,
  },
  goalsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  goalOption: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 16,
  },
  goalText: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#1A1A1A",
  },
  rateContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  rateOption: {
    width: (width - 56) / 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  rateText: {
    fontSize: RFValue(18),
    fontWeight: "700",
    color: "#1A1A1A",
  },
  rateSubtext: {
    fontSize: RFValue(12),
    color: "#808080",
    marginTop: 4,
  },
  estimateCard: {
    backgroundColor: "#6FCF97",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  estimateTitle: {
    fontSize: RFValue(14),
    color: "#fff",
    fontWeight: "600",
  },
  estimateValue: {
    fontSize: RFValue(24),
    color: "#fff",
    fontWeight: "700",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  nextButton: {
    backgroundColor: "#6C3BAA",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  nextButtonText: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#fff",
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: RFValue(18),
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalOptionLabel: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#1A1A1A",
  },
  modalOptionDescription: {
    fontSize: RFValue(13),
    color: "#808080",
    marginTop: 4,
  },
});
