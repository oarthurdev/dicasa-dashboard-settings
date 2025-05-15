import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_ADMIN_API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    config.headers = {
      ...config.headers,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Company-ID": localStorage.getItem("selected_company") || "",
    };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;