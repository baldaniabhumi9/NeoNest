import { Routes, Route } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";
import { DeviceProvider } from "./context/DeviceContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import LiveMonitoring from "./pages/LiveMonitoring";
import AIHealth from "./pages/AIHealth";
import Alerts from "./pages/Alerts";
import Trends from "./pages/Trends";
import Sleep from "./pages/Sleep";
import History from "./pages/History";
import Reports from "./pages/Reports";
import Device from "./pages/Device";
import Settings from "./pages/Settings";

function Authenticated({ children }) {
  return (
    <ProtectedRoute>
      <SocketProvider>
        <DeviceProvider>{children}</DeviceProvider>
      </SocketProvider>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/" element={<Authenticated><Dashboard /></Authenticated>} />
      <Route path="/live" element={<Authenticated><LiveMonitoring /></Authenticated>} />
      <Route path="/ai-health" element={<Authenticated><AIHealth /></Authenticated>} />
      <Route path="/alerts" element={<Authenticated><Alerts /></Authenticated>} />
      <Route path="/trends" element={<Authenticated><Trends /></Authenticated>} />
      <Route path="/sleep" element={<Authenticated><Sleep /></Authenticated>} />
      <Route path="/history" element={<Authenticated><History /></Authenticated>} />
      <Route path="/reports" element={<Authenticated><Reports /></Authenticated>} />
      <Route path="/device" element={<Authenticated><Device /></Authenticated>} />
      <Route path="/settings" element={<Authenticated><Settings /></Authenticated>} />
    </Routes>
  );
}
