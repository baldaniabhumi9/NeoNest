import { useEffect, useState, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Moon, Sun, Waves } from "lucide-react";
import AppLayout from "../components/AppLayout";
import client from "../api/client";
import { useDevices } from "../context/DeviceContext";

const STATE_META = {
  awake: { label: "Awake", color: "#E8A34D", icon: Sun },
  active_sleep: { label: "Active sleep", color: "#A9C4D1", icon: Waves },
  quiet_sleep: { label: "Quiet sleep", color: "#8FA88E", icon: Moon },
  unknown: { label: "Unknown", color: "#4C5C5C", icon: Moon }
};

export default function Sleep() {
  const { selectedId } = useDevices();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const { data } = await client.get(`/ai/${selectedId}/history?limit=200`);
      setPredictions(data.predictions);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const current = predictions.at(-1);
  const currentMeta = STATE_META[current?.sleepState] || STATE_META.unknown;
  const CurrentIcon = currentMeta.icon;

  const tally = predictions.reduce((acc, p) => {
    acc[p.sleepState] = (acc[p.sleepState] || 0) + 1;
    return acc;
  }, {});

  const chartData = predictions.map((p) => ({
    label: new Date(p.generatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    motion: p.sleepState === "awake" ? 80 : p.sleepState === "active_sleep" ? 35 : 10
  }));

  return (
    <AppLayout title="Sleep">
      {loading && <p className="text-sm text-ink-soft/60">Loading sleep data…</p>}

      {!loading && predictions.length === 0 && (
        <p className="text-sm text-ink-soft/60 text-center py-16">
          Not enough readings yet to infer a sleep pattern.
        </p>
      )}

      {!loading && predictions.length > 0 && (
        <div className="space-y-6">
          <div className="card p-6 flex items-center gap-4" style={{ background: `${currentMeta.color}18` }}>
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shrink-0">
              <CurrentIcon size={22} style={{ color: currentMeta.color }} />
            </div>
            <div>
              <p className="text-sm text-ink-soft">Current state</p>
              <p className="font-display text-xl text-ink">{currentMeta.label}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(STATE_META).filter(([k]) => k !== "unknown").map(([key, meta]) => {
              const Icon = meta.icon;
              const pct = predictions.length ? Math.round(((tally[key] || 0) / predictions.length) * 100) : 0;
              return (
                <div key={key} className="card p-5">
                  <div className="flex items-center gap-2 text-sm text-ink-soft">
                    <Icon size={16} style={{ color: meta.color }} />
                    {meta.label}
                  </div>
                  <p className="font-mono text-2xl mt-2" style={{ color: meta.color }}>{pct}%</p>
                  <p className="text-xs text-ink-soft/60">of recent readings</p>
                </div>
              );
            })}
          </div>

          <div className="card p-5">
            <h2 className="font-display text-base mb-3">Activity pattern</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid stroke="#2B3A3A0D" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#4C5C5C" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#4C5C5C" }} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #2B3A3A1A", fontSize: 12 }} />
                <Area type="monotone" dataKey="motion" stroke="#8FA88E" fill="#8FA88E33" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-ink-soft/50 max-w-2xl">
            Sleep state is inferred from motion and heart-rate variability patterns, a well-established
            heuristic — not a clinical polysomnography-grade measurement.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
