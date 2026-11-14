import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Alert, Baselines, FlightNote, MoodEntry, Profile, Settings } from '../types';
import { defaultBaselines, defaultProfile, defaultSettings, initialAlerts, initialMoodHistory, initialNotes } from '../data/mockData';

interface AppState {
  alerts: Alert[];
  acknowledge: (id: string) => void;
  acknowledgeAllNonCritical: () => void;
  online: boolean;
  setOnline: (v: boolean) => void;
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  baselines: Baselines;
  setBaselines: (b: Baselines) => void;
  profile: Profile;
  setProfile: (p: Profile) => void;
  isAuthenticated: boolean;
  login: (token: string, userProfile?: Partial<Profile>) => void;
  logout: () => void;
  notes: FlightNote[];
  addNote: (text: string) => void;
  deleteNote: (id: string) => void;
  moodHistory: MoodEntry[];
  addMoodEntry: (entry: Omit<MoodEntry, 'id'>) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(localStorage.getItem('vyoma_token')));
  const [notes, setNotesState] = useState<FlightNote[]>(() => loadStorage('vyoma_notes', initialNotes));
  const [moodHistory, setMoodHistoryState] = useState<MoodEntry[]>(() => loadStorage('vyoma_mood_history', initialMoodHistory));
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => loadStorage('vyoma_sidebar_collapsed', false));

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

  const acknowledge = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, acknowledged: true } : x));
      saveStorage('vyoma_alerts', next);
      return next;
    });
  }, []);

  const acknowledgeAllNonCritical = useCallback(() => {
    setAlerts((prev) => {
      const next = prev.map((x) => (x.severity !== 'critical' ? { ...x, acknowledged: true } : x));
      saveStorage('vyoma_alerts', next);
      return next;
    });
  }, []);

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
    localStorage.setItem('vyoma_token', token);
    setIsAuthenticated(true);
    if (userProfile) {
      setProfileState((prev) => {
        const next = { ...prev, ...userProfile };
        saveStorage('vyoma_profile', next);
        return next;
      });
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('vyoma_token');
    localStorage.removeItem('vyoma_user');
    setIsAuthenticated(false);
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
    }),
    [
      alerts,
      acknowledge,
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
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside <AppProvider>');
  return c;
}
