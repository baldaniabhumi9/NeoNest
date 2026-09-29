import { createContext, useContext, useEffect, useState, useCallback } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("neovitals_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await client.get("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("neovitals_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  async function login(email, password) {
    const { data } = await client.post("/auth/login", { email, password });
    localStorage.setItem("neovitals_token", data.token);
    setUser(data.user);
    return data.user;
  }

  async function signup(payload) {
    const { data } = await client.post("/auth/signup", payload);
    localStorage.setItem("neovitals_token", data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("neovitals_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
