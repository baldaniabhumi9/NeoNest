import { useState } from "react";
import AppLayout from "../components/AppLayout";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    notificationPrefs: user?.notificationPrefs || { email: true, sms: false, push: true, criticalOnly: false }
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await client.patch("/auth/me", form);
      setUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key) {
    setForm((f) => ({ ...f, notificationPrefs: { ...f.notificationPrefs, [key]: !f.notificationPrefs[key] } }));
  }

  return (
    <AppLayout title="Settings">
      <div className="max-w-xl space-y-6">
        <form onSubmit={save} className="card p-5 space-y-4">
          <h2 className="font-display text-lg">Your profile</h2>
          <div>
            <label className="text-sm font-medium text-ink-soft">Name</label>
            <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-soft">Email</label>
            <input className="input mt-1 bg-cloudDim/60" value={user?.email || ""} disabled />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-soft">Phone</label>
            <input className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="For SMS alerts" />
          </div>

          <div className="pt-2 border-t border-black/5">
            <h3 className="font-medium text-sm mb-3">Notifications</h3>
            <div className="space-y-2.5">
              {[
                { key: "email", label: "Email alerts" },
                { key: "sms", label: "SMS alerts" },
                { key: "push", label: "Push notifications" },
                { key: "criticalOnly", label: "Only notify me for critical alerts" }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.notificationPrefs[key]}
                    onChange={() => toggle(key)}
                    className="w-4 h-4 accent-sage-dark rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button disabled={saving} className="btn-primary text-sm">
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <div className="card p-5">
          <h2 className="font-display text-lg mb-1">About NeoVitals</h2>
          <p className="text-sm text-ink-soft">
            NeoVitals monitors heart rate, oxygen saturation, temperature, and motion via a wearable
            shoe. AI insights are statistical estimates meant to support, not replace, clinical
            judgment — always consult a pediatrician for medical concerns.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
