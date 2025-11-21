import axios from 'axios';

// Base URL from your provided API sheet
const BASE_URL = 'https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Adds X-Token header if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      config.headers['X-Token'] = token; 
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handles Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 400 && error.response?.data?.data === "Invalid token" && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error("No refresh token");

        const response = await axios.post(`${BASE_URL}/get-new-token`, {}, {
          headers: { 'X-Refresh-Token': refreshToken }
        });

        if (response.data.status === "Success") {
          const { jwtToken } = response.data.data;
          localStorage.setItem('jwtToken', jwtToken);
          originalRequest.headers['X-Token'] = jwtToken;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("Session expired:", refreshError);
        localStorage.clear();
        // window.location.href = '/login'; // Optional: Redirect to login
      }
    }
    return Promise.reject(error);
  }
);

export default api;