import api from "./apiTest";

export const loginUser = async (email, password) => {
  try {
    const response = await api.post("/get-token", {
      email,
      password,
    });

    if (response.data.status === "Success") {
      const { jwtToken, refreshToken } = response.data.data;
      localStorage.setItem("jwtToken", jwtToken);
      localStorage.setItem("refreshToken", refreshToken);
      return response.data.data;
    } else {
      throw new Error(response.data.data || "Login Failed");
    }
  } catch (error) {
    throw error.response?.data?.data || error.message;
  }
};
