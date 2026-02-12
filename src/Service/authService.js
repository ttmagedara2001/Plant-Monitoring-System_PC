import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;

// ---------------------------------------------------------------------------
// Token store — in-memory + localStorage (survives page refresh, no cookies)
// ---------------------------------------------------------------------------
const TOKEN_KEY = "authToken";
const REFRESH_KEY = "refreshToken";

let __jwtToken = localStorage.getItem(TOKEN_KEY) || null;
let __refreshToken = localStorage.getItem(REFRESH_KEY) || null;
let __isAuthenticated = !!__jwtToken;
let __envAuthPromise = null;

/** Sync in-memory tokens to localStorage. */
function _persistTokens() {
  __jwtToken
    ? localStorage.setItem(TOKEN_KEY, __jwtToken)
    : localStorage.removeItem(TOKEN_KEY);
  __refreshToken
    ? localStorage.setItem(REFRESH_KEY, __refreshToken)
    : localStorage.removeItem(REFRESH_KEY);
}

/** Get the current JWT access token. */
export const getJwtToken = () => __jwtToken;

/** Get the current refresh token. */
export const getRefreshToken = () => __refreshToken;

/** Manually set tokens (e.g. after restore or refresh). */
export const setTokens = (jwt, refresh) => {
  __jwtToken = jwt;
  __refreshToken = refresh;
  __isAuthenticated = !!jwt;
  _persistTokens();
};

/**
 * Authenticate via POST /get-token.
 * Stores JWT + refresh token in memory and localStorage.
 *
 * @param {string} email    - User email
 * @param {string} password - Secret key from Protonest dashboard
 * @returns {Promise<{success: boolean, userId: string, jwtToken: string, refreshToken: string}>}
 */
export const login = async (email, password) => {
  if (!email || !password) throw new Error("Email and password are required");

  const cleanEmail = email.trim();
  const cleanPassword = password.trim();
  if (!cleanEmail.includes("@")) throw new Error("Invalid email format");

  try {
    const response = await axios.post(
      `${API_URL}/get-token`,
      { email: cleanEmail, password: cleanPassword },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 10000,
      },
    );

    const data = response.data?.data || response.data;
    const jwtToken = data?.jwtToken || data?.token || data?.accessToken || null;
    const refreshToken = data?.refreshToken || null;

    __jwtToken = jwtToken;
    __refreshToken = refreshToken;
    __isAuthenticated = true;
    _persistTokens();

    return { success: true, userId: cleanEmail, jwtToken, refreshToken };
  } catch (error) {
    if (error.response?.status === 400) {
      const errorData = error.response.data?.data;
      const messages = {
        "Invalid email format":
          "Invalid email format. Please check the email address.",
        "Invalid credentials":
          "Invalid credentials. Please verify the email and secretKey from Protonest dashboard.",
        "User not found":
          "User not found. Please check if the email is registered.",
        "Email not verified":
          "Email not verified. Please verify your email address first.",
      };
      throw new Error(
        messages[errorData] ||
          `Authentication failed: ${errorData || "Please verify email and secretKey"}`,
      );
    } else if (error.response?.status === 500) {
      throw new Error("Internal server error. Please try again later.");
    }
    throw error;
  }
};

/**
 * Refresh the JWT by calling GET /get-new-token with the refresh token.
 * @returns {Promise<{success: boolean, jwtToken: string}>}
 */
export const refreshSession = async () => {
  if (!__refreshToken)
    throw new Error("No refresh token available — please log in again");

  try {
    const response = await axios.get(`${API_URL}/get-new-token`, {
      headers: { Authorization: `Bearer ${__refreshToken}` },
      timeout: 10000,
    });

    const data = response.data?.data || response.data;
    if (data?.jwtToken || data?.token || data?.accessToken) {
      __jwtToken = data.jwtToken || data.token || data.accessToken;
    }
    if (data?.refreshToken) __refreshToken = data.refreshToken;

    __isAuthenticated = true;
    _persistTokens();
    return { success: true, jwtToken: __jwtToken };
  } catch (error) {
    const msg = error.response?.data?.data;
    if (msg === "Refresh token is required")
      throw new Error("No refresh token available — please log in again");
    if (msg === "Invalid refresh token")
      throw new Error("Session expired — please log in again");
    throw error;
  }
};

/**
 * Ensure authenticated using env credentials (auto-login on app init).
 * @returns {Promise<boolean>}
 */
export const ensureAuthFromEnv = async () => {
  if (__isAuthenticated && __jwtToken) return true;

  const envEmail = import.meta.env.VITE_USER_EMAIL;
  const envSecret = import.meta.env.VITE_USER_SECRET;
  if (!envEmail || !envSecret) return false;

  if (__envAuthPromise) return __envAuthPromise;

  __envAuthPromise = (async () => {
    try {
      await login(envEmail, envSecret);
      return true;
    } catch (e) {
      console.error("[Auth] Auto-login from ENV failed:", e.message);
      __isAuthenticated = false;
      return false;
    } finally {
      __envAuthPromise = null;
    }
  })();

  return __envAuthPromise;
};

/** Check if user is authenticated. */
export const isAuthenticated = () => __isAuthenticated && !!__jwtToken;

/** Set authentication flag (used by AuthContext). */
export const setAuthenticatedState = (state) => {
  __isAuthenticated = state;
};

/** Clear all auth state (logout). */
export const clearAuthState = () => {
  __jwtToken = null;
  __refreshToken = null;
  __isAuthenticated = false;
  _persistTokens();
};
