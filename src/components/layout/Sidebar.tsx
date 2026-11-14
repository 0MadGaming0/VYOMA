import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AlertTriangle, LayoutDashboard,
  SlidersHorizontal, Sparkles, X,
  type LucideIcon, Activity, Orbit, Rocket,
  PanelLeftClose, PanelLeft, Settings2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { mission } from '../../data/mockData';
import { cx } from '../../utils';

interface NavItem {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

// Primary navigation — 4 active modules
const navSections: NavSection[] = [
  {
    id: 'overview',
    title: 'OVERVIEW',
    items: [
      { to: '/', label: 'Dashboard', shortLabel: 'Overview', icon: LayoutDashboard, end: true },
    ],
  },
  {
    id: 'health',
    title: 'HEALTH MONITORING',
    items: [
      { to: '/vitalwatch', label: 'VitalWatch', icon: Activity },
      { to: '/healthsense', label: 'HealthSense AI', shortLabel: 'HealthSense', icon: Sparkles },
    ],
  },
  {
    id: 'safety',
    title: 'SAFETY',
    items: [
      { to: '/alerts', label: 'Alerts & Triage', shortLabel: 'Alerts', icon: AlertTriangle },
    ],
  },
];

// Settings section — rendered separately at the bottom of nav
const settingsSection: NavSection = {
  id: 'settings',
  title: 'SETTINGS',
  items: [
    { to: '/settings', label: 'Bio-Calibration', shortLabel: 'Settings', icon: SlidersHorizontal },
  ],
};

// Hidden modules — routes/code preserved, just not shown in sidebar
// { to: '/mindspace', label: 'MindSpace', icon: Brain },
// { to: '/astroassist', label: 'AstroAssist', icon: Bot },
// { to: '/spaceguard', label: 'SpaceGuard', icon: ShieldCheck },
// { to: '/missionsync', label: 'MissionSync', icon: RefreshCw },

/** Standalone logo symbol (SVG inline) */
function VyomaSymbol({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden className="shrink-0">
      {/* Orbital ring (partial) */}
      <circle
        cx="20" cy="20" r="15"
        stroke="#2A9D8F" strokeWidth="1.6"
        strokeDasharray="58 36" strokeLinecap="round"
        transform="rotate(-35 20 20)"
      />
      {/* V-frame / Chevron */}
      <path d="M8 12 L20 32 L32 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* ECG crossbar across V */}
      <path
        d="M11 20 L15 20 L17 16.5 L19 23 L21 17 L23 20 L29 20"
        stroke="#2A9D8F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, alerts, sidebarCollapsed, toggleSidebar } = useApp();
  const location = useLocation();
  const unack = alerts.filter((a) => !a.acknowledged).length;

  // Track expanded/collapsed states for section accordions (persisted or defaulted open)
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('vyoma_sidebar_sections');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      overview: true,
      health: true,
      safety: true,
      settings: false,
    };
  });

  const toggleSection = (id: string) => {
    setSectionOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('vyoma_sidebar_sections', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Auto-close mobile drawer on route change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'CM';

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-label="OrbitCare Station Navigation"
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-navy transition-all duration-200 ease-in-out',
          // Desktop collapsed vs expanded widths
          sidebarCollapsed ? 'lg:w-[70px]' : 'lg:w-[210px]',
          // Mobile responsive drawer behavior
          'w-[240px]',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{ boxShadow: '2px 0 16px rgba(22,50,79,0.18)' }}
      >
        {/* ── Brand Header ── */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-3 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <VyomaSymbol size={28} />
            <div className={cx('leading-none transition-opacity duration-150', sidebarCollapsed ? 'lg:hidden' : 'block')}>
              <span className="font-display text-sm font-bold tracking-[0.16em] text-white block">VYOMA</span>
              <span className="font-display text-[11px] font-semibold tracking-[0.22em] text-teal-soft block mt-0.5">SPACE HEALTH</span>
            </div>
          </div>

          {/* Desktop collapse toggle & mobile close */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden lg:grid h-7 w-7 place-items-center rounded text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              title={sidebarCollapsed ? 'Expand navigation (Ctrl+B)' : 'Collapse navigation'}
              aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded p-1 text-white/50 hover:bg-white/10 hover:text-white lg:hidden transition-colors"
              onClick={onClose}
              aria-label="Close navigation drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Hub Banner: OrbitCare ── */}
        <div className={cx(
          'border-b border-white/10 bg-white/[0.02]',
          sidebarCollapsed ? 'p-2 flex justify-center' : 'px-3 py-2'
        )}>
          <div className={cx(
            'flex items-center gap-2 rounded-md bg-teal/15 px-2 py-1.5 border border-teal/30 text-teal-soft',
            sidebarCollapsed ? 'justify-center w-full px-0' : 'justify-between'
          )}>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Orbit className="h-4 w-4 shrink-0 text-teal-soft animate-spin" style={{ animationDuration: '24s' }} />
              <span className={cx(
                'text-[11px] font-bold tracking-wider uppercase text-white',
                sidebarCollapsed ? 'lg:hidden' : 'inline'
              )}>
                OrbitCare
              </span>
            </div>
            {unack > 0 && (
              <span
                className="grid h-4 min-w-4 place-items-center rounded-full bg-crit px-1 text-[11px] font-bold text-white leading-none shrink-0"
                title={`${unack} active alerts`}
              >
                {unack}
              </span>
            )}
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav
          className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
          aria-label="VYOMA Primary Navigation"
        >
          {/* Primary sections */}
          {navSections.map((section) => {
            const hasActiveChild = section.items.some((item) =>
              item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
            );

            return (
              <div key={section.id} className="space-y-0.5">
                {/* Section Label */}
                <div className={cx('px-2 pb-1', sidebarCollapsed ? 'lg:hidden' : 'block')}>
                  <span
                    className={cx(
                      'text-[11px] font-bold tracking-[0.18em] uppercase',
                      hasActiveChild ? 'text-teal-soft' : 'text-white/35'
                    )}
                  >
                    {section.title}
                  </span>
                </div>

                {/* Section Items */}
                <ul className="space-y-0.5" role="menu">
                  {section.items.map(({ to, label, icon: Icon, end }) => {
                    const isAlertsRoute = to === '/alerts';
                    return (
                      <li key={to} role="none" className="relative group">
                        <NavLink
                          to={to}
                          end={end}
                          role="menuitem"
                          className={({ isActive }) =>
                            cx(
                              'flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-teal',
                              sidebarCollapsed
                                ? 'justify-center p-2.5 lg:w-full'
                                : 'px-2.5 py-2 w-full',
                              isActive
                                ? 'bg-teal text-white font-semibold shadow-sm'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon
                                className={cx(
                                  'h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-105',
                                  isActive ? 'text-white' : 'text-teal-soft/85'
                                )}
                                aria-hidden
                              />

                              <span className={cx('truncate', sidebarCollapsed ? 'lg:hidden' : 'inline')}>
                                {label}
                              </span>

                              {/* Alert badge on expanded sidebar */}
                              {isAlertsRoute && unack > 0 && (
                                <span
                                  className={cx(
                                    'ml-auto grid h-4 min-w-4 place-items-center rounded-full px-1 text-[11px] font-bold shrink-0',
                                    sidebarCollapsed ? 'lg:hidden' : 'inline-grid',
                                    isActive ? 'bg-white text-navy' : 'bg-crit text-white'
                                  )}
                                >
                                  {unack}
                                </span>
                              )}

                              {/* Alert dot on collapsed sidebar */}
                              {isAlertsRoute && unack > 0 && sidebarCollapsed && (
                                <span
                                  className="hidden lg:block absolute top-1.5 right-2 h-2 w-2 rounded-full bg-crit border border-navy"
                                  aria-label={`${unack} active alerts`}
                                />
                              )}
                            </>
                          )}
                        </NavLink>

                        {/* Collapsed Mode Tooltip */}
                        {sidebarCollapsed && (
                          <div
                            role="tooltip"
                            className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 hidden lg:group-hover:flex lg:group-focus-within:flex flex-col rounded-md bg-navy-dark px-2.5 py-1.5 text-xs text-white shadow-xl border border-white/15 whitespace-nowrap animate-slideIn"
                          >
                            <span className="font-semibold text-teal-soft text-[11px] uppercase tracking-wider">
                              {section.title}
                            </span>
                            <span className="font-medium text-white flex items-center gap-1.5">
                              {label}
                              {isAlertsRoute && unack > 0 && (
                                <span className="bg-crit text-white text-[11px] px-1 rounded-full font-bold">
                                  {unack}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* Divider before Settings */}
          <div className={cx('border-t border-white/10 pt-3', sidebarCollapsed ? 'mx-1' : 'mx-0')}>
            {/* Settings section label */}
            <div className={cx('px-2 pb-1', sidebarCollapsed ? 'lg:hidden' : 'block')}>
              <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-white/30 flex items-center gap-1">
                <Settings2 className="h-2.5 w-2.5" aria-hidden />
                SETTINGS
              </span>
            </div>

            {/* Settings items */}
            <ul className="space-y-0.5" role="menu">
              {settingsSection.items.map(({ to, label, icon: Icon }) => (
                <li key={to} role="none" className="relative group">
                  <NavLink
                    to={to}
                    role="menuitem"
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-teal',
                        sidebarCollapsed
                          ? 'justify-center p-2.5 lg:w-full'
                          : 'px-2.5 py-2 w-full',
                        isActive
                          ? 'bg-teal text-white font-semibold shadow-sm'
                          : 'text-white/50 hover:text-white hover:bg-white/10'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cx(
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-white' : 'text-teal-soft/60'
                          )}
                          aria-hidden
                        />
                        <span className={cx('truncate', sidebarCollapsed ? 'lg:hidden' : 'inline')}>
                          {label}
                        </span>
                      </>
                    )}
                  </NavLink>

                  {/* Collapsed tooltip */}
                  {sidebarCollapsed && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 hidden lg:group-hover:flex lg:group-focus-within:flex flex-col rounded-md bg-navy-dark px-2.5 py-1.5 text-xs text-white shadow-xl border border-white/15 whitespace-nowrap"
                    >
                      <span className="font-semibold text-teal-soft text-[11px] uppercase tracking-wider">Settings</span>
                      <span className="font-medium text-white">{label}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* ── Footer: Mission Status & Profile ── */}
        <div className="border-t border-white/10 p-2.5 space-y-2 shrink-0 bg-navy-dark/40">
          {/* Mission Capsule */}
          <div
            className={cx(
              'rounded-md bg-white/[0.04] border border-white/8 transition-all',
              sidebarCollapsed ? 'p-1.5 flex justify-center' : 'p-2'
            )}
            title={`Mission: ${mission.id} (${mission.phase})`}
          >
            {sidebarCollapsed ? (
              <div className="hidden lg:grid h-7 w-7 place-items-center text-teal-soft" title={`${mission.id} Active`}>
                <Rocket className="h-3.5 w-3.5" />
              </div>
            ) : null}

            <div className={cx(sidebarCollapsed ? 'lg:hidden' : 'block')}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/45 uppercase tracking-wider flex items-center gap-1 font-semibold">
                  <Rocket className="h-2.5 w-2.5 text-teal" /> {mission.id}
                </span>
                <span className="flex items-center gap-1 text-teal-soft font-medium text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulseDot" /> Active
                </span>
              </div>
              <p className="text-[11px] text-white/60 truncate mt-0.5">{mission.phase}</p>
            </div>
          </div>

          {/* User Profile */}
          <div
            className={cx(
              'flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-white/5',
              sidebarCollapsed ? 'justify-center' : 'justify-start'
            )}
            title={`${profile.name} (${profile.role})`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal/20 border border-teal/40 font-display text-[11px] font-bold text-teal-soft">
              {initials}
            </span>
            <div className={cx('min-w-0 flex-1', sidebarCollapsed ? 'lg:hidden' : 'block')}>
              <p className="truncate text-xs font-semibold text-white leading-tight">{profile.name}</p>
              <p className="truncate text-[11px] text-white/50">{profile.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}