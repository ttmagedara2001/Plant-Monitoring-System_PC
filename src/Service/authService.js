import axios from "axios";

// Environment-based API URL selection
// NOTE: Do NOT hardcode production endpoints here — require VITE_API_BASE_URL.
// Avoid relying on undefined env vars. If `VITE_API_BASE_URL` is set, use it.
// Otherwise, automatically use a localhost URL when running in a browser
// on `localhost` or `127.0.0.1`. If neither applies, return null so callers
// can detect missing configuration.
const getApiUrl = () => {
  const envApi = import.meta.env.VITE_API_BASE_URL;
  if (envApi) return envApi;
};

const API_URL = getApiUrl();

// Authentication and get JWT + refresh token
export const login = async (email, password) => {
  try {
    // Validate input before making request
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Clean and validate email format
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail.includes("@")) {
      throw new Error("Invalid email format");
    }

    console.log("🔄 Making secure authentication request to:", API_URL);
    console.log(
      "📋 IMPORTANT: Using secretKey as password (not login password)"
    );

    // Based on API documentation, use exact payload structure
    const payload = {
      email: cleanEmail,
      password: cleanPassword, // This should be the secretKey from Protonest dashboard
    };

    console.log("🔄 Attempting /get-token with documented payload structure:", {
      email: cleanEmail,
      passwordType: "secretKey",
      passwordLength: cleanPassword.length,
    });

    try {
      const response = await axios.post(`${API_URL}/get-token`, payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        timeout: 10000,
      });

      console.log("📡 API Response from /get-token (Success):", response.data);

      // Check for successful response according to API docs
      if (response.data.status === "Success") {
        const jwtToken = response.data.data?.jwtToken;
        const refreshToken = response.data.data?.refreshToken;

        if (!jwtToken) {
          throw new Error("No JWT token in response data");
        }

        console.log(
          "✅ Login successful via /get-token. JWT token received securely."
        );
        return { jwtToken, refreshToken, userId: cleanEmail };
      } else {
        throw new Error(
          `Authentication failed: ${
            response.data.message || "Unexpected response status"
          }`
        );
      }
    } catch (error) {
      // Enhanced error logging based on API documentation
      if (error.response?.status === 400) {
        const serverResponse = error.response.data;

        console.error("❌ Authentication failed (400):", {
          serverResponse: JSON.stringify(serverResponse, null, 2),
          possibleCauses: [
            "Invalid email format - check email address",
            "Invalid credentials - verify email is registered",
            "Wrong secretKey - check Protonest dashboard for correct secretKey",
            "User not found - email not registered in system",
            "Email not verified - check email verification status",
          ],
        });

        // Provide specific error message based on server response
        if (serverResponse?.data === "Invalid email format") {
          throw new Error(
            "Invalid email format. Please check the email address."
          );
        } else if (serverResponse?.data === "Invalid credentials") {
          throw new Error(
            "Invalid credentials. Please verify the email and secretKey from Protonest dashboard."
          );
        } else if (serverResponse?.data === "User not found") {
          throw new Error(
            "User not found. Please check if the email is registered in the system."
          );
        } else if (serverResponse?.data === "Email not verified") {
          throw new Error(
            "Email not verified. Please verify your email address first."
          );
        } else {
          throw new Error(
            `Authentication failed: ${
              serverResponse?.data || "Please verify email and secretKey"
            }`
          );
        }
      } else if (error.response?.status === 500) {
        console.error("❌ Server error (500):", error.response.data);
        throw new Error("Internal server error. Please try again later.");
      } else {
        console.error(
          `❌ Unexpected error (${error.response?.status}):`,
          error.response?.data
        );
        throw error;
      }
    }
  } catch (error) {
    // Final error logging
    console.error("❌ Login process failed:", {
      message: error.message,
      email: email?.trim(),
      hasPassword: !!password,
      passwordLength: password?.length || 0,
    });
    throw error;
  }
};

// Token refresh function using /get-new-token endpoint
export const refreshToken = async (refreshToken) => {
  try {
    if (!refreshToken) {
      throw new Error("Refresh token is required");
    }

    console.log("🔄 Attempting token refresh with /get-new-token endpoint");

    const response = await axios.post(
      `${API_URL}/get-new-token`,
      {}, // Empty body
      {
        headers: {
          "X-Refresh-Token": refreshToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );

    console.log("📡 Token refresh response:", response.data);

    if (response.data.status === "Success") {
      const newJwtToken =
        response.data.data?.jwtToken || response.data.jwtToken;
      const newRefreshToken =
        response.data.data?.refreshToken || response.data.refreshToken;

      if (newJwtToken) {
        console.log("✅ Token refresh successful");
        return { jwtToken: newJwtToken, refreshToken: newRefreshToken };
      } else {
        throw new Error("No JWT token in refresh response");
      }
    } else {
      throw new Error(
        `Token refresh failed: ${response.data.message || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error("❌ Token refresh failed:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};

// Ensure auth using VITE env credentials (singleton promise to avoid races)
let __envAuthPromise = null;
export const ensureAuthFromEnv = async () => {
  // If we already have a JWT stored, return it
  const existing =
    typeof window !== "undefined" && localStorage.getItem("jwtToken");
  if (existing) return existing;

  const envEmail = import.meta.env.VITE_USER_EMAIL;
  const envSecret = import.meta.env.VITE_USER_SECRET;

  if (!envEmail || !envSecret) return null;

  if (__envAuthPromise) return __envAuthPromise;

  __envAuthPromise = (async () => {
    try {
      const resp = await login(envEmail, envSecret);
      const jwt = resp?.jwtToken;
      const refresh = resp?.refreshToken;
      if (jwt && typeof window !== "undefined") {
        localStorage.setItem("jwtToken", jwt);
        if (refresh) localStorage.setItem("refreshToken", refresh);
      }
      return jwt;
    } catch (e) {
      throw e;
    } finally {
      __envAuthPromise = null;
    }
  })();

  return __envAuthPromise;
};
