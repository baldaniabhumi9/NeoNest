const LEVEL_STYLES = {
  calm: { ring: "#8FA88E", label: "All vitals steady", bg: "bg-sage/10" },
  attention: { ring: "#A9C4D1", label: "Worth a glance", bg: "bg-sky/15" },
  alert: { ring: "#E8A34D", label: "Needs attention", bg: "bg-amber/15" },
  critical: { ring: "#D1685A", label: "Check on baby now", bg: "bg-brick/15" }
};

/**
 * A calm status card whose glow gently pulses in sync with the baby's
 * actual live heart rate — the interface's one "signature" moment.
 */
export default function StatusRing({ babyName, riskLevel = "calm", heartRate, statusText }) {
  const style = LEVEL_STYLES[riskLevel] || LEVEL_STYLES.calm;
  const bpm = heartRate && heartRate > 0 ? heartRate : 120;
  const pulseSeconds = (60 / bpm).toFixed(3);

  return (
    <div className={`card relative p-8 sm:p-10 flex flex-col items-center text-center overflow-hidden ${style.bg}`}>
      <div
        className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center relative animate-breathe"
        style={{
          background: `radial-gradient(circle, white 55%, ${style.ring}22 100%)`,
          boxShadow: `0 0 0 0 ${style.ring}59`,
          animation: `ringPulse ${pulseSeconds}s ease-in-out infinite`
        }}
      >
        <style>{`
          @keyframes ringPulse {
            0%, 100% { box-shadow: 0 0 0 0 ${style.ring}55; }
            50% { box-shadow: 0 0 0 16px ${style.ring}00; }
          }
        `}</style>
        <div className="text-center">
          <p className="font-mono text-3xl sm:text-4xl font-medium text-ink">{heartRate ?? "--"}</p>
          <p className="text-xs text-ink-soft/70 -mt-1">bpm</p>
        </div>
      </div>

      <p className="mt-6 font-display text-xl text-ink">{babyName}</p>
      <p className="text-sm text-ink-soft mt-1">{statusText || style.label}</p>
    </div>
  );
}
