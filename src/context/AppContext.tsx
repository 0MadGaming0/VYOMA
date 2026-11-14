import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Alert, Astronaut, BackendAlert, Baselines, FlightNote, MoodEntry, Profile, Settings } from '../types';
import { defaultBaselines, defaultProfile, defaultSettings, initialAlerts, initialMoodHistory, initialNotes } from '../data/mockData';
import { getAstronauts } from '../services/astronautService';
import { getAlerts, mapBackendAlertToUi, updateAlertStatus as apiUpdateAlertStatus } from '../services/alertService';
import { getSystemHealth, getDatabaseHealth } from '../services/healthService';
import { getMe, logout as apiLogout } from '../services/authService';
import { setAuthToken } from '../services/api';

interface AlertTotals {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
}

interface AppState {
  // Existing state
  alerts: Alert[];
  acknowledge: (id: string) => Promise<void>;
  resolveAlert: (id: string) => Promise<void>;
  updateAlertStatus: (id: string, status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED') => Promise<void>;
  acknowledgeAllNonCritical: () => Promise<void>;
  online: boolean;
  setOnline: (v: boolean) => void;
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  baselines: Baselines;
  setBaselines: (b: Baselines) => void;
  profile: Profile;
  setProfile: (p: Profile) => void;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (token: string, userProfile?: Partial<Profile>) => void;
  logout: () => Promise<void> | void;
  notes: FlightNote[];
  addNote: (text: string) => void;
  deleteNote: (id: string) => void;
  moodHistory: MoodEntry[];
  addMoodEntry: (entry: Omit<MoodEntry, 'id'>) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;

  // Real backend state
  astronauts: Astronaut[];
  selectedAstronaut: Astronaut | null;
  setSelectedAstronaut: (a: Astronaut | null) => void;
  backendAlerts: BackendAlert[];
  alertTotals: AlertTotals;
  apiConnected: boolean;
  dbConnected: boolean;
  isLoadingBackend: boolean;
  refreshAstronauts: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to persist ${key}:`, err);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>(() => loadStorage('vyoma_alerts', initialAlerts));
  const [online, setOnlineState] = useState<boolean>(() => loadStorage('vyoma_online', true));
  const [settings, setSettingsState] = useState<Settings>(() => loadStorage('vyoma_settings', defaultSettings));
  const [baselines, setBaselinesState] = useState<Baselines>(() => loadStorage('vyoma_baselines', defaultBaselines));
  const [profile, setProfileState] = useState<Profile>(() => loadStorage('vyoma_profile', defaultProfile));
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [notes, setNotesState] = useState<FlightNote[]>(() => loadStorage('vyoma_notes', initialNotes));
  const [moodHistory, setMoodHistoryState] = useState<MoodEntry[]>(() => loadStorage('vyoma_mood_history', initialMoodHistory));
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => loadStorage('vyoma_sidebar_collapsed', false));

  // Real Backend States
  const [astronauts, setAstronauts] = useState<Astronaut[]>([]);
  const [selectedAstronaut, setSelectedAstronautState] = useState<Astronaut | null>(null);
  const [backendAlerts, setBackendAlerts] = useState<BackendAlert[]>([]);
  const [alertTotals, setAlertTotals] = useState<AlertTotals>({ total: 0, open: 0, acknowledged: 0, resolved: 0 });
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [isLoadingBackend, setIsLoadingBackend] = useState<boolean>(false);

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setSidebarCollapsedState(v);
    saveStorage('vyoma_sidebar_collapsed', v);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      saveStorage('vyoma_sidebar_collapsed', next);
      return next;
    });
  }, []);

  const setOnline = useCallback((v: boolean) => {
    setOnlineState(v);
    saveStorage('vyoma_online', v);
  }, []);

  const setSelectedAstronaut = useCallback((a: Astronaut | null) => {
    setSelectedAstronautState(a);
    if (a) {
      setProfileState((prev) => ({
        ...prev,
        name: a.name,
        id: a.astronaut_code,
        crew: a.mission_id || prev.crew,
      }));
    }
  }, []);

  // Fetch all registered astronauts from PostgreSQL
  const refreshAstronauts = useCallback(async () => {
    try {
      const list = await getAstronauts();
      setAstronauts(list);
      setApiConnected(true);

      if (list.length > 0) {
        setSelectedAstronautState((prev) => {
          if (prev && list.some((item) => item.id === prev.id)) {
            return list.find((item) => item.id === prev.id)!;
          }
          const defaultAstro = list[0];
          setProfileState((p) => ({
            ...p,
            name: defaultAstro.name,
            id: defaultAstro.astronaut_code,
            crew: defaultAstro.mission_id || p.crew,
          }));
          return defaultAstro;
        });
      }
    } catch {
      // Backend not running yet or endpoint unavailable
      setApiConnected(false);
    }
  }, []);

  // Fetch alerts from PostgreSQL
  const refreshAlerts = useCallback(async () => {
    try {
      const data = await getAlerts({ limit: 100 });
      setBackendAlerts(data.alerts);
      setApiConnected(true);

      // Group totals
      const openCount = data.alerts.filter((a) => a.status === 'OPEN').length;
      const ackCount = data.alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
      const resCount = data.alerts.filter((a) => a.status === 'RESOLVED').length;
      setAlertTotals({
        total: data.total,
        open: openCount,
        acknowledged: ackCount,
        resolved: resCount,
      });

      // Map to UI alerts
      if (data.alerts.length > 0) {
        const mapped = data.alerts.map((a) => mapBackendAlertToUi(a));
        setAlerts(mapped);
        saveStorage('vyoma_alerts', mapped);
      }
    } catch {
      setApiConnected(false);
    }
  }, []);

  // Refresh entire backend connection & data
  const refreshAll = useCallback(async () => {
    setIsLoadingBackend(true);
    try {
      await getSystemHealth();
      setApiConnected(true);

      try {
        const dbRes = await getDatabaseHealth();
        setDbConnected(dbRes.status === 'connected');
      } catch {
        setDbConnected(false);
      }

      await Promise.all([refreshAstronauts(), refreshAlerts()]);
    } catch {
      setApiConnected(false);
      setDbConnected(false);
    } finally {
      setIsLoadingBackend(false);
    }
  }, [refreshAstronauts, refreshAlerts]);

  // Verify active session on mount
  useEffect(() => {
    let active = true;
    const verifySession = async () => {
      try {
        const me = await getMe();
        if (!active) return;
        if (me && me.astronaut_id) {
          setIsAuthenticated(true);
          setProfileState((prev) => ({
            ...prev,
            name: me.name,
            id: me.astronaut_code,
            crew: me.mission_id || prev.crew,
          }));
          setSelectedAstronautState({
            id: me.astronaut_id,
            astronaut_code: me.astronaut_code,
            name: me.name,
            age: me.age,
            mission_id: me.mission_id,
            created_at: new Date().toISOString(),
          });
          refreshAll();
        }
      } catch {
        if (!active) return;
        setIsAuthenticated(false);
        setAuthToken(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    };

    verifySession();
    return () => {
      active = false;
    };
  }, [refreshAll]);

  // Update alert status on backend + local state
  const updateAlertStatus = useCallback(
    async (id: string | number, status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED') => {
      const numId = Number(id);
      if (!isNaN(numId) && numId > 0 && apiConnected) {
        try {
          await apiUpdateAlertStatus(numId, status);
          await refreshAlerts();
          return;
        } catch (err) {
          console.warn('Failed to update alert status on backend, updating local state:', err);
        }
      }

      // Local fallback
      setAlerts((prev) => {
        const next = prev.map((x) =>
          x.id === String(id)
            ? {
                ...x,
                status,
                acknowledged: status !== 'OPEN',
                acknowledgedAt: status === 'ACKNOWLEDGED' || status === 'RESOLVED' ? new Date().toISOString() : x.acknowledgedAt,
                resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : x.resolvedAt,
              }
            : x
        );
        saveStorage('vyoma_alerts', next);
        return next;
      });
    },
    [apiConnected, refreshAlerts]
  );

  const acknowledge = useCallback(
    async (id: string) => {
      await updateAlertStatus(id, 'ACKNOWLEDGED');
    },
    [updateAlertStatus]
  );

  const resolveAlert = useCallback(
    async (id: string) => {
      await updateAlertStatus(id, 'RESOLVED');
    },
    [updateAlertStatus]
  );

  const acknowledgeAllNonCritical = useCallback(async () => {
    const nonCrit = alerts.filter((a) => a.severity !== 'critical' && !a.acknowledged);
    if (apiConnected) {
      await Promise.all(
        nonCrit.map(async (a) => {
          const numId = a.backendId ?? Number(a.id);
          if (!isNaN(numId)) {
            try {
              await apiUpdateAlertStatus(numId, 'ACKNOWLEDGED');
            } catch {}
          }
        })
      );
      await refreshAlerts();
    } else {
      setAlerts((prev) => {
        const next = prev.map((x) => (x.severity !== 'critical' ? { ...x, acknowledged: true, status: 'ACKNOWLEDGED' } : x));
        saveStorage('vyoma_alerts', next);
        return next;
      });
    }
  }, [alerts, apiConnected, refreshAlerts]);

  const updateSettings = useCallback((p: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...p };
      saveStorage('vyoma_settings', next);
      return next;
    });
  }, []);

  const setBaselines = useCallback((b: Baselines) => {
    setBaselinesState(b);
    saveStorage('vyoma_baselines', b);
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    saveStorage('vyoma_profile', p);
  }, []);

  const login = useCallback((token: string, userProfile?: Partial<Profile>) => {
    setAuthToken(token);
    setIsAuthenticated(true);
    if (userProfile) {
      setProfileState((prev) => {
        const next = { ...prev, ...userProfile };
        saveStorage('vyoma_profile', next);
        return next;
      });
    }
    refreshAll();
  }, [refreshAll]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.warn('Backend logout error:', err);
    } finally {
      setAuthToken(null);
      localStorage.removeItem('vyoma_token');
      localStorage.removeItem('vyoma_user');
      setIsAuthenticated(false);
      setSelectedAstronautState(null);
    }
  }, []);

  const addNote = useCallback((text: string) => {
    setNotesState((prev) => {
      const newNote: FlightNote = {
        id: `note-${Date.now()}`,
        time: new Date().toISOString(),
        text: text.trim(),
      };
      const next = [newNote, ...prev];
      saveStorage('vyoma_notes', next);
      return next;
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotesState((prev) => {
      const next = prev.filter((n) => n.id !== id);
      saveStorage('vyoma_notes', next);
      return next;
    });
  }, []);

  const addMoodEntry = useCallback((entry: Omit<MoodEntry, 'id'>) => {
    setMoodHistoryState((prev) => {
      const newEntry: MoodEntry = {
        id: `m-${Date.now()}`,
        ...entry,
      };
      const next = [...prev, newEntry];
      saveStorage('vyoma_mood_history', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(settings.reduceMotion);
  }, [settings.reduceMotion]);

  const value = useMemo(
    () => ({
      alerts,
      acknowledge,
      resolveAlert,
      updateAlertStatus,
      acknowledgeAllNonCritical,
      online,
      setOnline,
      settings,
      updateSettings,
      baselines,
      setBaselines,
      profile,
      setProfile,
      isAuthenticated,
      authLoading,
      login,
      logout,
      notes,
      addNote,
      deleteNote,
      moodHistory,
      addMoodEntry,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,

      astronauts,
      selectedAstronaut,
      setSelectedAstronaut,
      backendAlerts,
      alertTotals,
      apiConnected,
      dbConnected,
      isLoadingBackend,
      refreshAstronauts,
      refreshAlerts,
      refreshAll,
    }),
    [
      alerts,
      acknowledge,
      resolveAlert,
      updateAlertStatus,
      acknowledgeAllNonCritical,
      online,
      setOnline,
      settings,
      updateSettings,
      baselines,
      setBaselines,
      profile,
      setProfile,
      isAuthenticated,
      authLoading,
      login,
      logout,
      notes,
      addNote,
      deleteNote,
      moodHistory,
      addMoodEntry,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,

      astronauts,
      selectedAstronaut,
      setSelectedAstronaut,
      backendAlerts,
      alertTotals,
      apiConnected,
      dbConnected,
      isLoadingBackend,
      refreshAstronauts,
      refreshAlerts,
      refreshAll,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside <AppProvider>');
  return c;
}
