import axios from 'axios';

// Create a central Axios instance for the AgriCop Dashboard
// We use '/api' as the base URL. 
// Ensure your vite.config.js is set up to proxy '/api' to your actual backend URL
// to avoid CORS issues during development.
const api = axios.create({
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;