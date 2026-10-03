import {
  finishNutritionProfileSetup,
  leaveToPreviousScreen,
  leaveToProductList,
} from "../nutritionNavigation";

describe("leaveToPreviousScreen", () => {
  it("goes back to the previous screen when history exists", () => {
    const navigation = {
      canGoBack: jest.fn(() => true),
      goBack: jest.fn(),
      replace: jest.fn(),
      getState: jest.fn(() => ({
        routeNames: ["ProfileMain", "EditNutritionProfileScreen"],
        routes: [
          { name: "ProfileMain" },
          { name: "EditNutritionProfileScreen" },
        ],
      })),
    };

    leaveToPreviousScreen(navigation);

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("replaces with ProfileMain when editor is root of Perfil stack", () => {
    const navigation = {
      canGoBack: jest.fn(() => false),
      goBack: jest.fn(),
      replace: jest.fn(),
      getState: jest.fn(() => ({
        routeNames: ["ProfileMain", "EditNutritionProfileScreen"],
        routes: [{ name: "EditNutritionProfileScreen" }],
      })),
    };

    leaveToPreviousScreen(navigation);

    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith("ProfileMain");
  });

  it("replaces with MacrosScreen when editor is root of Macros stack", () => {
    const navigation = {
      canGoBack: jest.fn(() => false),
      goBack: jest.fn(),
      replace: jest.fn(),
      getState: jest.fn(() => ({
        routeNames: ["MacrosScreen", "EditNutritionProfileScreen"],
        routes: [{ name: "EditNutritionProfileScreen" }],
      })),
    };

    leaveToPreviousScreen(navigation);

    expect(navigation.replace).toHaveBeenCalledWith("MacrosScreen");
  });
});

describe("finishNutritionProfileSetup", () => {
  it("replaces with MacrosScreen when setup is in Macros stack", () => {
    const navigation = {
      canGoBack: jest.fn(() => true),
      goBack: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
      getParent: jest.fn(),
      getState: jest.fn(() => ({
        routeNames: ["MacrosScreen", "UserProfileSetupScreen"],
        routes: [{ name: "MacrosScreen" }, { name: "UserProfileSetupScreen" }],
      })),
    };

    finishNutritionProfileSetup(navigation);

    expect(navigation.replace).toHaveBeenCalledWith("MacrosScreen");
    expect(navigation.getParent).not.toHaveBeenCalled();
  });

  it("returns to ProfileMain and opens Macros tab when setup is in Perfil stack", () => {
    const parent = { navigate: jest.fn() };
    const navigation = {
      canGoBack: jest.fn(() => true),
      goBack: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
      getParent: jest.fn(() => parent),
      getState: jest.fn(() => ({
        routeNames: ["ProfileMain", "UserProfileSetupScreen"],
        routes: [{ name: "ProfileMain" }, { name: "UserProfileSetupScreen" }],
      })),
    };

    finishNutritionProfileSetup(navigation);

    expect(navigation.replace).toHaveBeenCalledWith("ProfileMain");
    expect(parent.navigate).toHaveBeenCalledWith("Macros", {
      screen: "MacrosScreen",
    });
  });
});

describe("leaveToProductList", () => {
  it("pops to ProductListScreen when already in the stack", () => {
    const navigation = {
      getState: () => ({
        routes: [{ name: "ProductListScreen" }, { name: "CreateMealScreen" }],
      }),
      popTo: jest.fn(),
      navigate: jest.fn(),
    };

    leaveToProductList(navigation as never, { openFavorites: true });

    expect(navigation.popTo).toHaveBeenCalledWith("ProductListScreen", {
      openFavorites: true,
    });
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
