import { Menu, Wifi, WifiOff } from "lucide-react";
import { useDevices } from "../context/DeviceContext";
import { useSocket } from "../context/SocketContext";

export default function Topbar({ onMenuClick, title }) {
  const { devices, selectedId, setSelectedId, selectedDevice } = useDevices();
  const { connected } = useSocket();

  return (
    <header className="sticky top-0 z-20 bg-cloud/80 backdrop-blur-md border-b border-black/5">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-cloudDim" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <h1 className="font-display text-xl sm:text-2xl text-ink truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {devices.length > 0 && (
            <select
              value={selectedId || ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="hidden sm:block text-sm bg-white border border-black/10 rounded-full pl-3.5 pr-8 py-1.5 focus:border-sage outline-none"
            >
              {devices.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.baby?.name || d.name}
                </option>
              ))}
            </select>
          )}
          <div className={`pill ${connected ? "bg-sage/15 text-sage-dark" : "bg-black/5 text-ink-soft"}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="hidden sm:inline">{connected ? "Live" : "Offline"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
