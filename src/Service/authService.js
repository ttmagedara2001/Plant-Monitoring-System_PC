import axios from "axios";

// Environment-based API URL selection
const getApiUrl = () => {
  const isDev = import.meta.env.DEV;
  const useLocal = import.meta.env.VITE_USE_LOCAL_API === "true";

  if (isDev && useLocal) {
    return "http://localhost:8091/api/v1/user";
  }
  return "https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user";
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

    // First, try POST method (standard for authentication)
    try {
      const response = await axios.post(
        `${API_URL}/get-token`,
        {
          email: cleanEmail,
          password: cleanPassword,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          timeout: 10000, // 10s timeout
        }
      );

      console.log("📡 API Response (POST):", response.data);

      if (response.data.status === "Success") {
        const jwtToken = response.data.data?.jwtToken || response.data.jwtToken;
        const refreshToken =
          response.data.data?.refreshToken || response.data.refreshToken;

        if (!jwtToken) {
          throw new Error("No JWT token in response");
        }

        console.log(
          "✅ Login successful with POST method. JWT token received securely."
        );
        return { jwtToken, refreshToken, userId: cleanEmail };
      } else {
        throw new Error(
          `Authentication failed: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (postError) {
      // If POST fails with 405, try GET method as fallback
      if (postError.response?.status === 405) {
        console.warn("⚠️ POST method not allowed (405), trying GET method...");

        const getResponse = await axios.get(`${API_URL}/get-token`, {
          params: {
            email: cleanEmail,
            password: cleanPassword,
          },
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          timeout: 10000,
        });

        console.log("📡 API Response (GET fallback):", getResponse.data);

        if (getResponse.data.status === "Success") {
          const jwtToken =
            getResponse.data.data?.jwtToken || getResponse.data.jwtToken;
          const refreshToken =
            getResponse.data.data?.refreshToken ||
            getResponse.data.refreshToken;

          if (!jwtToken) {
            throw new Error("No JWT token in GET response");
          }

          console.log("✅ Fallback GET login successful (less secure method).");
          return { jwtToken, refreshToken, userId: cleanEmail };
        } else {
          throw new Error(
            `GET Authentication failed: ${
              getResponse.data.message || "Unknown error"
            }`
          );
        }
      } else {
        // Re-throw the original error if it's not a 405
        throw postError;
      }
    }
  } catch (error) {
    // Enhanced error logging
    if (error.response) {
      console.error("❌ Server Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method,
        allowHeader: error.response.headers?.allow || "Not specified",
      });
    } else if (error.request) {
      console.error("❌ Network Error:", {
        message: error.message,
        code: error.code,
        timeout: error.timeout,
      });
    } else {
      console.error("❌ Request Setup Error:", error.message);
    }
    throw error;
  }
};
// Emoji symbols are used to read the responses in the console more easily
