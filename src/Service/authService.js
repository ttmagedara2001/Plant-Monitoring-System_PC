import axios from "axios";

// Remote API prefix is used for authentication
const REMOTE_API_PREFIX =
  "https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user";

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

    console.log("🔄 Making secure authentication request...");

    const response = await axios.post(
      `${REMOTE_API_PREFIX}/get-token`,
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

    console.log("📡 API Response:", response.data);

    if (response.data.status === "Success") {
      const jwtToken = response.data.data?.jwtToken || response.data.jwtToken;
      const refreshToken =
        response.data.data?.refreshToken || response.data.refreshToken;

      if (!jwtToken) {
        throw new Error("No JWT token in response");
      }

      console.log("✅ Login successful. JWT token received securely.");
      return { jwtToken, refreshToken, userId: cleanEmail };
    } else {
      throw new Error(
        `Authentication failed: ${response.data.message || "Unknown error"}`
      );
    }
  } catch (error) {
    // Enhanced error logging with fallback attempt
    if (error.response?.status === 405) {
      console.warn("⚠️ POST method not allowed, trying fallback method...");

      // Fallback to GET only if POST is not supported (less secure but sometimes necessary)
      try {
        console.log("🔄 Attempting fallback authentication method...");

        const fallbackResponse = await axios.get(
          `${REMOTE_API_PREFIX}/get-token`,
          {
            params: {
              email: email.trim(),
              password: password.trim(),
            },
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-cache",
            },
            timeout: 10000,
          }
        );

        if (fallbackResponse.data.status === "Success") {
          const jwtToken =
            fallbackResponse.data.data?.jwtToken ||
            fallbackResponse.data.jwtToken;
          const refreshToken =
            fallbackResponse.data.data?.refreshToken ||
            fallbackResponse.data.refreshToken;

          if (!jwtToken) {
            throw new Error("No JWT token in fallback response");
          }

          console.log("✅ Fallback login successful (less secure method).");
          return { jwtToken, refreshToken, userId: email.trim() };
        }
      } catch (fallbackError) {
        console.error(
          "❌ Fallback method also failed:",
          fallbackError.response?.data || fallbackError.message
        );
        throw fallbackError;
      }
    }

    // Enhanced error logging for main request
    if (error.response) {
      console.error("❌ Server Error:", {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method,
      });
    } else if (error.request) {
      console.error("❌ Network Error:", error.message); 
    } else {
      console.error("❌ Request Error:", error.message);
    }
    throw error;
  }
};
// Emoji symbols are used to read the responses in the console more easily
