/**
 * NeoVitals AI Engine
 * ---------------------------------------------------------------------------
 * This is a transparent, deterministic statistical engine — not a trained
 * neural network. For a medical-adjacent device that's a feature, not a
 * limitation: every score it produces can be explained in plain language
 * ("HR is 2.8 standard deviations above this baby's recent baseline").
 *
 * It combines four techniques, all computed from the last N readings:
 *   1. Clinical threshold scoring   – neonatal reference ranges (NICE/WHO-style)
 *   2. Rolling z-score anomaly detection – flags readings that deviate sharply
 *      from THIS baby's own recent baseline (personalized, not population-only)
 *   3. Linear regression trend detection – is a vital drifting up/down/stable
 *   4. Multi-signal fusion – weighted combination into one 0-100 risk score
 *
 * Swap-in point for real ML later: replace computeRiskScore()'s weighting
 * with a trained model's output while keeping the same input/output shape.
 */

// Neonatal reference ranges used for absolute clinical scoring.
const CLINICAL_RANGES = {
  heartRate: { low: 100, high: 180, criticalLow: 80, criticalHigh: 220 },
  spo2: { low: 90, high: 100, criticalLow: 85 },
  temperature: { low: 36.0, high: 37.8, criticalLow: 35.5, criticalHigh: 38.5 }
};

function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr, avg) {
  if (arr.length < 2) return 0;
  const m = avg ?? mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// Ordinary least squares slope of value vs. index (time-ordered readings)
function linearSlope(values) {
  const n = values.length;
  if (n < 3) return 0;
  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function classifyTrend(slope, noiseThreshold) {
  if (slope > noiseThreshold) return "rising";
  if (slope < -noiseThreshold) return "falling";
  return "stable";
}

/**
 * Clinical score: 0 (within normal range) to 100 (critical breach) per vital.
 */
function clinicalScore(vital, value) {
  if (value === undefined || value === null) return 0;
  const r = CLINICAL_RANGES[vital];
  if (!r) return 0;

  if (vital === "spo2") {
    if (value <= r.criticalLow) return 100;
    if (value < r.low) return 60 + (r.low - value) * 8;
    return 0;
  }

  const critLow = r.criticalLow;
  const critHigh = r.criticalHigh;
  if (value <= critLow || value >= critHigh) return 100;
  if (value < r.low) return 40 + ((r.low - value) / (r.low - critLow)) * 40;
  if (value > r.high) return 40 + ((value - r.high) / (critHigh - r.high)) * 40;
  return 0;
}

/**
 * Rolling z-score anomaly detection against the baby's own recent baseline.
 * Returns anomalies with |z| > 2.5 (roughly 99th percentile deviation).
 */
// Floors prevent divide-by-near-zero blowups when a vital happens to be
// perfectly flat over the baseline window (common with low sensor noise or
// synthetic test data) — clamps the denominator to plausible sensor noise.
const MIN_STD_DEV = { heartRate: 2, spo2: 1, temperature: 0.1 };

function detectAnomalies(readings) {
  const anomalies = [];
  const vitals = ["heartRate", "spo2", "temperature"];

  vitals.forEach((vital) => {
    const values = readings.map((r) => r[vital]).filter((v) => v !== undefined && v !== null);
    if (values.length < 6) return; // not enough history for a stable baseline

    const baseline = values.slice(0, -1); // all but the latest reading
    const latest = values[values.length - 1];
    const m = mean(baseline);
    const sd = Math.max(stdDev(baseline, m), MIN_STD_DEV[vital]);

    const z = (latest - m) / sd;
    if (Math.abs(z) > 2.5) {
      anomalies.push({
        vital,
        zScore: Number(z.toFixed(2)),
        description: `${vital} at ${latest} is ${Math.abs(z).toFixed(1)}\u03c3 ${z > 0 ? "above" : "below"} this baby's recent baseline (~${m.toFixed(1)})`
      });
    }
  });

  return anomalies;
}

/**
 * Trend prediction: OLS slope per vital, classified as rising/falling/stable.
 */
function detectTrends(readings) {
  const heartRate = readings.map((r) => r.heartRate).filter((v) => v != null);
  const spo2 = readings.map((r) => r.spo2).filter((v) => v != null);
  const temperature = readings.map((r) => r.temperature).filter((v) => v != null);

  return {
    heartRate: classifyTrend(linearSlope(heartRate), 0.8),
    spo2: classifyTrend(linearSlope(spo2), 0.15),
    temperature: classifyTrend(linearSlope(temperature), 0.02)
  };
}

/**
 * Sleep analysis: infers a coarse sleep state from motion + heart-rate
 * variability, mirroring the well-established heuristic that active sleep
 * (REM-analog) in neonates shows more motion + HR variability than quiet
 * sleep, while wake shows sustained high motion.
 */
function analyzeSleep(readings) {
  if (readings.length < 6) return "unknown";
  const motion = mean(readings.map((r) => r.motion).filter((v) => v != null));
  const hr = readings.map((r) => r.heartRate).filter((v) => v != null);
  const hrVariability = stdDev(hr, mean(hr));

  if (motion === null) return "unknown";
  if (motion > 40) return "awake";
  if (motion > 12 || hrVariability > 8) return "active_sleep";
  return "quiet_sleep";
}

/**
 * Multi-signal fusion: combine clinical + anomaly + trend signals into one
 * composite 0-100 risk score with a human-readable level.
 */
function computeRiskScore(latestReading, anomalies, trends) {
  const weights = { heartRate: 0.3, spo2: 0.4, temperature: 0.2, anomaly: 0.1 };

  const clinical =
    clinicalScore("heartRate", latestReading.heartRate) * weights.heartRate +
    clinicalScore("spo2", latestReading.spo2) * weights.spo2 +
    clinicalScore("temperature", latestReading.temperature) * weights.temperature;

  const anomalyPenalty = Math.min(anomalies.length * 15, 100) * weights.anomaly;

  // A vital that is simultaneously out-of-range AND trending the wrong way
  // compounds risk faster than either signal alone (early-warning behavior).
  let compounding = 0;
  if (trends.spo2 === "falling" && latestReading.spo2 < 95) compounding += 8;
  if (trends.heartRate === "falling" && latestReading.heartRate < 110) compounding += 6;
  if (trends.temperature === "rising" && latestReading.temperature > 37.5) compounding += 4;

  const score = Math.min(100, Math.round(clinical + anomalyPenalty + compounding));
  return score;
}

function riskLevelFromScore(score) {
  if (score >= 75) return "critical";
  if (score >= 45) return "alert";
  if (score >= 20) return "attention";
  return "calm";
}

/**
 * Main entry point. Pass the most recent readings for a device
 * (oldest -> newest), at least 6-10 for meaningful anomaly/trend detection.
 */
function runAIAnalysis(readings) {
  if (!readings || readings.length === 0) {
    return {
      riskScore: 0,
      riskLevel: "calm",
      anomalies: [],
      trends: { heartRate: "stable", spo2: "stable", temperature: "stable" },
      sleepState: "unknown",
      notes: "No readings available yet."
    };
  }

  const latest = readings[readings.length - 1];
  const anomalies = detectAnomalies(readings);
  const trends = detectTrends(readings);
  const sleepState = analyzeSleep(readings);
  const riskScore = computeRiskScore(latest, anomalies, trends);
  const riskLevel = riskLevelFromScore(riskScore);

  const notesParts = [];
  if (anomalies.length) notesParts.push(`${anomalies.length} statistical anomal${anomalies.length === 1 ? "y" : "ies"} detected against baseline.`);
  if (trends.spo2 === "falling") notesParts.push("SpO\u2082 trending downward.");
  if (trends.heartRate === "falling") notesParts.push("Heart rate trending downward.");
  if (trends.temperature === "rising") notesParts.push("Temperature trending upward.");
  if (!notesParts.length) notesParts.push("All signals within expected pattern.");

  return {
    riskScore,
    riskLevel,
    anomalies,
    trends,
    sleepState,
    notes: notesParts.join(" ")
  };
}

module.exports = {
  runAIAnalysis,
  detectAnomalies,
  detectTrends,
  analyzeSleep,
  computeRiskScore,
  riskLevelFromScore,
  CLINICAL_RANGES
};
