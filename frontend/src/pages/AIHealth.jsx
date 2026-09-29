import { Sparkles, TrendingUp, TrendingDown, Minus, Moon } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { useDevices } from "../context/DeviceContext";
import useLiveVitals from "../hooks/useLiveVitals";

const LEVEL_COPY = {
  calm: { label: "Calm", color: "text-sage-dark", bg: "bg-sage/15" },
  attention: { label: "Worth a glance", color: "text-sky", bg: "bg-sky/20" },
  alert: { label: "Needs attention", color: "text-amber", bg: "bg-amber/20" },
  critical: { label: "Check on baby", color: "text-brick", bg: "bg-brick/20" }
};

const TREND_ICON = { rising: TrendingUp, falling: TrendingDown, stable: Minus };

export default function AIHealth() {
  const { selectedId } = useDevices();
  const { prediction, loading } = useLiveVitals(selectedId);

  const level = LEVEL_COPY[prediction?.riskLevel] || LEVEL_COPY.calm;

  return (
    <AppLayout title="AI Health">
      {loading && <p className="text-sm text-ink-soft/60">Analyzing recent vitals…</p>}

      {!loading && (
        <div className="space-y-6">
          <div className={`card p-6 flex flex-col sm:flex-row items-center gap-6 ${level.bg}`}>
            <div className="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center shrink-0">
              <span className="font-mono text-3xl font-medium text-ink">{prediction?.riskScore ?? "--"}</span>
              <span className="text-xs text-ink-soft/70">risk score</span>
            </div>
            <div>
              <p className={`pill ${level.bg} ${level.color} !px-0 !bg-transparent font-display text-lg`}>
                <Sparkles size={18} /> {level.label}
              </p>
              <p className="text-sm text-ink-soft mt-1 max-w-md">{prediction?.notes || "Gathering enough data to analyze patterns."}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {["heartRate", "spo2", "temperature"].map((vital) => {
              const trend = prediction?.trends?.[vital] || "stable";
              const Icon = TREND_ICON[trend];
              const labels = { heartRate: "Heart Rate", spo2: "SpO\u2082", temperature: "Temperature" };
              return (
                <div key={vital} className="card p-5">
                  <p className="text-sm text-ink-soft">{labels[vital]} trend</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Icon size={20} className={trend === "stable" ? "text-ink-soft" : trend === "falling" && vital !== "temperature" ? "text-amber" : "text-sage-dark"} />
                    <span className="font-medium capitalize">{trend}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card p-5">
            <h2 className="font-display text-lg mb-3">Statistical anomalies</h2>
            {(!prediction?.anomalies || prediction.anomalies.length === 0) && (
              <p className="text-sm text-ink-soft/70 py-4 text-center">
                No readings are deviating from this baby's recent baseline right now.
              </p>
            )}
            {prediction?.anomalies?.length > 0 && (
              <ul className="space-y-2">
                {prediction.anomalies.map((a, i) => (
                  <li key={i} className="text-sm bg-amber/10 rounded-lg px-3 py-2.5">
                    {a.description}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5 flex items-center gap-3">
            <Moon size={20} className="text-sky" />
            <div>
              <p className="text-sm text-ink-soft">Current sleep state</p>
              <p className="font-medium capitalize">{prediction?.sleepState?.replace("_", " ") || "Unknown"}</p>
            </div>
          </div>

          <p className="text-xs text-ink-soft/50 max-w-2xl">
            This score is produced by a transparent statistical model — clinical threshold ranges, a
            rolling baseline comparison unique to your baby, and trend detection — not a black-box
            prediction. It's a supportive signal, not a medical diagnosis.
          </p>
        </div>
      )}
    </AppLayout>
  );
}
