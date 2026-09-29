import { useEffect, useState } from "react";
import client from "../api/client";
import { useSocket } from "../context/SocketContext";

const MAX_POINTS = 120;

/**
 * Loads recent history for a device, subscribes to its socket room, and
 * keeps a rolling window of live readings/alerts/AI predictions in state.
 */
export default function useLiveVitals(deviceId) {
  const { socket } = useSocket();
  const [readings, setReadings] = useState([]);
  const [latest, setLatest] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [historyRes, predictionRes] = await Promise.all([
          client.get(`/vitals/${deviceId}/history?limit=${MAX_POINTS}`),
          client.get(`/ai/${deviceId}/latest`)
        ]);
        if (cancelled) return;
        setReadings(historyRes.data.readings);
        setLatest(historyRes.data.readings.at(-1) || null);
        setPrediction(predictionRes.data.prediction);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  useEffect(() => {
    if (!socket || !deviceId) return;

    // find the device's own deviceId string (hardware id) to join its room
    let deviceHwId = null;
    client.get(`/devices/${deviceId}`).then((res) => {
      deviceHwId = res.data.device.deviceId;
      socket.emit("subscribe:device", deviceHwId);
    });

    function onReading(reading) {
      if (reading.device !== deviceId) return;
      setLatest(reading);
      setReadings((prev) => [...prev.slice(-MAX_POINTS + 1), reading]);
    }
    function onAI(pred) {
      if (pred.device !== deviceId) return;
      setPrediction(pred);
    }
    function onAlert(alert) {
      if (alert.device !== deviceId) return;
      setAlerts((prev) => [alert, ...prev].slice(0, 20));
    }

    socket.on("vital:new", onReading);
    socket.on("ai:update", onAI);
    socket.on("alert:new", onAlert);

    return () => {
      if (deviceHwId) socket.emit("unsubscribe:device", deviceHwId);
      socket.off("vital:new", onReading);
      socket.off("ai:update", onAI);
      socket.off("alert:new", onAlert);
    };
  }, [socket, deviceId]);

  return { readings, latest, prediction, alerts, loading };
}
