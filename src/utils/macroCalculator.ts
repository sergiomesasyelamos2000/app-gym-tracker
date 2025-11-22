import {
  ActivityLevel,
  Gender,
  WeightGoal,
  MacroGoals,
  UserAnthropometrics,
  UserGoals,
} from "../models/nutrition.model";

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9, // Very hard exercise & physical job or training twice per day
};

// Calorie adjustment per kg of weight change per week
const CALORIE_ADJUSTMENT_PER_KG = 7700; // kcal per kg of body fat

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
 * This is the most accurate modern formula for BMR calculation
 *
 * For men: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age(years) + 5
 * For women: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age(years) − 161
 */
function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: Gender
): number {
  const baseBMR = 10 * weight + 6.25 * height - 5 * age;

  if (gender === "male") {
    return baseBMR + 5;
  } else if (gender === "female") {
    return baseBMR - 161;
  } else {
    // For 'other', use average of male and female
    return baseBMR - 78;
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * TDEE = BMR × Activity Multiplier
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel
): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * Calculate target daily calories based on weight goal
 */
function calculateTargetCalories(
  tdee: number,
  weightGoal: WeightGoal,
  weeklyWeightChange: number
): number {
  if (weightGoal === "maintain") {
    return tdee;
  }

  // Calculate weekly calorie adjustment
  const weeklyCalorieAdjustment =
    weeklyWeightChange * CALORIE_ADJUSTMENT_PER_KG;

  // Convert to daily adjustment
  const dailyCalorieAdjustment = Math.round(weeklyCalorieAdjustment / 7);

  if (weightGoal === "lose") {
    return Math.max(1200, tdee - dailyCalorieAdjustment); // Minimum 1200 kcal for safety
  } else {
    return tdee + dailyCalorieAdjustment;
  }
}

/**
 * Calculate macro distribution based on goals
 *
 * General guidelines:
 * - Protein: 1.6-2.2g per kg body weight (muscle maintenance/growth)
 * - Fat: 20-35% of total calories (hormone production)
 * - Carbs: Remaining calories (energy)
 *
 * Adjustments based on goals:
 * - Lose weight: Higher protein (preserve muscle), moderate fat, lower carbs
 * - Maintain: Balanced macros
 * - Gain weight: Higher carbs and protein for muscle growth
 */
function calculateMacros(
  targetCalories: number,
  weight: number,
  weightGoal: WeightGoal
): MacroGoals {
  let proteinGrams: number;
  let fatPercentage: number;

  switch (weightGoal) {
    case "lose":
      // Higher protein to preserve muscle during cut
      proteinGrams = Math.round(weight * 2.2);
      fatPercentage = 0.25;
      break;
    case "gain":
      // High protein for muscle growth, moderate fat, high carbs
      proteinGrams = Math.round(weight * 2.0);
      fatPercentage = 0.25;
      break;
    case "maintain":
    default:
      // Balanced approach
      proteinGrams = Math.round(weight * 1.8);
      fatPercentage = 0.3;
      break;
  }

  // Calculate fat grams (1g fat = 9 kcal)
  const fatCalories = targetCalories * fatPercentage;
  const fatGrams = Math.round(fatCalories / 9);

  // Calculate protein calories (1g protein = 4 kcal)
  const proteinCalories = proteinGrams * 4;

  // Remaining calories go to carbs (1g carb = 4 kcal)
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const carbGrams = Math.round(carbCalories / 4);

  return {
    dailyCalories: Math.round(targetCalories), // Round to integer for database compatibility
    protein: proteinGrams,
    carbs: Math.max(0, carbGrams), // Ensure non-negative
    fat: fatGrams,
  };
}

/**
 * Main function to calculate complete macro goals
 */
export function calculateMacroGoals(
  anthropometrics: UserAnthropometrics,
  goals: UserGoals
): MacroGoals {
  const { weight, height, age, gender, activityLevel } = anthropometrics;
  const { weightGoal, weeklyWeightChange } = goals;

  // Step 1: Calculate BMR
  const bmr = calculateBMR(weight, height, age, gender);

  // Step 2: Calculate TDEE
  const tdee = calculateTDEE(bmr, activityLevel);

  // Step 3: Calculate target calories based on goal
  const targetCalories = calculateTargetCalories(
    tdee,
    weightGoal,
    weeklyWeightChange
  );

  // Step 4: Calculate macro distribution
  const macros = calculateMacros(targetCalories, weight, weightGoal);

  return macros;
}

/**
 * Helper function to get BMR and TDEE for display purposes
 */
export function getMetabolicRates(anthropometrics: UserAnthropometrics): {
  bmr: number;
  tdee: number;
} {
  const { weight, height, age, gender, activityLevel } = anthropometrics;

  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);

  return { bmr: Math.round(bmr), tdee };
}

/**
 * Helper to validate weekly weight change based on goal
 */
export function getRecommendedWeightChangeRange(weightGoal: WeightGoal): {
  min: number;
  max: number;
  recommended: number;
} {
  if (weightGoal === "lose") {
    return {
      min: 0.25,
      max: 1.0,
      recommended: 0.5, // 0.5kg per week is sustainable
    };
  } else if (weightGoal === "gain") {
    return {
      min: 0.25,
      max: 0.5,
      recommended: 0.35, // Slower gain = less fat gain
    };
  } else {
    return {
      min: 0,
      max: 0,
      recommended: 0,
    };
  }
}

/**
 * Helper to get estimated time to reach goal
 */
export function getEstimatedTimeToGoal(
  currentWeight: number,
  targetWeight: number,
  weeklyWeightChange: number
): { weeks: number; months: number } {
  const weightDifference = Math.abs(targetWeight - currentWeight);
  const weeks = Math.ceil(weightDifference / weeklyWeightChange);
  const months = Math.round((weeks / 4.33) * 10) / 10; // Average weeks per month

  return { weeks, months };
}
