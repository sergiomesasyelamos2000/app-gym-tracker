const appJson = require("./app.json");

const config = appJson.expo ?? appJson;

module.exports = ({ config: incomingConfig } = {}) => {
  const resolvedConfig = incomingConfig ?? config;

  return {
    ...resolvedConfig,
    extra: {
      ...resolvedConfig.extra,
      appleIap: {
        monthlyProductId:
          process.env.EXPO_PUBLIC_APPLE_IAP_MONTHLY_PRODUCT_ID || "",
        yearlyProductId:
          process.env.EXPO_PUBLIC_APPLE_IAP_YEARLY_PRODUCT_ID || "",
        lifetimeProductId:
          process.env.EXPO_PUBLIC_APPLE_IAP_LIFETIME_PRODUCT_ID || "",
      },
    },
  };
};
