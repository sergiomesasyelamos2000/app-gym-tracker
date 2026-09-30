import { Alert } from "react-native";
import type { SubscriptionFeatures } from "@sergiomesasyelamos2000/shared";
import {
  canCreateRoutine,
  isAtRoutineLimitFromState,
} from "../subscriptionHelpers";
import { useSubscriptionStore } from "../../store/useSubscriptionStore";

jest.mock("../../store/useSubscriptionStore", () => ({
  useSubscriptionStore: {
    getState: jest.fn(),
  },
}));

function featuresWithRoutineCap(
  maxRoutines: number | null
): SubscriptionFeatures {
  return {
    maxRoutines,
    maxCustomProducts: 5,
    maxCustomMeals: 3,
    aiAnalysisEnabled: false,
    advancedStatsEnabled: false,
    exportDataEnabled: false,
    prioritySupportEnabled: false,
  };
}

describe("isAtRoutineLimitFromState", () => {
  it("fails open when features are not loaded", () => {
    expect(
      isAtRoutineLimitFromState(3, { isPremium: false, features: null })
    ).toBe(false);
  });

  it("allows premium users even above a numeric cap", () => {
    expect(
      isAtRoutineLimitFromState(9, {
        isPremium: true,
        features: featuresWithRoutineCap(3),
      })
    ).toBe(false);
  });

  it("treats a null cap as unlimited", () => {
    expect(
      isAtRoutineLimitFromState(9, {
        isPremium: false,
        features: featuresWithRoutineCap(null),
      })
    ).toBe(false);
  });

  it("is not at the limit while the count is below the cap", () => {
    expect(
      isAtRoutineLimitFromState(2, {
        isPremium: false,
        features: featuresWithRoutineCap(3),
      })
    ).toBe(false);
    expect(
      isAtRoutineLimitFromState(4, {
        isPremium: false,
        features: featuresWithRoutineCap(5),
      })
    ).toBe(false);
  });

  it("is at the limit when the count reaches or passes the cap", () => {
    expect(
      isAtRoutineLimitFromState(3, {
        isPremium: false,
        features: featuresWithRoutineCap(3),
      })
    ).toBe(true);
    expect(
      isAtRoutineLimitFromState(6, {
        isPremium: false,
        features: featuresWithRoutineCap(5),
      })
    ).toBe(true);
  });
});

describe("canCreateRoutine", () => {
  const getState = useSubscriptionStore.getState as jest.Mock;

  beforeEach(() => {
    getState.mockReset();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("allows creation when features are not loaded and does not alert", () => {
    getState.mockReturnValue({ isPremium: false, features: null });

    expect(canCreateRoutine(3)).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("blocks creation at the cap and offers Premium", () => {
    getState.mockReturnValue({
      isPremium: false,
      features: featuresWithRoutineCap(3),
    });
    const navigation = { navigate: jest.fn() };

    expect(canCreateRoutine(3, navigation as never)).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Función Premium",
      "Has alcanzado el límite de 3 rutinas en el plan gratuito. Actualiza a Premium para rutinas ilimitadas.",
      expect.any(Array)
    );
  });

  it("uses the cap from features rather than a fixed number", () => {
    getState.mockReturnValue({
      isPremium: false,
      features: featuresWithRoutineCap(5),
    });

    const navigation = { navigate: jest.fn() };

    expect(canCreateRoutine(4, navigation as never)).toBe(true);
    expect(canCreateRoutine(5, navigation as never)).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Función Premium",
      "Has alcanzado el límite de 5 rutinas en el plan gratuito. Actualiza a Premium para rutinas ilimitadas.",
      expect.any(Array)
    );
  });
});
