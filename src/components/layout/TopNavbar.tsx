import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Bell, Menu, LogOut, SlidersHorizontal, RefreshCw, UserCheck, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { mission } from '../../data/mockData';
import { elapsed, fmtClock } from '../../utils';
import OfflineIndicator from '../common/OfflineIndicator';
import NotificationPanel from './NotificationPanel';

const titles: Record<string, string> = {
  '/':             'Dashboard',
  '/vitalwatch':   'VitalWatch',
  '/mindspace':    'MindSpace',
  '/healthsense':  'HealthSense AI',
  '/spaceguard':   'SpaceGuard',
  '/astroassist':  'AstroAssist',
  '/alerts':       'Alerts & Triage',
  '/missionsync':  'MissionSync',
  '/settings':     'Bio-Calibration',
};

export default function TopNavbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const {
    alerts,
    profile,
    settings,
    logout,
    isAuthenticated,
    astronauts,
    selectedAstronaut,
    setSelectedAstronaut,
    apiConnected,
    dbConnected,
  } = useApp();
  const [tick, setTick] = useState(0);
  const [panel, setPanel] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setPanel(false);
    setProfileOpen(false);
  }, [pathname]);

  const unack = alerts.filter((a) => !a.acknowledged).length;
  const now = new Date();
  void tick;

  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'CM';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/95 backdrop-blur-md px-3.5 py-2.5 sm:px-6"
      style={{ boxShadow: '0 1px 2px rgba(22,50,79,0.04)' }}
    >
      {/* Mobile drawer trigger */}
      <button
        className="rounded-md p-1.5 text-muted hover:bg-offwhite hover:text-ink lg:hidden transition-colors"
        onClick={onMenu}
        aria-label="Open OrbitCare menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb / Page Title */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs font-bold text-teal hidden sm:inline">OrbitCare</span>
          <span className="text-muted/40 text-xs hidden sm:inline">/</span>
          <h1 className="font-display text-sm font-semibold text-ink sm:text-base truncate">
            {titles[pathname] ?? 'VYOMA'}
          </h1>
        </div>
        <p className="num hidden text-[11px] text-muted sm:block">
          {mission.id} · MET {elapsed(mission.startISO)}
        </p>
      </div>

      {/* Right-aligned Command Tools */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Backend Status Badge */}
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            apiConnected
              ? dbConnected
                ? 'bg-teal/10 text-teal-dark border-teal/30'
                : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
          }`}
          title={
            apiConnected
              ? dbConnected
                ? 'Backend & PostgreSQL 18 fully connected'
                : 'FastAPI connected'
              : 'Backend not reachable - showing local station cache'
          }
        >
          <span className={`h-1.5 w-1.5 rounded-full ${apiConnected ? 'bg-teal animate-pulse' : 'bg-amber-500'}`} />
          {apiConnected ? (dbConnected ? 'PostgreSQL Live' : 'API Live') : 'Station Cache'}
        </span>

        {/* Astronaut Selector */}
        {astronauts.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 bg-offwhite border border-line rounded-lg px-2.5 py-1 text-xs shadow-xs">
            <span className="text-muted font-medium text-[11px]">Astronaut:</span>
            <select
              aria-label="Active Astronaut Telemetry Profile"
              className="bg-transparent font-bold text-ink text-xs focus:outline-none cursor-pointer"
              value={selectedAstronaut?.id ?? ''}
              onChange={(e) => {
                const astro = astronauts.find((a) => a.id === Number(e.target.value));
                if (astro) setSelectedAstronaut(astro);
              }}
            >
              {astronauts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.astronaut_code} · {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Real-time Chronometer */}
        <div className="hidden text-right md:block">
          <p className="num text-xs font-semibold text-ink leading-tight">
            {fmtClock(now, settings.hour12)}
          </p>
          <p className="text-[11px] text-muted">
            {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>

        <OfflineIndicator />

        {/* Alerts Notification Bell */}
        <div className="relative">
          <button
            className="relative rounded-lg border border-line p-2 text-muted hover:bg-offwhite hover:text-ink hover:border-border-strong transition-all"
            onClick={() => {
              setPanel((v) => !v);
              setProfileOpen(false);
            }}
            aria-label={`Mission notifications, ${unack} unacknowledged`}
            aria-expanded={panel}
          >
            <Bell className="h-4 w-4" />
            {unack > 0 && (
              <span className="num absolute -right-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-crit px-1 text-[11px] font-bold text-white shadow-sm">
                {unack}
              </span>
            )}
          </button>
          {panel && <NotificationPanel onClose={() => setPanel(false)} />}
        </div>

        {/* User Account / Profile Interactive Menu */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((v) => !v);
              setPanel(false);
            }}
            aria-expanded={profileOpen}
            aria-label="User account and profile menu"
            className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 hover:bg-offwhite hover:border-border-strong transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-navy/10 text-[11px] font-bold text-navy font-display shrink-0">
              {initials}
            </span>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-semibold text-ink block leading-tight">{profile.name}</span>
              <span className="text-[11px] text-muted block leading-none">{profile.id}</span>
            </div>
          </button>

          {/* Interactive Profile Dropdown Menu */}
          {profileOpen && (
            <div
              className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-line bg-white p-3 shadow-card-lg animate-fadeUp"
              role="menu"
              style={{ boxShadow: '0 8px 30px rgba(22,50,79,0.12)' }}
            >
              {/* Profile Header Details */}
              <div className="pb-3 border-b border-line px-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-navy text-white text-xs font-bold font-display">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">{profile.name}</p>
                    <p className="text-[11px] text-muted truncate">{profile.role}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] bg-offwhite px-2 py-1 rounded border border-line">
                  <span className="text-muted">Station Call Sign:</span>
                  <span className="num font-semibold text-ink">{profile.id}</span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-2 space-y-1 text-xs">
                <Link
                  to="/settings"
                  role="menuitem"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-body hover:bg-offwhite hover:text-ink transition-colors"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-teal" />
                  <span>Bio-Calibration &amp; Profile</span>
                </Link>
                <Link
                  to="/missionsync"
                  role="menuitem"
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-body hover:bg-offwhite hover:text-ink transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-teal" />
                  <span>Telemetry Uplink Status</span>
                </Link>
                <div className="px-2.5 py-1 text-[11px] text-muted flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-teal" />
                  <span>Session: {isAuthenticated ? 'Authenticated' : 'Offline Station Mode'}</span>
                </div>
              </div>

              {/* Sign Out Action */}
              <div className="pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={handleLogout}
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-crit hover:bg-crit/[0.06] transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out of Station</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
