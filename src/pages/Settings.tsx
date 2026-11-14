import { useState, useEffect, useMemo, type ReactNode } from 'react';
import {
  Check, AlertCircle, RotateCcw, Save, Sliders, User, Radio,
  SlidersHorizontal, Bell, Gauge, Heart, Activity, ShieldAlert,
  UserPlus, Trash2, CheckCircle2
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Toggle from '../components/common/Toggle';
import { useApp } from '../context/AppContext';
import { defaultBaselines, sensors } from '../data/mockData';
import type { Baselines, Profile } from '../types';
import { cx, fmtDateTime } from '../utils';
import { createAstronaut, deleteAstronaut, updateAstronaut } from '../services/astronautService';


type SettingsTab = 'baselines' | 'profile' | 'sensors' | 'system';

interface BaselineFieldConfig {
  key: keyof Baselines;
  label: string;
  unit: string;
  step: number;
  min: number;
  max: number;
  referenceNominal: string;
  description: string;
}

const baselineConfigs: BaselineFieldConfig[] = [
  {
    key: 'restingHr',
    label: 'Resting Heart Rate',
    unit: 'BPM',
    step: 1,
    min: 40,
    max: 120,
    referenceNominal: '58 BPM',
    description: 'Basal resting sinus rhythm during sleep or seated microgravity rest.',
  },
  {
    key: 'hrv',
    label: 'Heart Rate Variability (rMSSD)',
    unit: 'ms',
    step: 1,
    min: 15,
    max: 150,
    referenceNominal: '68 ms',
    description: 'Autonomous parasympathetic tone and autonomic fatigue buffer.',
  },
  {
    key: 'spo2',
    label: 'Peripheral Oxygen Saturation',
    unit: '%',
    step: 1,
    min: 88,
    max: 100,
    referenceNominal: '98%',
    description: 'Arterial blood oxygen concentration at nominal habitat cabin pressure.',
  },
  {
    key: 'systolic',
    label: 'Systolic Arterial Pressure',
    unit: 'mmHg',
    step: 1,
    min: 85,
    max: 180,
    referenceNominal: '115 mmHg',
    description: 'Peak ventricular ejection pressure in cephalad fluid shift state.',
  },
  {
    key: 'diastolic',
    label: 'Diastolic Arterial Pressure',
    unit: 'mmHg',
    step: 1,
    min: 50,
    max: 110,
    referenceNominal: '74 mmHg',
    description: 'Baseline resting vascular resistance during cardiac diastole.',
  },
  {
    key: 'temp',
    label: 'Core Body Temperature',
    unit: '°C',
    step: 0.1,
    min: 35.0,
    max: 40.0,
    referenceNominal: '36.8 °C',
    description: 'Tympanic / core thermoregulatory equilibrium setpoint.',
  },
  {
    key: 'resp',
    label: 'Respiratory Rate',
    unit: 'br/min',
    step: 1,
    min: 8,
    max: 30,
    referenceNominal: '14 br/min',
    description: 'Resting ventilation rate during standard orbital wakefulness.',
  },
];

function Card({
  title,
  subtitle,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof Activity;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6" aria-label={title}>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3.5">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ghost text-navy border border-line">
              <Icon className="h-4 w-4 text-teal" aria-hidden />
            </span>
          )}
          <div>
            <h2 className="font-display text-sm font-bold text-ink tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {badge && <div>{badge}</div>}
      </header>
      {children}
    </section>
  );
}

export default function Settings() {
  const {
    profile,
    setProfile,
    baselines,
    setBaselines,
    settings,
    updateSettings,
    astronauts,
    selectedAstronaut,
    setSelectedAstronaut,
    refreshAstronauts,
    apiConnected,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SettingsTab>('baselines');

  // Form states
  const [profileForm, setProfileForm] = useState<Profile>(profile);
  const [baselineForm, setBaselineForm] = useState<Record<keyof Baselines, string>>(() =>
    Object.fromEntries(Object.entries(baselines).map(([k, v]) => [k, String(v)])) as Record<keyof Baselines, string>
  );

  // Astronaut management state
  const [newAstroCode, setNewAstroCode] = useState('');
  const [newAstroName, setNewAstroName] = useState('');
  const [newAstroAge, setNewAstroAge] = useState('');
  const [newAstroMission, setNewAstroMission] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);


  const [sensorsState, setSensorsState] = useState<Record<string, boolean>>(() => {
    try {
      const v = localStorage.getItem('vyoma_sensors');
      if (v) return JSON.parse(v);
    } catch {}
    return { wrist: true, chest: true, cuff: true, ring: false };
  });

  const [sampleRate, setSampleRate] = useState(
    () => localStorage.getItem('vyoma_sample_rate') || '1'
  );
  const [statusNotice, setStatusNotice] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

  // Sync when context changes externally
  useEffect(() => {
    setProfileForm(profile);
  }, [profile]);

  useEffect(() => {
    setBaselineForm(
      Object.fromEntries(Object.entries(baselines).map(([k, v]) => [k, String(v)])) as Record<keyof Baselines, string>
    );
  }, [baselines]);

  // Dirty state calculations
  const isProfileDirty = useMemo(() => {
    return (
      profileForm.name !== profile.name ||
      profileForm.role !== profile.role ||
      profileForm.id !== profile.id ||
      profileForm.crew !== profile.crew
    );
  }, [profileForm, profile]);

  const isBaselinesDirty = useMemo(() => {
    return Object.entries(baselineForm).some(([k, v]) => {
      const key = k as keyof Baselines;
      return parseFloat(v) !== baselines[key];
    });
  }, [baselineForm, baselines]);

  const hasAnyUnsaved = isProfileDirty || isBaselinesDirty;

  const showNotice = (text: string, type: 'success' | 'warn' = 'success') => {
    setStatusNotice({ text, type });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Actions
  const handleSaveBaselines = () => {
    const numeric: Record<string, number> = {};
    for (const [k, v] of Object.entries(baselineForm)) {
      const parsed = parseFloat(v);
      if (isNaN(parsed) || parsed <= 0) {
        showNotice(`Invalid value for ${k}. Positive numeric values required.`, 'warn');
        return;
      }
      numeric[k] = parsed;
    }
    setBaselines(numeric as unknown as Baselines);
    showNotice('Physiological baselines calibrated and saved to station store.');
  };

  const handleResetBaselinesToDefault = () => {
    setBaselineForm(
      Object.fromEntries(Object.entries(defaultBaselines).map(([k, v]) => [k, String(v)])) as Record<keyof Baselines, string>
    );
    setBaselines(defaultBaselines);
    showNotice('Physiological baselines restored to standard NASA astronaut reference values.');
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      showNotice('Crew member name cannot be blank.', 'warn');
      return;
    }
    if (apiConnected && selectedAstronaut) {
      try {
        await updateAstronaut(selectedAstronaut.id, {
          name: profileForm.name.trim(),
          mission_id: profileForm.crew.trim() || null,
        });
        await refreshAstronauts();
      } catch (err) {
        console.warn('Failed to update astronaut in PostgreSQL:', err);
      }
    }
    setProfile(profileForm);
    showNotice('Astronaut profile credentials updated successfully.');
  };

  const handleRegisterAstronaut = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);

    if (!newAstroCode.trim() || newAstroCode.trim().length < 3) {
      setRegisterError('Astronaut Code must be at least 3 characters.');
      return;
    }
    if (!newAstroName.trim() || newAstroName.trim().length < 2) {
      setRegisterError('Name must be at least 2 characters.');
      return;
    }

    const ageNum = newAstroAge ? parseInt(newAstroAge, 10) : null;
    if (ageNum !== null && (ageNum < 18 || ageNum > 100)) {
      setRegisterError('Age must be between 18 and 100.');
      return;
    }

    setIsRegistering(true);
    try {
      const created = await createAstronaut({
        astronaut_code: newAstroCode.trim().toUpperCase(),
        name: newAstroName.trim(),
        age: ageNum,
        mission_id: newAstroMission.trim() || null,
      });
      setRegisterSuccess(`Astronaut ${created.name} (${created.astronaut_code}) registered successfully!`);
      setNewAstroCode('');
      setNewAstroName('');
      setNewAstroAge('');
      setNewAstroMission('');
      await refreshAstronauts();
      setSelectedAstronaut(created);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setRegisterError(msg || 'Failed to register astronaut in database.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeleteAstronaut = async (id: number, code: string) => {
    if (!confirm(`Are you sure you want to remove astronaut profile ${code}?`)) {
      return;
    }
    try {
      await deleteAstronaut(id);
      showNotice(`Astronaut ${code} deleted.`);
      await refreshAstronauts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showNotice(msg || 'Cannot delete astronaut due to associated database records.', 'warn');
    }
  };


  const handleDiscardChanges = () => {
    setProfileForm(profile);
    setBaselineForm(
      Object.fromEntries(Object.entries(baselines).map(([k, v]) => [k, String(v)])) as Record<keyof Baselines, string>
    );
    showNotice('Unsaved changes discarded.');
  };

  const handleSensorToggle = (id: string, active: boolean) => {
    const next = { ...sensorsState, [id]: active };
    setSensorsState(next);
    localStorage.setItem('vyoma_sensors', JSON.stringify(next));
    showNotice(`Biosensor telemetry channel "${id.toUpperCase()}" ${active ? 'enabled' : 'disabled'}.`);
  };

  const handleSampleRateChange = (r: string) => {
    setSampleRate(r);
    localStorage.setItem('vyoma_sample_rate', r);
    showNotice(`Telemetry polling sample frequency updated to ${r} Hz.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings &amp; Bio-Calibration"
        subtitle="Individual physiological baseline calibration, crew credentials, biosensor stream channels, and telemetry routing."
      >
        {statusNotice && (
          <div
            role="status"
            className={cx(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold animate-fadeUp',
              statusNotice.type === 'success'
                ? 'border-teal/30 bg-teal/10 text-teal-dark'
                : 'border-warn/30 bg-warn/10 text-warn'
            )}
          >
            {statusNotice.type === 'success' ? (
              <Check className="h-3.5 w-3.5 text-teal" aria-hidden />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-warn" aria-hidden />
            )}
            {statusNotice.text}
          </div>
        )}
      </PageHeader>

      {/* Unsaved Changes Banner */}
      {hasAnyUnsaved && (
        <aside
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal/40 bg-teal/5 p-4 text-xs shadow-card"
        >
          <div className="flex items-center gap-2.5 text-navy">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-teal text-white font-bold">
              <Sliders className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-sm text-ink">You have unsaved calibration modifications</p>
              <p className="text-muted text-xs">
                {isBaselinesDirty && isProfileDirty
                  ? 'Baseline physiological metrics and astronaut credentials have pending edits.'
                  : isBaselinesDirty
                  ? 'Baseline physiological metric adjustments have not yet been committed to telemetry.'
                  : 'Astronaut profile credential changes have not been saved.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="btn-ghost text-xs px-3 py-1.5"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={() => {
                if (isBaselinesDirty) handleSaveBaselines();
                if (isProfileDirty) handleSaveProfile();
              }}
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save All Changes
            </button>
          </div>
        </aside>
      )}

      {/* Primary Navigation Tabs */}
      <nav aria-label="Settings Sections" className="border-b border-line flex flex-wrap gap-2 pt-1">
        {[
          { id: 'baselines', label: 'Bio-Calibration & Baselines', icon: Heart, dirty: isBaselinesDirty },
          { id: 'profile',   label: 'Astronaut Profile & Station', icon: User, dirty: isProfileDirty },
          { id: 'sensors',   label: 'Biosensors & Telemetry Rate', icon: Radio },
          { id: 'system',    label: 'Alarm Routing & Interface',   icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={cx(
                'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all relative',
                isActive
                  ? 'border-teal text-teal-dark bg-white rounded-t-lg shadow-sm'
                  : 'border-transparent text-muted hover:text-ink hover:border-line'
              )}
            >
              <Icon className={cx('h-3.5 w-3.5', isActive ? 'text-teal' : 'text-muted')} />
              <span>{tab.label}</span>
              {tab.dirty && (
                <span className="h-2 w-2 rounded-full bg-teal ring-2 ring-white" title="Unsaved changes in this tab" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── TAB 1: BIO-CALIBRATION & BASELINES ── */}
      {activeTab === 'baselines' && (
        <div className="space-y-6">
          <Card
            title="Individual Physiological Baselines"
            subtitle="Pre-mission biological reference parameters. All anomaly detection algorithms and triage thresholds calculate real-time drift from these baselines."
            icon={Heart}
            badge={
              <div className="flex items-center gap-2">
                {isBaselinesDirty ? (
                  <span className="rounded-full bg-teal/15 px-2.5 py-0.5 text-[10px] font-bold text-teal-dark">
                    Modified
                  </span>
                ) : (
                  <span className="rounded-full bg-ghost px-2.5 py-0.5 text-[10px] font-medium text-muted">
                    Reference Synced
                  </span>
                )}
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {baselineConfigs.map((cfg) => {
                const val = baselineForm[cfg.key];
                const isModified = parseFloat(val) !== baselines[cfg.key];

                return (
                  <div
                    key={cfg.key}
                    className={cx(
                      'rounded-xl border p-4 transition-all duration-150',
                      isModified
                        ? 'border-teal bg-teal/[0.03] shadow-sm'
                        : 'border-line bg-offwhite/50 hover:bg-white hover:border-line'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <label htmlFor={`b-${cfg.key}`} className="text-xs font-bold text-ink block">
                        {cfg.label}
                      </label>
                      <span className="text-[10px] font-mono text-muted bg-white border border-line px-1.5 py-0.5 rounded">
                        Nom: {cfg.referenceNominal}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted leading-relaxed mb-3 line-clamp-2">
                      {cfg.description}
                    </p>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          id={`b-${cfg.key}`}
                          type="number"
                          step={cfg.step}
                          min={cfg.min}
                          max={cfg.max}
                          value={val}
                          onChange={(e) => setBaselineForm({ ...baselineForm, [cfg.key]: e.target.value })}
                          className="input num w-full pr-12 font-semibold text-ink"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted pointer-events-none">
                          {cfg.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Baseline Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveBaselines}
                  disabled={!isBaselinesDirty}
                  className="btn-primary text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Calibration Baselines
                </button>
                <button
                  type="button"
                  onClick={handleResetBaselinesToDefault}
                  className="btn-ghost text-xs flex items-center gap-2 text-muted hover:text-ink"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore Reference Standards
                </button>
              </div>

              <p className="text-[11px] text-muted">
                Calibration protocol: NASA Standard-3001 Bio-medical Reference Set.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: ASTRONAUT PROFILE & STATION ── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Registered Crew Directory */}
          <Card
            title="Registered Astronaut Crew Directory"
            subtitle="Live astronaut records from PostgreSQL database (astronaut_profiles table)."
            icon={User}
            badge={
              <span className="rounded-full bg-teal/15 px-2.5 py-0.5 text-[10px] font-bold text-teal-dark">
                {astronauts.length} Registered
              </span>
            }
          >
            {astronauts.length === 0 ? (
              <p className="text-xs text-muted py-2">
                No astronauts loaded yet. Register a new astronaut below or verify backend connection.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {astronauts.map((astro) => {
                  const isCurrent = selectedAstronaut?.id === astro.id;
                  return (
                    <div
                      key={astro.id}
                      className={cx(
                        'rounded-xl border p-4 transition-all flex flex-col justify-between',
                        isCurrent
                          ? 'border-teal bg-teal/[0.04] shadow-sm'
                          : 'border-line bg-offwhite/50 hover:bg-white'
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-teal-dark bg-teal/15 px-1.5 py-0.5 rounded">
                              {astro.astronaut_code}
                            </span>
                            <h3 className="font-bold text-sm text-ink mt-1">{astro.name}</h3>
                          </div>
                          {isCurrent && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-teal-dark bg-white border border-teal/30 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3 text-teal" /> Active
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-muted mt-2">
                          <p>Age: <strong className="text-ink">{astro.age ?? 'Not specified'}</strong></p>
                          <p>Mission: <strong className="text-ink font-mono">{astro.mission_id ?? 'None'}</strong></p>
                          <p className="text-[10px]">Registered: {fmtDateTime(astro.created_at, settings.hour12)}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAstronaut(astro)}
                          className={cx(
                            'text-xs px-2.5 py-1 rounded font-semibold transition-all',
                            isCurrent
                              ? 'bg-teal text-white shadow-xs'
                              : 'btn-ghost text-xs hover:bg-white border border-line'
                          )}
                        >
                          {isCurrent ? 'Current Subject' : 'Select'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAstronaut(astro.id, astro.astronaut_code)}
                          className="text-muted/60 hover:text-crit p-1 rounded transition-colors"
                          title={`Delete ${astro.astronaut_code}`}
                          aria-label={`Delete ${astro.astronaut_code}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Edit Astronaut Profile */}
          <Card
            title="Astronaut Operational Credentials"
            subtitle="Update flight surgeon records, operational role, call sign, and crew assignment for the active astronaut."
            icon={User}
            badge={
              isProfileDirty ? (
                <span className="rounded-full bg-teal/15 px-2.5 py-0.5 text-[10px] font-bold text-teal-dark">
                  Modified
                </span>
              ) : null
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-ink" htmlFor="prof-name">
                  Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  className="input w-full"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-muted">Designated primary astronaut identity on mission logs.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-ink" htmlFor="prof-role">
                  Operational Assignment &amp; Title
                </label>
                <input
                  id="prof-role"
                  type="text"
                  className="input w-full"
                  value={profileForm.role}
                  onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-muted">Primary flight responsibilities and orbital station role.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-ink" htmlFor="prof-id">
                  Crew ID / Call Sign
                </label>
                <input
                  id="prof-id"
                  type="text"
                  disabled={Boolean(selectedAstronaut)}
                  className="input w-full font-mono disabled:opacity-60"
                  value={profileForm.id}
                  onChange={(e) => setProfileForm({ ...profileForm, id: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-muted">
                  {selectedAstronaut ? 'Synced with database astronaut_code (read-only).' : 'Official NASA crew telemetry identifier.'}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-ink" htmlFor="prof-crew">
                  Expedition / Mission ID
                </label>
                <input
                  id="prof-crew"
                  type="text"
                  className="input w-full font-mono"
                  value={profileForm.crew}
                  onChange={(e) => setProfileForm({ ...profileForm, crew: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-muted">Assigned expedition increment or mission identifier.</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={!isProfileDirty}
                className="btn-primary text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-3.5 w-3.5" />
                Update Profile Credentials
              </button>
              <button
                type="button"
                onClick={() => setProfileForm(profile)}
                disabled={!isProfileDirty}
                className="btn-ghost text-xs disabled:opacity-40"
              >
                Revert Edits
              </button>
            </div>
          </Card>

          {/* Register New Astronaut Form */}
          <Card
            title="Register New Astronaut Profile"
            subtitle="Register an astronaut directly into PostgreSQL via POST /api/astronauts/."
            icon={UserPlus}
          >
            {registerSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal/10 border border-teal/30 p-3 text-xs text-teal-dark font-medium">
                <Check className="h-4 w-4 text-teal shrink-0" />
                <span>{registerSuccess}</span>
              </div>
            )}

            {registerError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-crit/10 border border-crit/30 p-3 text-xs text-crit font-medium">
                <AlertCircle className="h-4 w-4 text-crit shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterAstronaut} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-ink" htmlFor="new-code">
                    Astronaut Code *
                  </label>
                  <input
                    id="new-code"
                    type="text"
                    required
                    placeholder="e.g. AST-002"
                    className="input w-full font-mono"
                    value={newAstroCode}
                    onChange={(e) => setNewAstroCode(e.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-muted">Unique identifier (3-50 chars)</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-ink" htmlFor="new-name">
                    Full Name *
                  </label>
                  <input
                    id="new-name"
                    type="text"
                    required
                    placeholder="e.g. Dr. Sunita Williams"
                    className="input w-full"
                    value={newAstroName}
                    onChange={(e) => setNewAstroName(e.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-muted">Astronaut name (2-100 chars)</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-ink" htmlFor="new-age">
                    Age
                  </label>
                  <input
                    id="new-age"
                    type="number"
                    min="18"
                    max="100"
                    placeholder="e.g. 42"
                    className="input w-full"
                    value={newAstroAge}
                    onChange={(e) => setNewAstroAge(e.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-muted">18–100 years</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-ink" htmlFor="new-mission">
                    Mission ID
                  </label>
                  <input
                    id="new-mission"
                    type="text"
                    placeholder="e.g. EXP-72"
                    className="input w-full font-mono"
                    value={newAstroMission}
                    onChange={(e) => setNewAstroMission(e.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-muted">Mission / expedition</p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-line">
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{isRegistering ? 'Registering...' : 'Register Astronaut'}</span>
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}


      {/* ── TAB 3: BIOSENSORS & TELEMETRY STREAM ── */}
      {activeTab === 'sensors' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title="Wearable Biosensor Array"
            subtitle="Continuous biomedical sensor harness channels connected via low-latency Bluetooth Spaceband."
            icon={Radio}
          >
            <div className="divide-y divide-line">
              {sensors.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-ink">{s.name}</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {s.id === 'wrist' && 'Continuous photoplethysmography (PPG), skin temperature, and motion.'}
                      {s.id === 'chest' && 'Multi-lead electrocardiogram (ECG) and thoracic impedance plethysmography.'}
                      {s.id === 'cuff' && 'Automated oscillometric blood pressure brachial telemetry cuff.'}
                      {s.id === 'ring' && 'Peripheral microcirculation pulse oximeter and sleep architecture ring.'}
                    </p>
                  </div>
                  <Toggle
                    label=""
                    checked={!!sensorsState[s.id]}
                    onChange={(active) => handleSensorToggle(s.id, active)}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Telemetry Stream &amp; Sampling Rate"
            subtitle="Adjust telemetry packet generation frequency based on orbital bandwidth constraints."
            icon={Gauge}
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="sample-rate" className="block text-xs font-bold text-ink mb-1">
                  Telemetry Acquisition Frequency
                </label>
                <select
                  id="sample-rate"
                  className="input w-full text-xs"
                  value={sampleRate}
                  onChange={(e) => handleSampleRateChange(e.target.value)}
                >
                  <option value="1">1 Hz (Continuous Live Stream · 1 packet/sec · High Bandwidth)</option>
                  <option value="5">0.2 Hz (Standard Mission Telemetry · 1 packet/5 sec · Balanced)</option>
                  <option value="60">0.016 Hz (Power Conservation Mode · 1 packet/min · Deep Space)</option>
                </select>
                <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                  High frequency enables sub-second ECG morphology and real-time arrhythmia detection, but increases uplink transmission queue size during ground tracking loss.
                </p>
              </div>

              <div className="rounded-lg bg-offwhite border border-line p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Buffer Compression</span>
                  <span className="font-mono text-teal-dark font-bold text-[11px]">Zstandard LZ4 (Enabled)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Telemetry Cache Limit</span>
                  <span className="font-mono text-muted text-[11px]">500 MB Encrypted Store</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 4: ALARM ROUTING & INTERFACE ── */}
      {activeTab === 'system' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title="Operational Alarm Routing &amp; Auditory Alerts"
            subtitle="Configure clinical triage notification delivery and sound alarms."
            icon={ShieldAlert}
          >
            <div className="space-y-1">
              <Toggle
                label="Critical Priority Triage Alarms"
                hint="Flight surgeon intervention required · Immediate sound & visual cue"
                checked={settings.notifyCritical}
                onChange={(v) => updateSettings({ notifyCritical: v })}
              />
              <Toggle
                label="Warning Drift Deviations"
                hint="Physiological baseline trends approaching critical limits"
                checked={settings.notifyWarning}
                onChange={(v) => updateSettings({ notifyWarning: v })}
              />
              <Toggle
                label="Informational Mission Logs"
                hint="System synchronization and ambient telemetry updates"
                checked={settings.notifyInfo}
                onChange={(v) => updateSettings({ notifyInfo: v })}
              />
              <Toggle
                label="Acoustic Alarm Tone"
                hint="Emit auditory beep on critical triage occurrences"
                checked={settings.sound}
                onChange={(v) => updateSettings({ sound: v })}
              />
            </div>
          </Card>

          <Card
            title="Measurement &amp; Interface Preferences"
            subtitle="Display unit standards, mission chronometer, and accessibility options."
            icon={SlidersHorizontal}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-ink">Thermal Scale Convention</label>
                <div className="flex gap-2">
                  {(['metric', 'imperial'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={settings.units === u}
                      onClick={() => updateSettings({ units: u })}
                      className={`chip ${settings.units === u ? 'chip-on' : 'chip-off'}`}
                    >
                      {u === 'metric' ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
                    </button>
                  ))}
                </div>
              </div>

              <Toggle
                label="12-Hour Chronometer Mode"
                hint="Standard space mission format is 24-hour UTC"
                checked={settings.hour12}
                onChange={(v) => updateSettings({ hour12: v })}
              />

              <Toggle
                label="Reduced Motion Mode"
                hint="Suspends real-time ECG waveform canvas renders and animated sweeps"
                checked={settings.reduceMotion}
                onChange={(v) => updateSettings({ reduceMotion: v })}
              />

              <Toggle
                label="Demonstration Notice Banner"
                hint="Displays header banner clarifying demo simulation status"
                checked={settings.showDemoBanner}
                onChange={(v) => updateSettings({ showDemoBanner: v })}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}