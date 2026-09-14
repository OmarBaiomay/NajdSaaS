import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
  withCredentials: true, // send/receive httpOnly auth cookies
});

// On a 401 from an expired access token, try one silent refresh then retry once.
let refreshing: Promise<unknown> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        refreshing ??= api.post("/auth/refresh");
        await refreshing;
        refreshing = null;
        return api(original);
      } catch (refreshError) {
        refreshing = null;
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
