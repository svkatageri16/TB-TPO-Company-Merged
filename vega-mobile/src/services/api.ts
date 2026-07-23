import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Production API Base URL fallback path
const DEFAULT_URL = "https://ais-dev-xhz5q44zu67s4vmkatrgzp-440244242180.asia-southeast1.run.app/api";

export const api: AxiosInstance = axios.create({
  baseURL: DEFAULT_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Outbox pattern structure to buffer offline actions to be automatically replayed on reconnection handles
export interface OfflineRequest {
  id: string;
  url: string;
  method: "POST" | "PUT" | "DELETE";
  data: any;
  timestamp: number;
}

// Request Interceptor: Auto-Inject Bearer Token from Secure/Async Storage
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Storage read error within request middleware", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Seamless Automatic JWT Regenerative Handshakes
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        console.log("🔒 Access Token expired. Triggering automated JWT Refresh flow...");
        const oldRefreshToken = await AsyncStorage.getItem("userRefreshToken");
        if (oldRefreshToken) {
          // Contact Backend JWT Refresh Pipeline
          const res = await axios.post(`${DEFAULT_URL}/auth/refresh`, {
            refreshToken: oldRefreshToken,
          });
          if (res.data && res.data.token) {
            await AsyncStorage.setItem("userToken", res.data.token);
            if (res.data.refreshToken) {
              await AsyncStorage.setItem("userRefreshToken", res.data.refreshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshErr) {
        console.error("❌ JWT Refresh Cycle Failed. User must sign in again.", refreshErr);
        // Dispatch global screen forward request or clean storage to log state out
        await AsyncStorage.multiRemove(["userToken", "userRefreshToken", "userData"]);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Queue a network request for background retry when offline connectivity is detected.
 */
export async function queueOfflineRequest(url: string, method: "POST" | "PUT" | "DELETE", data: any) {
  try {
    const queueString = await AsyncStorage.getItem("offline_request_queue");
    const queue: OfflineRequest[] = queueString ? JSON.parse(queueString) : [];
    
    const newRequest: OfflineRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      method,
      data,
      timestamp: Date.now(),
    };
    
    queue.push(newRequest);
    await AsyncStorage.setItem("offline_request_queue", JSON.stringify(queue));
    console.log(`📡 Offline: Request queued dynamically for background execution [${url}]`);
  } catch (err) {
    console.error("Failed to commit request write to offline storage:", err);
  }
}

/**
 * Sync logic: iterates the cached request buffer once backend connectivity resets back to active state.
 */
export async function syncOfflineQueue(): Promise<number> {
  try {
    const queueString = await AsyncStorage.getItem("offline_request_queue");
    if (!queueString) return 0;
    
    const queue: OfflineRequest[] = JSON.parse(queueString);
    if (queue.length === 0) return 0;
    
    console.log(`⚡ Converted back online. Replaying ${queue.length} buffered requests...`);
    const successfulIds: string[] = [];
    
    for (const req of queue) {
      try {
        if (req.method === "POST") {
          await api.post(req.url, req.data);
        } else if (req.method === "PUT") {
          await api.put(req.url, req.data);
        } else if (req.method === "DELETE") {
          await api.delete(req.url);
        }
        successfulIds.push(req.id);
      } catch (err) {
        console.warn(`Request replay failed for ${req.url}:`, err);
        // Leave the transaction inside queue for safe, robust multi-pass error handling
      }
    }
    
    const updatedQueue = queue.filter(r => !successfulIds.includes(r.id));
    await AsyncStorage.setItem("offline_request_queue", JSON.stringify(updatedQueue));
    return successfulIds.length;
  } catch (err) {
    console.error("Offline sync helper crashed:", err);
    return 0;
  }
}
