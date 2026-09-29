import { useEffect, useState, useCallback } from "react";
import AppLayout from "../components/AppLayout";
import client from "../api/client";
import { useDevices } from "../context/DeviceContext";

export default function History() {
  const { selectedId } = useDevices();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      const { data } = await client.get(`/vitals/${selectedId}/history?${params.toString()}`);
      setReadings(data.readings.slice().reverse());
    } finally {
      setLoading(false);
    }
  }, [selectedId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const header = "timestamp,heartRate,spo2,temperature,motion,skinContact,battery\n";
    const rows = readings
      .map((r) => [r.timestamp, r.heartRate, r.spo2, r.temperature, r.motion, r.skinContact, r.battery].join(","))
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neovitals-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout title="History">
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="text-xs text-ink-soft block mb-1">From</label>
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="input !py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-ink-soft block mb-1">To</label>
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="input !py-2 text-sm" />
        </div>
        <button onClick={exportCsv} disabled={!readings.length} className="btn-secondary text-sm">
          Export CSV
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-soft border-b border-black/5">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">HR (bpm)</th>
                <th className="px-4 py-3 font-medium">SpO{"\u2082"} (%)</th>
                <th className="px-4 py-3 font-medium">Temp ({"\u00b0"}C)</th>
                <th className="px-4 py-3 font-medium">Motion</th>
                <th className="px-4 py-3 font-medium">Battery</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft/60">Loading…</td></tr>
              )}
              {!loading && readings.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft/60">No readings in this range.</td></tr>
              )}
              {!loading && readings.map((r) => (
                <tr key={r._id} className="border-b border-black/5 last:border-0 hover:bg-cloudDim/50">
                  <td className="px-4 py-2.5 font-mono text-xs">{new Date(r.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono">{r.heartRate ?? "--"}</td>
                  <td className="px-4 py-2.5 font-mono">{r.spo2 ?? "--"}</td>
                  <td className="px-4 py-2.5 font-mono">{r.temperature ?? "--"}</td>
                  <td className="px-4 py-2.5 font-mono">{r.motion ?? "--"}</td>
                  <td className="px-4 py-2.5 font-mono">{r.battery != null ? `${r.battery}%` : "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
