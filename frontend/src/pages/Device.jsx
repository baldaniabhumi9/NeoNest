import { useState } from "react";
import { Cpu, Plus, Copy, RefreshCw, Trash2, Check } from "lucide-react";
import AppLayout from "../components/AppLayout";
import client from "../api/client";
import { useDevices } from "../context/DeviceContext";

export default function Device() {
  const { devices, refresh, selectedId, setSelectedId } = useDevices();
  const [showForm, setShowForm] = useState(devices.length === 0);
  const [form, setForm] = useState({ deviceId: "", babyName: "" });
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = devices.find((d) => d._id === selectedId);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { data } = await client.post("/devices", {
        deviceId: form.deviceId,
        baby: { name: form.babyName || "Baby" }
      });
      setNewKey(data.deviceKey);
      await refresh();
      setSelectedId(data.device._id);
      setForm({ deviceId: "", babyName: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't register that device.");
    } finally {
      setSaving(false);
    }
  }

  async function handleThresholdSave(thresholds) {
    await client.patch(`/devices/${selected._id}`, { thresholds });
    await refresh();
  }

  async function handleRegenerate() {
    const { data } = await client.post(`/devices/${selected._id}/regenerate-key`);
    setNewKey(data.deviceKey);
  }

  async function handleDelete() {
    if (!confirm("Remove this device? Its history will remain but it will stop tracking.")) return;
    await client.delete(`/devices/${selected._id}`);
    await refresh();
  }

  function copyKey() {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <AppLayout title="Device">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-display text-lg">Your devices</h2>
          {devices.map((d) => (
            <button
              key={d._id}
              onClick={() => setSelectedId(d._id)}
              className={`w-full text-left card p-4 flex items-center gap-3 transition-colors ${
                selectedId === d._id ? "ring-2 ring-sage" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-sage/15 flex items-center justify-center shrink-0">
                <Cpu size={17} className="text-sage-dark" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{d.baby?.name || d.name}</p>
                <p className="text-xs text-ink-soft/60 truncate">{d.deviceId} · {d.status}</p>
              </div>
            </button>
          ))}
          <button onClick={() => { setShowForm(true); setNewKey(null); }} className="btn-secondary w-full flex items-center justify-center gap-1.5 text-sm">
            <Plus size={16} /> Add a device
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {showForm && (
            <form onSubmit={handleRegister} className="card p-5 space-y-4">
              <h2 className="font-display text-lg">Pair a new shoe</h2>
              <p className="text-sm text-ink-soft">
                Enter the hardware ID printed on your ESP32 board (or set in the firmware). We'll generate a
                secret device key — copy it into your Arduino sketch's config.
              </p>
              {error && <p className="text-sm text-brick bg-brick/10 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className="text-sm font-medium text-ink-soft">Device ID</label>
                <input required className="input mt-1" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} placeholder="e.g. neovitals-esp32-01" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink-soft">Baby's name</label>
                <input className="input mt-1" value={form.babyName} onChange={(e) => setForm({ ...form, babyName: e.target.value })} placeholder="e.g. Mira" />
              </div>
              <button disabled={saving} className="btn-primary">{saving ? "Pairing…" : "Pair device"}</button>
            </form>
          )}

          {newKey && (
            <div className="card p-5 bg-amber/10 space-y-3">
              <h2 className="font-display text-base">Device key (shown once)</h2>
              <p className="text-sm text-ink-soft">
                Paste this into your firmware's config (e.g. as <code className="font-mono text-xs">DEVICE_KEY</code>). It won't be shown again — regenerate it below if you lose it.
              </p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs bg-white px-3 py-2 rounded-lg flex-1 overflow-x-auto">{newKey}</code>
                <button onClick={copyKey} className="btn-secondary !px-3 !py-2 text-sm flex items-center gap-1">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {selected && (
            <>
              <div className="card p-5 space-y-4">
                <h2 className="font-display text-lg">Baby profile</h2>
                <BabyProfileForm device={selected} onSave={refresh} />
              </div>

              <div className="card p-5 space-y-4">
                <h2 className="font-display text-lg">Alert thresholds</h2>
                <ThresholdForm thresholds={selected.thresholds} onSave={handleThresholdSave} />
              </div>

              <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Device security</p>
                  <p className="text-sm text-ink-soft/70">Rotate the device key if you suspect it was exposed.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleRegenerate} className="btn-secondary text-sm flex items-center gap-1.5">
                    <RefreshCw size={14} /> Regenerate key
                  </button>
                  <button onClick={handleDelete} className="text-sm text-brick flex items-center gap-1.5 px-3 py-2.5 rounded-full hover:bg-brick/10">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function BabyProfileForm({ device, onSave }) {
  const [baby, setBaby] = useState({
    name: device.baby?.name || "",
    dob: device.baby?.dob ? device.baby.dob.slice(0, 10) : "",
    weightGrams: device.baby?.weightGrams || "",
    gestationalAgeWeeks: device.baby?.gestationalAgeWeeks || ""
  });
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    await client.patch(`/devices/${device._id}`, { baby });
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium text-ink-soft">Name</label>
        <input className="input mt-1" value={baby.name} onChange={(e) => setBaby({ ...baby, name: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink-soft">Date of birth</label>
        <input type="date" className="input mt-1" value={baby.dob} onChange={(e) => setBaby({ ...baby, dob: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink-soft">Weight (grams)</label>
        <input type="number" className="input mt-1" value={baby.weightGrams} onChange={(e) => setBaby({ ...baby, weightGrams: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink-soft">Gestational age (weeks)</label>
        <input type="number" className="input mt-1" value={baby.gestationalAgeWeeks} onChange={(e) => setBaby({ ...baby, gestationalAgeWeeks: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <button className="btn-primary text-sm">{saved ? "Saved ✓" : "Save profile"}</button>
      </div>
    </form>
  );
}

function ThresholdForm({ thresholds, onSave }) {
  const [t, setT] = useState(thresholds);
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    await onSave(t);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const fields = [
    { key: "heartRateLow", label: "Heart rate low (bpm)" },
    { key: "heartRateHigh", label: "Heart rate high (bpm)" },
    { key: "spo2Low", label: "SpO\u2082 low (%)" },
    { key: "temperatureLow", label: "Temperature low (\u00b0C)", step: "0.1" },
    { key: "temperatureHigh", label: "Temperature high (\u00b0C)", step: "0.1" }
  ];

  return (
    <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(({ key, label, step }) => (
        <div key={key}>
          <label className="text-sm font-medium text-ink-soft">{label}</label>
          <input
            type="number"
            step={step || "1"}
            className="input mt-1"
            value={t[key]}
            onChange={(e) => setT({ ...t, [key]: Number(e.target.value) })}
          />
        </div>
      ))}
      <div className="sm:col-span-2">
        <button className="btn-primary text-sm">{saved ? "Saved ✓" : "Save thresholds"}</button>
      </div>
    </form>
  );
}
