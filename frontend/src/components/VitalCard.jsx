const STATUS_COLORS = {
  ok: "text-sage-dark",
  warning: "text-amber",
  critical: "text-brick"
};

export default function VitalCard({ icon: Icon, label, value, unit, status = "ok", subtext }) {
  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-soft">{label}</span>
        {Icon && <Icon size={18} className={STATUS_COLORS[status]} />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono text-3xl font-medium ${STATUS_COLORS[status]}`}>
          {value ?? "--"}
        </span>
        {unit && <span className="text-sm text-ink-soft/70">{unit}</span>}
      </div>
      {subtext && <p className="text-xs text-ink-soft/60">{subtext}</p>}
    </div>
  );
}
