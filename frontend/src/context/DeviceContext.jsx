import { createContext, useContext, useEffect, useState, useCallback } from "react";
import client from "../api/client";
import { useAuth } from "./AuthContext";

const DeviceContext = createContext(null);

export function DeviceProvider({ children }) {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [selectedId, setSelectedId] = useState(localStorage.getItem("neovitals_device") || null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setDevices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await client.get("/devices");
      setDevices(data.devices);
      if (!selectedId && data.devices.length) {
        setSelectedId(data.devices[0]._id);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (selectedId) localStorage.setItem("neovitals_device", selectedId);
  }, [selectedId]);

  const selectedDevice = devices.find((d) => d._id === selectedId) || null;

  return (
    <DeviceContext.Provider value={{ devices, selectedDevice, selectedId, setSelectedId, refresh, loading }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevices() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDevices must be used within DeviceProvider");
  return ctx;
}
