import axios from "axios";

// Use VITE_API_BASE_URL from environment
// This should be the full API base path: https://api.protonestconnect.co/api/v1
const API_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Login using cookie-based authentication
 * 
 * NEW API BEHAVIOR:
 * - POST /user/get-token returns 200 OK with NO response body on success
 * - JWT and Refresh Token are set automatically as HttpOnly cookies by the server
 * - We do NOT store tokens in localStorage/sessionStorage
 * 
 * @param {string} email - User email
 * @param {string} password - User secret key (from Protonest dashboard)
 * @returns {Promise<{success: true, userId: string}>} - Success indicator and user ID
 */
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

    console.log("🔄 Making cookie-based authentication request to:", API_URL);
    console.log(
      "📋 IMPORTANT: Using secretKey as password (not login password)"
    );

    const payload = {
      email: cleanEmail,
      password: cleanPassword,
    };

    console.log("🔄 Attempting /user/get-token:", {
      email: cleanEmail,
      passwordType: "secretKey",
      passwordLength: cleanPassword.length,
    });

    const response = await axios.post(`${API_URL}/user/get-token`, payload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // CRITICAL: Include credentials so cookies can be set by server
      withCredentials: true,
      timeout: 10000,
    });

    // NEW: Success is indicated by 200 OK status
    // The server sets HttpOnly cookies automatically - no token in response body
    console.log("✅ Login successful - cookies set by server");
    console.log("📡 Response status:", response.status);

    // Return success indicator and userId (email)
    // Note: We no longer return jwtToken or refreshToken as they're in HttpOnly cookies
    return { 
      success: true, 
      userId: cleanEmail 
    };
    
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
      const errorData = serverResponse?.data;
      if (errorData === "Invalid email format") {
        throw new Error(
          "Invalid email format. Please check the email address."
        );
      } else if (errorData === "Invalid credentials") {
        throw new Error(
          "Invalid credentials. Please verify the email and secretKey from Protonest dashboard."
        );
      } else if (errorData === "User not found") {
        throw new Error(
          "User not found. Please check if the email is registered in the system."
        );
      } else if (errorData === "Email not verified") {
        throw new Error(
          "Email not verified. Please verify your email address first."
        );
      } else {
        throw new Error(
          `Authentication failed: ${errorData || "Please verify email and secretKey"}`
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
};

/**
 * Refresh session using cookie-based token refresh
 * 
 * NEW API BEHAVIOR:
 * - GET /get-new-token uses the existing Refresh Token cookie
 * - No manual headers needed - cookies are sent automatically
 * - On success, new cookies are set by the server
 * 
 * @returns {Promise<{success: true}>} - Success indicator
 */
export const refreshSession = async () => {
  try {
    console.log("🔄 Attempting cookie-based session refresh");

    const response = await axios.get(`${API_URL}/get-new-token`, {
      // CRITICAL: Include credentials so refresh token cookie is sent
      withCredentials: true,
      timeout: 10000,
    });

    // Success is indicated by 200 OK status
    // New cookies are set automatically by the server
    console.log("✅ Session refreshed successfully via cookies");
    
    return { success: true };
    
  } catch (error) {
    const errorData = error.response?.data?.data;
    
    console.error("❌ Session refresh failed:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Provide specific error for refresh failures
    if (errorData === "Refresh token is required") {
      throw new Error("No refresh token available - please log in again");
    } else if (errorData === "Invalid refresh token") {
      throw new Error("Session expired - please log in again");
    } else {
      throw error;
    }
  }
};

/**
 * Ensure authentication using environment credentials
 * Used for auto-login during app initialization
 * 
 * With cookie-based auth, this function:
 * - Checks if we believe we're authenticated (from a flag)
 * - If not, attempts login using ENV credentials
 * - Returns success indicator
 * 
 * @returns {Promise<boolean>} - True if authenticated
 */
let __envAuthPromise = null;
let __isAuthenticated = false;

export const ensureAuthFromEnv = async () => {
  // If we believe we're already authenticated, return true
  // Note: We can't actually check cookies from JS (HttpOnly), so we track state
  if (__isAuthenticated) {
    return true;
  }

  const envEmail = import.meta.env.VITE_USER_EMAIL;
  const envSecret = import.meta.env.VITE_USER_SECRET;

  if (!envEmail || !envSecret) {
    return false;
  }

  // Singleton promise to avoid race conditions
  if (__envAuthPromise) {
    return __envAuthPromise;
  }

  __envAuthPromise = (async () => {
    try {
      await login(envEmail, envSecret);
      __isAuthenticated = true;
      return true;
    } catch (e) {
      console.error("❌ Auto-login from ENV failed:", e.message);
      __isAuthenticated = false;
      return false;
    } finally {
      __envAuthPromise = null;
    }
  })();

  return __envAuthPromise;
};

/**
 * Check if user is authenticated (based on local state)
 * Note: We can't directly check HttpOnly cookies from JavaScript
 */
export const isAuthenticated = () => {
  return __isAuthenticated;
};

/**
 * Set authentication state (used by AuthContext)
 */
export const setAuthenticatedState = (state) => {
  __isAuthenticated = state;
};

/**
 * Clear authentication state (used on logout)
 */
export const clearAuthState = () => {
  __isAuthenticated = false;
};
