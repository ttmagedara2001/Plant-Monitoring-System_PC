import axios from "axios";
import {
  getJwtToken,
  getRefreshToken,
  setTokens,
  clearAuthState,
} from "./authService";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Axios HTTP client with automatic Bearer-token auth.
 *
 * - Request interceptor:  attaches Authorization: Bearer <jwt>
 * - Response interceptor: refreshes token on "Invalid token" errors,
 *   dispatches auth:logout when refresh fails
 */
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// --- Request interceptor: attach JWT ---
api.interceptors.request.use(
  (config) => {
    const token = getJwtToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Response interceptor: token refresh + error handling ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Log non-trivial API errors once
    if (error.response) {
      const status = error.response.status;
      const errorData =
        error.response.data?.data || error.response.data?.message;

      // Device ownership error — show once, then suppress
      if (
        status === 400 &&
        errorData === "Device does not belong to the user"
      ) {
        if (!window.__deviceAuthErrorShown) {
          console.error(
            "[API] Device does not belong to your account. " +
              "Verify your device ID at https://api.protonestconnect.co",
          );
          window.__deviceAuthErrorShown = true;
        }
        return Promise.reject(error);
      }

      // 405 Method Not Allowed — no retry
      if (status === 405) return Promise.reject(error);
    }

    // Token refresh on "Invalid token" (400 / 401)
    const status = error.response?.status;
    const isTokenError = error.response?.data?.data === "Invalid token";
    const isRefreshable =
      (status === 400 || status === 401) &&
      isTokenError &&
      !originalRequest?.url?.includes("get-token") &&
      !originalRequest?.url?.includes("get-new-token") &&
      !originalRequest._retry;

    if (isRefreshable) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const response = await axios.get(`${BASE_URL}/get-new-token`, {
          headers: { Authorization: `Bearer ${refreshToken}` },
          timeout: 10000,
        });

        const data = response.data?.data || response.data;
        const newJwt =
          data?.jwtToken || data?.token || data?.accessToken || null;
        const newRefresh = data?.refreshToken || null;

        if (newJwt) setTokens(newJwt, newRefresh || refreshToken);

        originalRequest.headers.Authorization = `Bearer ${newJwt || getJwtToken()}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAuthState();
        window.dispatchEvent(new CustomEvent("auth:logout"));
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
