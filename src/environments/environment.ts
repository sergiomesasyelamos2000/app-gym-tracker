const isDev = process.env.NODE_ENV === "development";

export const ENV = {
  API_URL: isDev
    ? "http://192.168.1.136:3000/api" //ngrork http 3000
    : "https://your-prod-api.com/api",
};

export const ENV_ASSETS = {
  API_URL: isDev
    ? "http://192.168.1.136:3000" //ngrork http 3000
    : "https://your-prod-api.com",
};
