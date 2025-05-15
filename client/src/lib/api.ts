import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_ADMIN_API_URL,
});

api.interceptors.request.use(
  (config) => {
    config.headers.set("Content-Type", "application/json");
    config.headers.set(
      "X-Company-ID",
      localStorage.getItem("selected_company") || "",
    );
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
