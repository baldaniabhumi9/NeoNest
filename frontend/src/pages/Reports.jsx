import { useEffect, useState, useCallback } from "react";
import { FileText, Download } from "lucide-react";
import AppLayout from "../components/AppLayout";
import client from "../api/client";
import { useDevices } from "../context/DeviceContext";

function summarize(readings) {
  const vitals = ["heartRate", "spo2", "temperature", "motion"];
  const out = {};
  vitals.forEach((v) => {
    const values = readings.map((r) => r[v]).filter((x) => x != null);
    if (!values.length) {
      out[v] = null;
      return;
    }
    out[v] = {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  });
  return out;
}

export default function Reports() {
  const { selectedDevice, selectedId } = useDevices();
  const [readings, setReadings] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const [vitalsRes, alertsRes] = await Promise.all([
        client.get(`/vitals/${selectedId}/history?from=${from}&limit=5000`),
        client.get(`/alerts/${selectedId}?status=all&limit=1000`)
      ]);
      setReadings(vitalsRes.data.readings);
      setAlertCount(alertsRes.data.alerts.filter((a) => new Date(a.createdAt) >= new Date(from)).length);
    } finally {
      setLoading(false);
    }
  }, [selectedId, days]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = summarize(readings);

  function downloadReport() {
    const babyName = selectedDevice?.baby?.name || "Baby";
    const lines = [
      `NeoVitals Summary Report`,
      `Baby: ${babyName}`,
      `Period: last ${days} day(s)`,
      `Generated: ${new Date().toLocaleString()}`,
      ``,
      `Readings recorded: ${readings.length}`,
      `Alerts raised: ${alertCount}`,
      ``,
      `Heart Rate: avg ${summary.heartRate?.avg?.toFixed(1) ?? "--"} bpm (range ${summary.heartRate?.min ?? "--"}-${summary.heartRate?.max ?? "--"})`,
      `SpO2: avg ${summary.spo2?.avg?.toFixed(1) ?? "--"}% (range ${summary.spo2?.min ?? "--"}-${summary.spo2?.max ?? "--"})`,
      `Temperature: avg ${summary.temperature?.avg?.toFixed(2) ?? "--"} C (range ${summary.temperature?.min ?? "--"}-${summary.temperature?.max ?? "--"})`,
      `Motion: avg ${summary.motion?.avg?.toFixed(1) ?? "--"} (range ${summary.motion?.min ?? "--"}-${summary.motion?.max ?? "--"})`
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neovitals-report-${days}d.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout title="Reports">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`pill border transition-colors ${
                days === d ? "bg-sage text-white border-sage" : "bg-white border-black/10 text-ink-soft hover:border-sage"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
        <button onClick={downloadReport} disabled={!readings.length} className="btn-secondary text-sm flex items-center gap-1.5">
          <Download size={15} /> Download report
        </button>
      </div>

      {loading && <p className="text-sm text-ink-soft/60">Building report…</p>}

      {!loading && (
        <div className="space-y-6">
          <div className="card p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sage/15 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-sage-dark" />
            </div>
            <div>
              <p className="font-display text-lg">{selectedDevice?.baby?.name || "Baby"}'s summary</p>
              <p className="text-sm text-ink-soft">
                {readings.length} readings · {alertCount} alert{alertCount === 1 ? "" : "s"} in the last {days} days
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: "heartRate", label: "Heart Rate", unit: "bpm" },
              { key: "spo2", label: "SpO\u2082", unit: "%" },
              { key: "temperature", label: "Temperature", unit: "\u00b0C" },
              { key: "motion", label: "Motion", unit: "" }
            ].map(({ key, label, unit }) => (
              <div key={key} className="card p-5">
                <p className="text-sm text-ink-soft">{label}</p>
                <p className="font-mono text-2xl mt-1 text-ink">
                  {summary[key] ? summary[key].avg.toFixed(1) : "--"} <span className="text-sm text-ink-soft/60">{unit}</span>
                </p>
                <p className="text-xs text-ink-soft/60 mt-1">
                  {summary[key] ? `range ${summary[key].min}\u2013${summary[key].max}` : "no data"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
