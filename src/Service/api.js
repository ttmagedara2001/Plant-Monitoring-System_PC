import axios from "axios";

// Use VITE_API_BASE_URL from environment
// This should be the full API base path: https://api.protonestconnect.co/api/v1
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

console.log("🔧 API Base URL:", BASE_URL);

/**
 * Axios API Client configured for Cookie-based Authentication (HttpOnly cookies)
 * 
 * Key changes from header-based auth:
 * - withCredentials: true - sends cookies with every request
 * - No X-Token header attachment
 * - Token refresh uses GET /get-new-token with cookie-based refresh token
 */
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 second timeout
  // CRITICAL: Include credentials (cookies) with every request
  withCredentials: true,
});

// Request Interceptor: Logging only (no token header attachment needed with cookies)
api.interceptors.request.use(
  (config) => {
    console.log("📤 API Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      withCredentials: config.withCredentials,
      payload: config.data || undefined,
    });

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handles Cookie-based Token Refresh and various errors
api.interceptors.response.use(
  (response) => {
    console.log("📥 API Response:", {
      status: response.status,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log API errors for debugging (suppress repetitive 400 errors)
    if (error.response) {
      // Only log detailed errors for non-400 or first-time 400 errors
      const is400Error = error.response.status === 400;
      const errorData =
        error.response.data?.data || error.response.data?.message;

      if (
        !is400Error ||
        (!window.__api400ErrorLogged &&
          errorData !== "Device does not belong to the user")
      ) {
        console.error("❌ API Error Response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          url: originalRequest?.url,
          method: originalRequest?.method?.toUpperCase(),
          data: error.response.data,
          allowHeader: error.response.headers?.allow,
        });

        if (is400Error) {
          window.__api400ErrorLogged = true;
        }
      }

      // Enhanced logging for 400 errors
      if (error.response.status === 400) {
        const errorData =
          error.response.data?.data || error.response.data?.message;

        // Special handling for device ownership errors - show once
        if (errorData === "Device does not belong to the user") {
          if (!window.__deviceAuthErrorShown) {
            console.error("\n🚫 DEVICE AUTHORIZATION ERROR");
            console.error(
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            );
            console.error("❌ Device does not belong to your account");
            console.error("\n💡 TO FIX THIS:");
            console.error("   1. Go to: https://api.protonestconnect.co");
            console.error("   2. Find your device ID in your dashboard");
            console.error("   3. Update 'defaultDeviceId' in Dashboard.jsx\n");
            console.error(
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            );
            window.__deviceAuthErrorShown = true;
          }
          // Silent return for subsequent auth errors
          return Promise.reject(error);
        }

        // Only log non-auth 400 errors in detail
        if (errorData !== "Device does not belong to the user") {
          console.error("🔍 400 Error:", {
            endpoint: originalRequest?.url,
            message: errorData,
          });
        }
      }
    }

    // Handle 405 Method Not Allowed
    if (error.response?.status === 405) {
      console.error("🚫 Method Not Allowed (405):", {
        attempted: originalRequest?.method?.toUpperCase(),
        endpoint: originalRequest?.url,
        allowed: error.response.headers?.allow || "Not specified",
      });

      // Don't retry 405 errors - they need code changes
      return Promise.reject(error);
    }

    // Handle token refresh for 400/401 errors with "Invalid token" message
    // Uses cookie-based refresh - no manual headers needed
    if (
      (error.response?.status === 400 || error.response?.status === 401) &&
      !originalRequest?.url?.includes("user/get-token") && // Don't try refresh on login endpoints
      !originalRequest?.url?.includes("get-new-token") && // Don't try refresh on refresh endpoint
      error.response?.data?.data === "Invalid token" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        console.log("🔄 Attempting cookie-based token refresh...");

        // Call GET /get-new-token - server uses refresh token from cookie
        // No manual headers needed - cookies are sent automatically
        const response = await axios.get(`${BASE_URL}/get-new-token`, {
          withCredentials: true, // Include cookies
          timeout: 10000,
        });

        // If refresh succeeds (200 OK), new cookies are set automatically by server
        console.log("✅ Token refreshed successfully via cookies");
        
        // Retry the original request with new cookies
        return api(originalRequest);
      } catch (refreshError) {
        const refreshErrorData = refreshError.response?.data?.data;
        
        // Check for specific refresh failure reasons
        if (
          refreshErrorData === "Refresh token is required" ||
          refreshErrorData === "Invalid refresh token"
        ) {
          console.error("❌ Session expired - logging out:", refreshErrorData);
        } else {
          console.error("❌ Token refresh failed:", refreshError.message);
        }
        
        // Clear any local state and redirect to login
        localStorage.clear();
        
        // Dispatch logout event for AuthContext to handle
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        // Redirect to home/login
        window.location.href = "/";
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
