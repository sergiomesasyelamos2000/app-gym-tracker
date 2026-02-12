import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
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
import { useTheme } from "../../../contexts/ThemeContext";
import {
  ActivityLevel,
  Gender,
  HeightUnit,
  UserAnthropometrics,
  UserGoals,
  WeightGoal,
  WeightUnit,
} from "../../../models/nutrition.model";
import { useAuthStore } from "../../../store/useAuthStore";
import { useNutritionStore } from "../../../store/useNutritionStore";
import {
  calculateMacroGoals,
  getEstimatedTimeToGoal,
} from "../../../utils/macroCalculator";
import { createUserProfile } from "../services/nutritionService";
import { NutritionStackParamList } from "./NutritionStack";

const { width } = Dimensions.get("window");

type Props = NativeStackScreenProps<
  NutritionStackParamList,
  "UserProfileSetupScreen"
>;

export default function UserProfileSetupScreen({ navigation, route }: Props) {
  const currentUser = useAuthStore((state) => state.user);
  const userId = route.params?.userId || currentUser?.id || "";
  const setUserProfile = useNutritionStore((state) => state.setUserProfile);
  const { theme } = useTheme();

  // Validar que tenemos un userId válido
  React.useEffect(() => {
    if (!userId) {
      Alert.alert(
        "Error",
        "No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    }
  }, [userId, navigation]);

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

  const weightGoals: {
    value: WeightGoal;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
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
          weightUnit: WeightUnit.KG,
          heightUnit: "cm" as HeightUnit,
        },
      };

      // Save to backend
      const savedProfile = await createUserProfile(profile);

      // Save to local store
      setUserProfile(savedProfile);

      // Navigate to MacrosScreen
      navigation.replace("MacrosScreen");
    } catch (error: any) {
      let errorMessage =
        "No se pudo guardar tu perfil. Por favor, intenta nuevamente.";

      // Provide more specific error messages based on the error type
      if (error.message?.toLowerCase().includes("unauthorized")) {
        errorMessage =
          "Hubo un problema de autenticación. Por favor, cierra sesión y vuelve a iniciar sesión.";
      } else if (error.message?.toLowerCase().includes("network")) {
        errorMessage =
          "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
      } else if (error.message?.toLowerCase().includes("ya existe")) {
        errorMessage =
          "Ya existe un perfil para este usuario. Intenta actualizar el perfil existente.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      Alert.alert("Error al Guardar", errorMessage, [{ text: "OK" }]);
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
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              ¿Cuál es tu género?
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
              Esto nos ayuda a calcular tus necesidades calóricas
            </Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  gender === "male" && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setGender("male")}
              >
                <Ionicons
                  name="male"
                  size={40}
                  color={gender === "male" ? "#fff" : theme.primary}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.text },
                    gender === "male" && styles.optionTextSelected,
                  ]}
                >
                  Hombre
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  gender === "female" && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setGender("female")}
              >
                <Ionicons
                  name="female"
                  size={40}
                  color={gender === "female" ? "#fff" : theme.primary}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.text },
                    gender === "female" && styles.optionTextSelected,
                  ]}
                >
                  Mujer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  gender === "other" && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setGender("other")}
              >
                <Ionicons
                  name="male-female"
                  size={40}
                  color={gender === "other" ? "#fff" : theme.primary}
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.text },
                    gender === "other" && styles.optionTextSelected,
                  ]}
                >
                  Otro
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                ¿Cuántos años tienes?
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={age}
                onChangeText={setAge}
                placeholder="Ej: 25"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              ¿Cuál es tu peso actual?
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
              Ingresa tu peso en kilogramos
            </Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[
                  styles.input,
                  styles.largeInput,
                  {
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={weight}
                onChangeText={setWeight}
                placeholder="Ej: 70"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.unitLabel, { color: theme.textSecondary }]}>
                kg
              </Text>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              ¿Cuál es tu estatura?
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
              Ingresa tu estatura en centímetros
            </Text>
            <View style={styles.inputWithUnit}>
              <TextInput
                style={[
                  styles.input,
                  styles.largeInput,
                  {
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={height}
                onChangeText={setHeight}
                placeholder="Ej: 175"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
              />
              <Text style={[styles.unitLabel, { color: theme.textSecondary }]}>
                cm
              </Text>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              ¿Cuál es tu nivel de actividad?
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
              Selecciona el que mejor te describa
            </Text>
            <TouchableOpacity
              style={[
                styles.activitySelector,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setShowActivityModal(true)}
            >
              <View>
                <Text style={[styles.activityLabel, { color: theme.text }]}>
                  {activityLevels.find((a) => a.value === activityLevel)?.label}
                </Text>
                <Text
                  style={[
                    styles.activityDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {
                    activityLevels.find((a) => a.value === activityLevel)
                      ?.description
                  }
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={24}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              ¿Cuál es tu objetivo?
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
              Selecciona tu meta de peso
            </Text>
            <View style={styles.goalsContainer}>
              {weightGoals.map((goal) => (
                <TouchableOpacity
                  key={goal.value}
                  style={[
                    styles.goalOption,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                    weightGoal === goal.value && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setWeightGoal(goal.value)}
                >
                  <Ionicons
                    name={goal.icon}
                    size={32}
                    color={weightGoal === goal.value ? "#fff" : theme.primary}
                  />
                  <Text
                    style={[
                      styles.goalText,
                      { color: theme.text },
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
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  ¿Cuál es tu peso objetivo?
                </Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBackground,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    placeholder={`Ej: ${weightGoal === "lose" ? "65" : "75"}`}
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="decimal-pad"
                  />
                  <Text
                    style={[styles.unitLabel, { color: theme.textSecondary }]}
                  >
                    kg
                  </Text>
                </View>
              </View>
            )}
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>
              ¿Qué tan rápido quieres lograrlo?
            </Text>
            <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
              {weightGoal === "lose"
                ? "Pérdida de peso recomendada: 0.5 kg/semana"
                : weightGoal === "gain"
                  ? "Ganancia de peso recomendada: 0.35 kg/semana"
                  : "Mantener peso actual"}
            </Text>
            {weightGoal === "maintain" ? (
              <View
                style={[
                  styles.maintainCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.success,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={64}
                  color={theme.success}
                />
                <Text style={[styles.maintainTitle, { color: theme.text }]}>
                  Tu objetivo es mantener tu peso actual
                </Text>
                <Text
                  style={[
                    styles.maintainDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  Calcularemos tus macros para que mantengas tu peso de {weight}{" "}
                  kg de forma saludable y equilibrada.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.rateContainer}>
                  {[0.25, 0.5, 0.75, 1.0].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[
                        styles.rateOption,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                        weeklyWeightChange === rate && {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => setWeeklyWeightChange(rate)}
                    >
                      <Text
                        style={[
                          styles.rateText,
                          { color: theme.text },
                          weeklyWeightChange === rate &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {rate} kg
                      </Text>
                      <Text
                        style={[
                          styles.rateSubtext,
                          { color: theme.textSecondary },
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
                  <View
                    style={[
                      styles.estimateCard,
                      { backgroundColor: theme.success },
                    ]}
                  >
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

  // Styles using theme - memoized to avoid recreation on every render
  const styles = useMemo(
    () =>
      StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
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
      color: theme.text,
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
      backgroundColor: theme.primary,
    },
    progressDotInactive: {
      backgroundColor: theme.border,
    },
    stepContainer: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    stepTitle: {
      fontSize: RFValue(22),
      fontWeight: "700",
      marginBottom: 8,
    },
    stepSubtitle: {
      fontSize: RFValue(14),
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
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    optionSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    optionText: {
      fontSize: RFValue(14),
      fontWeight: "600",
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
      marginBottom: 12,
    },
    inputWithUnit: {
      position: "relative",
    },
    input: {
      borderRadius: 12,
      padding: 16,
      fontSize: RFValue(16),
      borderWidth: 1,
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
    },
    activitySelector: {
      borderRadius: 12,
      padding: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
    },
    activityLabel: {
      fontSize: RFValue(16),
      fontWeight: "600",
    },
    activityDescription: {
      fontSize: RFValue(13),
      marginTop: 4,
    },
    goalsContainer: {
      gap: 12,
      marginBottom: 20,
    },
    goalOption: {
      borderRadius: 12,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      gap: 16,
    },
    goalText: {
      fontSize: RFValue(16),
      fontWeight: "600",
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
      borderRadius: 12,
      padding: 20,
      alignItems: "center",
      borderWidth: 2,
    },
    rateText: {
      fontSize: RFValue(18),
      fontWeight: "700",
    },
    rateSubtext: {
      fontSize: RFValue(12),
      marginTop: 4,
    },
    estimateCard: {
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
    maintainCard: {
      borderRadius: 16,
      padding: 30,
      alignItems: "center",
      marginTop: 20,
      borderWidth: 2,
    },
    maintainTitle: {
      fontSize: RFValue(18),
      fontWeight: "700",
      textAlign: "center",
      marginTop: 16,
      marginBottom: 12,
    },
    maintainDescription: {
      fontSize: RFValue(14),
      textAlign: "center",
      lineHeight: 22,
    },
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.card,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    nextButton: {
      backgroundColor: theme.primary,
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
      backgroundColor: theme.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
    },
    modalTitle: {
      fontSize: RFValue(18),
      fontWeight: "700",
      color: theme.text,
      marginBottom: 20,
    },
    modalOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalOptionLabel: {
      fontSize: RFValue(16),
      fontWeight: "600",
      color: theme.text,
    },
    modalOptionDescription: {
      fontSize: RFValue(13),
      color: theme.textSecondary,
      marginTop: 4,
    },
  }),
    [theme]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={28} color={theme.primary} />
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
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={theme.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
