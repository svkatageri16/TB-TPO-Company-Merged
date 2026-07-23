import axios from "axios";

const api = axios.create({
  baseURL: "/api"
});

api.interceptors.request.use((config) => {
  const authData = localStorage.getItem("vega_auth");
  if (authData) {
    try {
      const { token } = JSON.parse(authData);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Auth parsing error", e);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const authData = localStorage.getItem("vega_auth");
      
      if (authData) {
        try {
          const { refreshToken } = JSON.parse(authData);
          if (refreshToken) {
            const { data } = await axios.post("/api/auth/refresh-token", { refreshToken });
            if (data.success && data.token) {
              const parsed = JSON.parse(authData);
              parsed.token = data.token;
              localStorage.setItem("vega_auth", JSON.stringify(parsed));
              originalRequest.headers.Authorization = `Bearer ${data.token}`;
              return api(originalRequest);
            }
          }
        } catch (e) {
          localStorage.removeItem("vega_auth");
          window.location.href = "/login";
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
