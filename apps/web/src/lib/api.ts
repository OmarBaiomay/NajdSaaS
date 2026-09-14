import axios from "axios";
import { useViewAsStore } from "@/store/viewAsStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
  withCredentials: true, // send/receive httpOnly auth cookies
});

// When an agency user has picked "View as <tenant>", forward that choice as
// x-tenant-id on every request — the backend's resolveTenantScope middleware
// validates and scopes to it for agency-level roles.
api.interceptors.request.use((config) => {
  const tenantId = useViewAsStore.getState().tenantId;
  if (tenantId) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)["x-tenant-id"] = tenantId;
  }
  return config;
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
