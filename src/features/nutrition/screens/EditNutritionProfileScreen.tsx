import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { updateUserProfile } from "../services/nutritionService";
import { NutritionStackParamList } from "./NutritionStack";

const { width, height } = Dimensions.get("window");

type Props = NativeStackScreenProps<
  NutritionStackParamList,
  "EditNutritionProfileScreen"
>;

export default function EditNutritionProfileScreen({
  navigation,
  route,
}: Props) {
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const userProfile = useNutritionStore((state) => state.userProfile);
  const setUserProfile = useNutritionStore((state) => state.setUserProfile);

  const [loading, setLoading] = useState(false);

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Form data - inicializar con datos del perfil existente
  const [gender, setGender] = useState<Gender>(
    userProfile?.anthropometrics.gender || "male"
  );

  const [age, setAge] = useState(
    userProfile?.anthropometrics.age.toString() || ""
  );
  const [weight, setWeight] = useState(
    userProfile?.anthropometrics.weight.toString() || ""
  );
  const [height, setHeight] = useState(
    userProfile?.anthropometrics.height.toString() || ""
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    userProfile?.anthropometrics.activityLevel || "moderately_active"
  );
  const [weightGoal, setWeightGoal] = useState<WeightGoal>(
    userProfile?.goals.weightGoal || "maintain"
  );
  const [targetWeight, setTargetWeight] = useState(
    userProfile?.goals.targetWeight.toString() || ""
  );
  const [weeklyWeightChange, setWeeklyWeightChange] = useState(
    userProfile?.goals.weeklyWeightChange || 0.5
  );

  // Modal states
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Validar que tenemos un perfil válido
  useEffect(() => {
    if (!userProfile || !currentUser?.id) {
      Alert.alert(
        "Error",
        "No se encontró el perfil de nutrición. Por favor, completa la configuración inicial.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    }
  }, [userProfile, currentUser]);

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
    } else {
      navigation.goBack();
    }
  };

  const handleComplete = async () => {
    if (!userProfile || !currentUser?.id) {
      Alert.alert("Error", "No se encontró el perfil de usuario");
      return;
    }

    setLoading(true);
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

      // Recalcular macros basados en los nuevos datos
      const macroGoals = calculateMacroGoals(anthropometrics, goals);

      const updates = {
        anthropometrics,
        goals,
        macroGoals,
        preferences: userProfile.preferences,
      };

      // Actualizar en el backend
      const updatedProfile = await updateUserProfile(updates, currentUser.id);

      // Actualizar en el store local
      setUserProfile(updatedProfile);

      Alert.alert(
        "Perfil Actualizado",
        "Tus datos y macros han sido recalculados exitosamente.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Error",
        "No se pudo actualizar el perfil. Por favor intenta de nuevo."
      );
    } finally {
      setLoading(false);
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
                  <Text style={styles.unitLabelSmall}>kg</Text>
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

  // Styles using theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    centerContent: {
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 16,
      fontSize: RFValue(14),
      color: theme.textSecondary,
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
      fontSize: RFValue(18),
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
      color: theme.text,
      marginBottom: 8,
    },
    stepSubtitle: {
      fontSize: RFValue(14),
      color: theme.textSecondary,
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
      backgroundColor: theme.card,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.border,
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
      color: theme.text,
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
      color: theme.text,
      marginBottom: 12,
    },
    inputWithUnit: {
      position: "relative",
    },
    input: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      fontSize: RFValue(16),
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
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
      color: theme.textSecondary,
    },
    unitLabelSmall: {
      position: "absolute",
      right: 20,
      top: "50%",
      transform: [{ translateY: -10 }],
      fontSize: RFValue(16),
      fontWeight: "600",
      color: theme.textSecondary,
    },
    activitySelector: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    activityLabel: {
      fontSize: RFValue(16),
      fontWeight: "600",
      color: theme.text,
    },
    activityDescription: {
      fontSize: RFValue(13),
      color: theme.textSecondary,
      marginTop: 4,
    },
    goalsContainer: {
      gap: 12,
      marginBottom: 20,
    },
    goalOption: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.border,
      gap: 16,
    },
    goalText: {
      fontSize: RFValue(16),
      fontWeight: "600",
      color: theme.text,
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
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.border,
    },
    rateText: {
      fontSize: RFValue(18),
      fontWeight: "700",
      color: theme.text,
    },
    rateSubtext: {
      fontSize: RFValue(12),
      color: theme.textSecondary,
      marginTop: 4,
    },
    estimateCard: {
      backgroundColor: theme.success,
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
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 30,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: RFValue(18),
      fontWeight: "700",
      color: theme.text,
    },
    modalOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
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
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Actualizando perfil...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={28} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil de Nutrición</Text>
        </View>

        {renderProgressBar()}
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentStep === totalSteps ? "Guardar Cambios" : "Siguiente"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Activity Level Modal */}
      <Modal
        isVisible={showActivityModal}
        onBackdropPress={() => setShowActivityModal(false)}
        style={styles.modal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropColor="#000"
        backdropOpacity={0.5}
        backdropTransitionOutTiming={0}
        useNativeDriver
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nivel de Actividad</Text>
            <TouchableOpacity onPress={() => setShowActivityModal(false)}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
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
