import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE } from "../api/client";

const SocketContext = createContext(null);
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, "");

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("neovitals_token");
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, autoConnect: true });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => socket.disconnect();
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
