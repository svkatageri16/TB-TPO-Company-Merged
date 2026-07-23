import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

let socket: Socket | null = null;
const BACKEND_ENDPOINT = "https://ais-dev-xhz5q44zu67s4vmkatrgzp-440244242180.asia-southeast1.run.app";

/**
 * Initializes the global Socket.IO tunnel safely without crashing React's main UI threads.
 */
export async function initializeSocketTunnel(): Promise<Socket | null> {
  const token = await AsyncStorage.getItem("userToken");
  if (!token) {
    console.log("🔌 Socket skipped: Token undefined (User is unauthenticated)");
    return null;
  }

  if (socket) {
    if (socket.connected) return socket;
    socket.connect();
    return socket;
  }

  try {
    socket = io(BACKEND_ENDPOINT, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: { token },
    });

    socket.on("connect", () => {
      console.log("⚡ [SOCKET COMPASS CONNECTED]: Secure WebSocket Tunnel active.");
    });

    socket.on("disconnect", (reason) => {
      console.warn(`🔌 [SOCKET COMPASS DISCONNECTED] reason: ${reason}. Auto-attempting loop recovery...`);
    });

    socket.on("connect_error", (err) => {
      console.warn("⚠️ WebSocket connection handshake stalled:", err.message);
    });

  } catch (err) {
    console.error("Failed to boot Socket Client:", err);
  }

  return socket;
}

export function getSocketInstance(): Socket | null {
  return socket;
}

export function closeSocketTunnel(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("🔌 Secure WebSocket Tunnel explicitly terminated.");
  }
}
