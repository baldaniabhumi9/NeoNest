import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AppLayout from "../components/AppLayout";
import { useDevices } from "../context/DeviceContext";
import useLiveVitals from "../hooks/useLiveVitals";
import { formatTime } from "../utils/vitalStatus";

const CHARTS = [
  { key: "heartRate", label: "Heart Rate (bpm)", color: "#8FA88E" },
  { key: "spo2", label: "SpO\u2082 (%)", color: "#A9C4D1" },
  { key: "temperature", label: "Temperature (\u00b0C)", color: "#E8A34D" },
  { key: "motion", label: "Motion (0\u2013100)", color: "#D1685A" }
];

export default function LiveMonitoring() {
  const { selectedId } = useDevices();
  const { readings, loading } = useLiveVitals(selectedId);

  const data = readings.map((r) => ({ ...r, timeLabel: formatTime(r.timestamp) }));

  return (
    <AppLayout title="Live Monitoring">
      {loading && <p className="text-sm text-ink-soft/60">Loading recent readings…</p>}
      {!loading && data.length === 0 && (
        <p className="text-sm text-ink-soft/60 text-center py-16">
          No readings yet. Charts will populate the moment the shoe starts sending data.
        </p>
      )}
      {data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CHARTS.map(({ key, label, color }) => (
            <div key={key} className="card p-5">
              <h2 className="font-display text-base mb-3">{label}</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid stroke="#2B3A3A0D" vertical={false} />
                  <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: "#4C5C5C" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: "#4C5C5C" }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #2B3A3A1A", fontSize: 12 }}
                    labelStyle={{ color: "#2B3A3A" }}
                  />
                  <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
