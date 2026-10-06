import {
  ACCOUNT_DELETE_SUBSCRIPTION_NOTICE,
  getHealthConnectionPresentation,
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
    expect(copy.explainer.toLowerCase()).toContain(
      "no emparejamos el reloj por bluetooth"
    );
    const actionCopy =
      `${copy.connectTitle} ${copy.statusSubtitle}`.toLowerCase();
    expect(actionCopy).not.toMatch(/\bemparejar\b/);
    expect(actionCopy).toContain("sueño");
    expect(actionCopy).toContain("pasos");
  });

  it("names Health Connect on Android", () => {
    const copy = getHealthConnectionPresentation({
      platform: "android",
      status: "undetermined",
      hasRequestedAuthorization: false,
    });

    expect(copy.sectionTitle).toContain("HEALTH CONNECT");
    expect(copy.connectTitle).toContain("Health Connect");
    expect(copy.explainer.toLowerCase()).toContain("health connect");
    expect(copy.explainer.toLowerCase()).toContain("no emparejamos");
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
      expect(lower).toMatch(/calor/);
      expect(lower).toMatch(/sueño|sueno/);
      expect(lower).toMatch(/pasos/);
    }
  });

  it("keeps asked-but-undetermined copy after connect without claiming granted", () => {
    const copy = getHealthConnectionPresentation({
      platform: "ios",
      status: "undetermined",
      hasRequestedAuthorization: true,
    });

    expect(copy.statusSubtitle.toLowerCase()).toContain("permiso solicitado");
    expect(copy.statusSubtitle.toLowerCase()).not.toContain("conectado");
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
