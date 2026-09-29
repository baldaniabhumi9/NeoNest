export function heartRateStatus(value, thresholds) {
  if (value == null) return "ok";
  if (value < thresholds.heartRateLow - 15 || value > thresholds.heartRateHigh + 20) return "critical";
  if (value < thresholds.heartRateLow || value > thresholds.heartRateHigh) return "warning";
  return "ok";
}

export function spo2Status(value, thresholds) {
  if (value == null) return "ok";
  if (value < thresholds.spo2Low - 5) return "critical";
  if (value < thresholds.spo2Low) return "warning";
  return "ok";
}

export function temperatureStatus(value, thresholds) {
  if (value == null) return "ok";
  if (value < thresholds.temperatureLow - 0.7 || value > thresholds.temperatureHigh + 0.7) return "critical";
  if (value < thresholds.temperatureLow || value > thresholds.temperatureHigh) return "warning";
  return "ok";
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
