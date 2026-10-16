import {
  ACCOUNT_DELETE_SUBSCRIPTION_NOTICE,
  getHealthConnectionPresentation,
  getHealthFinishPromptCopy,
} from "../healthConnectionCopy";

describe("healthConnectionCopy", () => {
  it("names Apple Salud on iOS and never suggests Bluetooth pairing", () => {
    const copy = getHealthConnectionPresentation({
      platform: "ios",
      status: "undetermined",
      hasRequestedAuthorization: false,
    });

    expect(copy.sectionTitle).toContain("APPLE SALUD");
    expect(copy.connectTitle).toContain("Apple Salud");
    expect(copy.showConnectedControls).toBe(false);
    expect(copy.connectHint.toLowerCase()).toContain("entreno");
    expect(copy.explainer.toLowerCase()).toContain(
      "no emparejamos el reloj por bluetooth"
    );
    const actionCopy =
      `${copy.connectTitle} ${copy.statusSubtitle}`.toLowerCase();
    expect(actionCopy).not.toMatch(/\bemparejar\b/);
  });

  it("names Health Connect on Android with Hevy-style hub messaging", () => {
    const copy = getHealthConnectionPresentation({
      platform: "android",
      status: "undetermined",
      hasRequestedAuthorization: false,
    });

    expect(copy.sectionTitle).toContain("HEALTH CONNECT");
    expect(copy.connectTitle).toContain("Health Connect");
    expect(copy.explainer.toLowerCase()).toContain("health connect");
    expect(copy.explainer.toLowerCase()).toContain("google fit");
    expect(copy.explainer.toLowerCase()).toContain("samsung");
    expect(copy.explainer.toLowerCase()).toContain("no emparejamos");
    expect(copy.manageTitle.toLowerCase()).toContain("health connect");
    expect(copy.installTitle.toLowerCase()).toContain("instalar");
    expect(copy.connectHint.toLowerCase()).toContain("google fit");
  });

  it("lists the four read domains when denied", () => {
    const iosDenied = getHealthConnectionPresentation({
      platform: "ios",
      status: "denied",
      hasRequestedAuthorization: true,
    });
    const androidDenied = getHealthConnectionPresentation({
      platform: "android",
      status: "denied",
      hasRequestedAuthorization: true,
    });

    for (const body of [iosDenied.deniedBody, androidDenied.deniedBody]) {
      const lower = body.toLowerCase();
      expect(lower).toMatch(/frecuencia|cardiaca|pulsaciones/);
      expect(lower).toMatch(/calor|entrenamiento/);
      expect(lower).toMatch(/sueño|sueno/);
      expect(lower).toMatch(/pasos/);
    }
  });

  it("shows connected controls after connect without requiring granted", () => {
    const copy = getHealthConnectionPresentation({
      platform: "ios",
      status: "undetermined",
      hasRequestedAuthorization: true,
    });

    expect(copy.showConnectedControls).toBe(true);
    expect(copy.statusSubtitle.toLowerCase()).toContain("conectado");
    expect(copy.writeTitle.toLowerCase()).toContain("sincronizar");
    expect(copy.connectSuccessBody.toLowerCase()).toContain("desactivar");
  });

  it("explains missing Health apps list when unavailable on iOS", () => {
    const copy = getHealthConnectionPresentation({
      platform: "ios",
      status: "unavailable",
      hasRequestedAuthorization: false,
    });
    expect(copy.unavailableBody.toLowerCase()).toContain("healthkit");
    expect(copy.unavailableBody.toLowerCase()).toContain("testflight");
    expect(copy.showConnectedControls).toBe(false);
  });

  it("offers a finish-workout connect prompt", () => {
    const copy = getHealthFinishPromptCopy("ios");
    expect(copy.title.toLowerCase()).toContain("apple salud");
    expect(copy.accept.toLowerCase()).toContain("conectar");
    expect(copy.decline.toLowerCase()).toContain("ahora no");
  });

  it("mentions App Store subscription when deleting account", () => {
    expect(ACCOUNT_DELETE_SUBSCRIPTION_NOTICE.toLowerCase()).toContain(
      "no cancela"
    );
    expect(ACCOUNT_DELETE_SUBSCRIPTION_NOTICE.toLowerCase()).toContain(
      "suscripción"
    );
    expect(ACCOUNT_DELETE_SUBSCRIPTION_NOTICE.toLowerCase()).toContain(
      "app store"
    );
  });
});
