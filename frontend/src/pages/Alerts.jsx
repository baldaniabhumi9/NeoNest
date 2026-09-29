import { useEffect, useState, useCallback } from "react";
import AppLayout from "../components/AppLayout";
import AlertBanner from "../components/AlertBanner";
import client from "../api/client";
import { useDevices } from "../context/DeviceContext";

const TABS = [
  { key: "all", label: "All" },
  { key: "unacknowledged", label: "Needs review" },
  { key: "acknowledged", label: "Acknowledged" }
];

export default function Alerts() {
  const { selectedId } = useDevices();
  const [tab, setTab] = useState("all");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const { data } = await client.get(`/alerts/${selectedId}?status=${tab}`);
      setAlerts(data.alerts);
    } finally {
      setLoading(false);
    }
  }, [selectedId, tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function acknowledge(alertId) {
    await client.patch(`/alerts/${selectedId}/${alertId}/acknowledge`);
    setAlerts((prev) => prev.map((a) => (a._id === alertId ? { ...a, acknowledged: true } : a)));
  }

  return (
    <AppLayout title="Alerts">
      <div className="flex gap-2 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pill border transition-colors ${
              tab === t.key ? "bg-sage text-white border-sage" : "bg-white border-black/10 text-ink-soft hover:border-sage"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-ink-soft/60">Loading alerts…</p>}
      {!loading && alerts.length === 0 && (
        <p className="text-sm text-ink-soft/60 text-center py-16">Nothing here — all quiet.</p>
      )}
      {!loading && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <AlertBanner key={a._id} alert={a} onAcknowledge={acknowledge} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
