import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../../config/env";
import { getAccessToken } from "../api/http";

function apiBaseToSocketBase(apiBase: string) {
  return apiBase.endsWith("/api") ? apiBase.slice(0, -"/api".length) : apiBase;
}

const SOCKET_BASE_URL = apiBaseToSocketBase(API_BASE_URL);

let globalSocket: Socket | null = null;

export function getGlobalSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }

  return globalSocket;
}
