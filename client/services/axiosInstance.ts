import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
  if (!config.headers) config.headers = {} as any;
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
