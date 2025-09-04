const isDev = process.env.NODE_ENV === "development";

export const ENV = {
  API_URL: isDev
    ? "https://471a91323210.ngrok-free.app/api" //ngrork http 3000
    : "https://your-prod-api.com/api",
};
