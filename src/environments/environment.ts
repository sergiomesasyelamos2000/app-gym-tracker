const isDev = process.env.NODE_ENV === "development";

export const ENV = {
  API_URL: isDev
    ? "https://4d87f0115be1.ngrok-free.app/api" //ngrork http 3000
    : "https://your-prod-api.com/api",
};
