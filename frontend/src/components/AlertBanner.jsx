import { AlertTriangle, Info, AlertOctagon, Check } from "lucide-react";

const SEVERITY = {
  info: { icon: Info, bg: "bg-sky/15", text: "text-ink", iconColor: "text-sky" },
  warning: { icon: AlertTriangle, bg: "bg-amber/15", text: "text-ink", iconColor: "text-amber" },
  critical: { icon: AlertOctagon, bg: "bg-brick/15", text: "text-ink", iconColor: "text-brick" }
};

export default function AlertBanner({ alert, onAcknowledge }) {
  const s = SEVERITY[alert.severity] || SEVERITY.info;
  const Icon = s.icon;
  const time = new Date(alert.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl ${s.bg}`}>
      <Icon size={18} className={`${s.iconColor} mt-0.5 shrink-0`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${s.text}`}>{alert.message}</p>
        <p className="text-xs text-ink-soft/70 mt-0.5">{time}</p>
      </div>
      {!alert.acknowledged && onAcknowledge && (
        <button
          onClick={() => onAcknowledge(alert._id)}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-sage-dark px-2.5 py-1 rounded-full border border-black/10 hover:border-sage transition-colors"
        >
          <Check size={13} /> Got it
        </button>
      )}
      {alert.acknowledged && <span className="shrink-0 text-xs text-ink-soft/50">Acknowledged</span>}
    </div>
  );
}
