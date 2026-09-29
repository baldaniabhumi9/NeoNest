import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import AppLayout from "../components/AppLayout";
import client from "../api/client";
import { useDevices } from "../context/DeviceContext";

const RANGES = [
  { key: "6h", label: "6 hours", ms: 6 * 60 * 60 * 1000 },
  { key: "24h", label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 }
];

export default function Trends() {
  const { selectedId } = useDevices();
  const [range, setRange] = useState("24h");
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const ms = RANGES.find((r) => r.key === range).ms;
      const from = new Date(Date.now() - ms).toISOString();
      const { data } = await client.get(`/vitals/${selectedId}/history?from=${from}&limit=2000`);
      setReadings(data.readings);
    } finally {
      setLoading(false);
    }
  }, [selectedId, range]);

  useEffect(() => {
    load();
  }, [load]);

  const data = readings.map((r) => ({
    ...r,
    label: new Date(r.timestamp).toLocaleString(undefined, {
      month: "short",
      day: range === "6h" || range === "24h" ? undefined : "numeric",
      hour: "2-digit",
      minute: range === "7d" || range === "30d" ? undefined : "2-digit"
    })
  }));

  return (
    <AppLayout title="Trends">
      <div className="flex gap-2 mb-5 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`pill border transition-colors ${
              range === r.key ? "bg-sage text-white border-sage" : "bg-white border-black/10 text-ink-soft hover:border-sage"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-ink-soft/60">Loading trend data…</p>}
      {!loading && data.length === 0 && (
        <p className="text-sm text-ink-soft/60 text-center py-16">No readings in this time range yet.</p>
      )}

      {!loading && data.length > 0 && (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-display text-base mb-3">Heart Rate &amp; SpO{"\u2082"}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data} margin={{ left: -20, right: 10 }}>
                <CartesianGrid stroke="#2B3A3A0D" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#4C5C5C" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#4C5C5C" }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #2B3A3A1A", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="heartRate" name="Heart Rate" stroke="#8FA88E" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="spo2" name="SpO\u2082" stroke="#A9C4D1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-base mb-3">Temperature</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ left: -20, right: 10 }}>
                <CartesianGrid stroke="#2B3A3A0D" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#4C5C5C" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#4C5C5C" }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #2B3A3A1A", fontSize: 12 }} />
                <Line type="monotone" dataKey="temperature" stroke="#E8A34D" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-base mb-3">Motion activity</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={{ left: -20, right: 10 }}>
                <CartesianGrid stroke="#2B3A3A0D" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#4C5C5C" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#4C5C5C" }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #2B3A3A1A", fontSize: 12 }} />
                <Line type="monotone" dataKey="motion" stroke="#D1685A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
