import { Heart, Droplets, Thermometer, Footprints, Battery, ShieldCheck } from "lucide-react";
import AppLayout from "../components/AppLayout";
import StatusRing from "../components/StatusRing";
import VitalCard from "../components/VitalCard";
import AlertBanner from "../components/AlertBanner";
import { useDevices } from "../context/DeviceContext";
import useLiveVitals from "../hooks/useLiveVitals";
import { heartRateStatus, spo2Status, temperatureStatus } from "../utils/vitalStatus";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { selectedDevice, selectedId, devices, loading: devicesLoading } = useDevices();
  const { latest, prediction, alerts, loading } = useLiveVitals(selectedId);

  if (!devicesLoading && devices.length === 0) {
    return (
      <AppLayout title="Dashboard">
        <EmptyState />
      </AppLayout>
    );
  }

  const thresholds = selectedDevice?.thresholds || {
    heartRateLow: 100,
    heartRateHigh: 180,
    spo2Low: 90,
    temperatureLow: 36,
    temperatureHigh: 37.8
  };

  return (
    <AppLayout title="Dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <StatusRing
            babyName={selectedDevice?.baby?.name || "Baby"}
            riskLevel={prediction?.riskLevel || "calm"}
            heartRate={latest?.heartRate}
            statusText={prediction?.notes}
          />
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <VitalCard
            icon={Heart}
            label="Heart Rate"
            value={latest?.heartRate}
            unit="bpm"
            status={heartRateStatus(latest?.heartRate, thresholds)}
            subtext={`Normal range ${thresholds.heartRateLow}\u2013${thresholds.heartRateHigh}`}
          />
          <VitalCard
            icon={Droplets}
            label="Oxygen (SpO\u2082)"
            value={latest?.spo2}
            unit="%"
            status={spo2Status(latest?.spo2, thresholds)}
            subtext={`Above ${thresholds.spo2Low}% expected`}
          />
          <VitalCard
            icon={Thermometer}
            label="Temperature"
            value={latest?.temperature}
            unit="\u00b0C"
            status={temperatureStatus(latest?.temperature, thresholds)}
            subtext={`Normal range ${thresholds.temperatureLow}\u2013${thresholds.temperatureHigh}`}
          />
          <VitalCard
            icon={Footprints}
            label="Motion"
            value={latest?.motion}
            unit="/100"
            status="ok"
            subtext={latest?.skinContact === false ? "Check shoe fit" : "Good contact"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg">Recent alerts</h2>
            <Link to="/alerts" className="text-sm text-sage-dark hover:underline">View all</Link>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-ink-soft/70 py-6 text-center">No alerts yet — everything's calm.</p>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 4).map((a) => (
                <AlertBanner key={a._id} alert={a} />
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 flex flex-col gap-3">
          <h2 className="font-display text-lg">Device</h2>
          <div className="flex items-center gap-2 text-sm">
            <Battery size={16} className="text-ink-soft" />
            <span>{selectedDevice?.battery != null ? `${selectedDevice.battery}%` : "Unknown"} battery</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck size={16} className={selectedDevice?.status === "online" ? "text-sage-dark" : "text-ink-soft"} />
            <span className="capitalize">{selectedDevice?.status?.replace("_", " ") || "Unknown"}</span>
          </div>
          <Link to="/device" className="btn-secondary text-center text-sm mt-1">Manage device</Link>
        </div>
      </div>

      {!loading && !latest && (
        <p className="text-sm text-ink-soft/60 mt-6 text-center">
          Waiting for the shoe's first reading — once it connects, vitals will appear here.
        </p>
      )}
    </AppLayout>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="w-16 h-16 rounded-full bg-sage/15 flex items-center justify-center mb-4">
        <Heart className="text-sage-dark" />
      </div>
      <h2 className="font-display text-2xl text-ink">No device yet</h2>
      <p className="text-sm text-ink-soft mt-2 max-w-sm">
        Pair your baby's NeoVitals shoe to start seeing live vitals, trends, and gentle alerts here.
      </p>
      <Link to="/device" className="btn-primary mt-5">Add your first device</Link>
    </div>
  );
}
