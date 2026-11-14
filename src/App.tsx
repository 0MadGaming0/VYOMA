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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
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
