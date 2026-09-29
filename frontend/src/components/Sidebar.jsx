import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Sparkles,
  BellRing,
  TrendingUp,
  Moon,
  History,
  FileText,
  Cpu,
  Settings as SettingsIcon,
  Feather
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/live", label: "Live Monitoring", icon: Activity },
  { to: "/ai-health", label: "AI Health", icon: Sparkles },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/trends", label: "Trends", icon: TrendingUp },
  { to: "/sleep", label: "Sleep", icon: Moon },
  { to: "/history", label: "History", icon: History },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/device", label: "Device", icon: Cpu },
  { to: "/settings", label: "Settings", icon: SettingsIcon }
];

export default function Sidebar({ open, onClose }) {
  const { logout, user } = useAuth();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-ink/20 backdrop-blur-[2px} z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:sticky top-0 h-screen w-72 bg-white/80 backdrop-blur-md border-r border-black/5 z-40
        flex flex-col transition-transform duration-300 lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center gap-2.5 px-6 pt-7 pb-5">
          <div className="w-9 h-9 rounded-full bg-sage flex items-center justify-center">
            <Feather size={17} className="text-white" />
          </div>
          <div>
            <p className="font-display text-lg leading-none text-ink">NeoVitals</p>
            <p className="text-xs text-ink-soft/70 mt-0.5">gentle, continuous care</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${isActive ? "bg-sage/15 text-sage-dark" : "text-ink-soft hover:bg-cloudDim"}`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-black/5">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-sky/60 flex items-center justify-center text-sm font-semibold text-ink">
              {user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-ink-soft/70 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="mt-2 w-full text-left text-sm text-ink-soft hover:text-brick px-2 py-1.5 rounded-lg transition-colors">
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
