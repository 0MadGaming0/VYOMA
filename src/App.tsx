import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Alerts from './pages/Alerts';
import AstroAssist from './pages/AstroAssist';
import Dashboard from './pages/Dashboard';
import HealthSense from './pages/HealthSense';
import Login from './pages/Login';
import MindSpace from './pages/MindSpace';
import MissionSync from './pages/MissionSync';
import Settings from './pages/Settings';
import SpaceGuard from './pages/SpaceGuard';
import VitalWatch from './pages/VitalWatch';
import { useApp } from './context/AppContext';

function ProtectedLayout() {
  const { isAuthenticated, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-offwhite">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted font-display tracking-widest uppercase">Connecting to OrbitCare...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="vitalwatch" element={<VitalWatch />} />
        <Route path="mindspace" element={<MindSpace />} />
        <Route path="healthsense" element={<HealthSense />} />
        <Route path="spaceguard" element={<SpaceGuard />} />
        <Route path="astroassist" element={<AstroAssist />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="missionsync" element={<MissionSync />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
