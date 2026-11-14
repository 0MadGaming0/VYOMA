import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  HeartPulse,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AlertCard from '../components/alerts/AlertCard';
import ChartCard from '../components/common/ChartCard';
import EmptyState from '../components/common/EmptyState';
import HealthStatusBadge from '../components/common/HealthStatusBadge';
import MetricCard from '../components/common/MetricCard';
import { useApp } from '../context/AppContext';
import { fmtDateTime, RANK, tempUnit, timeAgo, toTemp } from '../utils';
import { grid, tick, tooltipProps, C_PRIMARY, C_SECONDARY } from '../utils/chart';
import { getAstronautVitalHistory, getAstronautVitalSummary } from '../services/vitalService';
import type { Status, VitalReading, VitalSummaryResponse } from '../types';

export default function Dashboard() {
  const {
    alerts,
    acknowledge,
    resolveAlert,
    profile,
    settings,
    selectedAstronaut,
    apiConnected,
  } = useApp();

  const [vitalSummary, setVitalSummary] = useState<VitalSummaryResponse | null>(null);
  const [vitalHistory, setVitalHistory] = useState<VitalReading[]>([]);
  const [isLoadingVitals, setIsLoadingVitals] = useState<boolean>(false);

  // Fetch real vitals from backend when an astronaut is selected and API is connected
  useEffect(() => {
    let cancelled = false;
    async function loadAstroVitals() {
      if (!selectedAstronaut || !apiConnected) return;
      setIsLoadingVitals(true);
      try {
        const [sum, hist] = await Promise.all([
          getAstronautVitalSummary(selectedAstronaut.id),
          getAstronautVitalHistory(selectedAstronaut.id, { limit: 50 }),
        ]);
        if (!cancelled) {
          setVitalSummary(sum);
          setVitalHistory(hist);
        }
      } catch (err) {
        console.warn('Could not load astronaut vital telemetry:', err);
      } finally {
        if (!cancelled) setIsLoadingVitals(false);
      }
    }
    loadAstroVitals();
    return () => {
      cancelled = true;
    };
  }, [selectedAstronaut, apiConnected]);

  const latest = vitalSummary?.latest_reading;

  // ── Header Metadata ──────────────────────────────────────────────────────────
  const astronautName = selectedAstronaut?.name || profile.name || 'Crew Member';
  const astronautCode = selectedAstronaut?.astronaut_code || profile.id || 'AST-001';
  const missionId = selectedAstronaut?.mission_id || profile.crew || 'MISSION-2026';
  const lastUpdateTime = latest?.recorded_at
    ? fmtDateTime(latest.recorded_at, settings.hour12)
    : 'Awaiting Telemetry';

  // ── Active Alerts ────────────────────────────────────────────────────────────
  const activeAlerts = useMemo(() => {
    return alerts
      .filter((a) => a.status !== 'RESOLVED' && !a.resolvedAt)
      .sort((x, y) => RANK[y.severity] - RANK[x.severity]);
  }, [alerts]);

  const criticalCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'critical').length,
    [activeAlerts]
  );
  const warningCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'warning').length,
    [activeAlerts]
  );
  const openAlertsCount = useMemo(
    () => activeAlerts.filter((a) => !a.acknowledged && (a.status === 'OPEN' || !a.status)).length,
    [activeAlerts]
  );

  // ── 4 Vitals Evaluation (Heart Rate, SpO2, Temp, Resp) ──────────────────────
  const hrStatus: Status = useMemo(() => {
    if (latest?.heart_rate == null) return 'normal';
    const hr = latest.heart_rate;
    if (hr < 50 || hr > 110) return 'critical';
    if (hr < 60 || hr > 100) return 'warning';
    return 'normal';
  }, [latest?.heart_rate]);

  const spo2Status: Status = useMemo(() => {
    if (latest?.spo2 == null) return 'normal';
    const s = latest.spo2;
    if (s < 90) return 'critical';
    if (s < 95) return 'warning';
    return 'normal';
  }, [latest?.spo2]);

  const tempStatus: Status = useMemo(() => {
    if (latest?.body_temperature == null) return 'normal';
    const t = latest.body_temperature;
    if (t < 35.8 || t > 38.2) return 'critical';
    if (t < 36.5 || t > 37.5) return 'warning';
    return 'normal';
  }, [latest?.body_temperature]);

  const respStatus: Status = useMemo(() => {
    if (latest?.respiratory_rate == null) return 'normal';
    const r = latest.respiratory_rate;
    if (r < 10 || r > 24) return 'critical';
    if (r < 12 || r > 20) return 'warning';
    return 'normal';
  }, [latest?.respiratory_rate]);

  // Overall Vital Reading Status
  const vitalReadingStatus: Status = useMemo(() => {
    if (!latest) return 'normal';
    const statuses = [hrStatus, spo2Status, tempStatus, respStatus];
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'normal';
  }, [latest, hrStatus, spo2Status, tempStatus, respStatus]);

  const vitalStatusLabel = useMemo(() => {
    if (!latest) return 'No Data';
    if (vitalReadingStatus === 'critical') return 'Critical';
    if (vitalReadingStatus === 'warning') return 'Abnormal';
    return 'Normal';
  }, [latest, vitalReadingStatus]);

  const vitalStatusColor = useMemo(() => {
    if (!latest) return 'text-muted';
    if (vitalReadingStatus === 'critical') return 'text-crit';
    if (vitalReadingStatus === 'warning') return 'text-warn';
    return 'text-teal-dark';
  }, [latest, vitalReadingStatus]);

  // Overall Health Status
  const overallHealthStatus: Status = useMemo(() => {
    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'normal';
  }, [criticalCount, warningCount]);

  const overallHealthLabel = useMemo(() => {
    if (criticalCount > 0) return 'Critical';
    if (warningCount > 0) return 'Warning';
    return 'Nominal';
  }, [criticalCount, warningCount]);

  const overallHealthColor = useMemo(() => {
    if (criticalCount > 0) return 'text-crit';
    if (warningCount > 0) return 'text-warn';
    return 'text-teal-dark';
  }, [criticalCount, warningCount]);

  // ── Historical Trend Data (Real backend data only) ───────────────────────────
  const trendData = useMemo(() => {
    if (!vitalHistory || vitalHistory.length === 0) return [];
    return [...vitalHistory]
      .filter((pt) => pt.heart_rate != null || pt.spo2 != null)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map((pt) => ({
        time: pt.recorded_at,
        label: new Date(pt.recorded_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: settings.hour12,
        }),
        hr: pt.heart_rate ?? undefined,
        spo2: pt.spo2 ?? undefined,
      }));
  }, [vitalHistory, settings.hour12]);

  return (
    <div className="space-y-6">
      {/* ── 1. Header ── */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-line">
        <div>
          {/* Status Meta Bar */}
          <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs">
            {/* Backend Connection Status */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                apiConnected
                  ? 'bg-teal/10 text-teal-dark border-teal/30'
                  : 'bg-warn/10 text-warn border-warn/30'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  apiConnected ? 'bg-teal animate-pulseDot' : 'bg-warn'
                }`}
              />
              {apiConnected ? 'Backend Connected' : 'Offline / Standalone'}
            </span>

            <span className="text-muted">·</span>

            {/* Mission Identifier */}
            <span className="font-mono text-xs text-muted">
              Mission: <strong className="text-ink font-semibold">{missionId}</strong>
            </span>

            <span className="text-muted">·</span>

            {/* Last Data Update Time */}
            <span className="text-xs text-muted flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted" />
              Last Update:{' '}
              <strong className="text-ink font-mono font-medium">{lastUpdateTime}</strong>
            </span>
          </div>

          {/* Astronaut Name & ID */}
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl tracking-tight">
            {astronautName}
            <span className="ml-2.5 font-mono text-sm font-semibold text-teal-dark bg-teal/10 px-2 py-0.5 rounded border border-teal/20 align-middle">
              {astronautCode}
            </span>
          </h1>
          <p className="text-xs text-muted mt-1">
            Clinical astronaut telemetry &amp; health-monitoring dashboard
          </p>
        </div>

        {/* Astronaut Quick Identity Card */}
        <div className="flex items-center gap-3 bg-white rounded-xl border border-line p-3 shadow-card">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-teal/10 border border-teal/20 text-teal-dark font-display font-bold">
            {astronautCode.replace('AST-', '') || '01'}
          </div>
          <div>
            <p className="text-[11px] uppercase font-bold tracking-wider text-muted">Active Subject</p>
            <p className="text-sm font-bold text-ink truncate max-w-[160px]">{astronautName}</p>
            <p className="text-[11px] font-mono text-muted">{astronautCode}</p>
          </div>
        </div>
      </header>

      {/* ── 2. Summary Cards ── */}
      <section aria-label="Health and Telemetry Summary">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Astronaut Health Status */}
          <div className="card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Health Status</span>
              <HealthStatusBadge status={overallHealthStatus} />
            </div>
            <div className="my-1">
              <p className={`font-display text-2xl font-bold ${overallHealthColor}`}>
                {overallHealthLabel}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {criticalCount > 0
                  ? `${criticalCount} critical alert(s) pending triage`
                  : warningCount > 0
                  ? `${warningCount} warning alert(s) logged`
                  : 'All vitals within safety limits'}
              </p>
            </div>
          </div>

          {/* Total Open Alerts */}
          <div className="card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Open Alerts</span>
              <AlertTriangle className={`h-4 w-4 ${openAlertsCount > 0 ? 'text-crit' : 'text-teal'}`} />
            </div>
            <div className="my-1">
              <p className="num text-2xl font-bold text-ink">
                {openAlertsCount}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {openAlertsCount === 0 ? 'No unacknowledged alerts' : 'Requires medical review / triage'}
              </p>
            </div>
          </div>

          {/* Latest Vital Reading Status */}
          <div className="card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Vital Status</span>
              {latest ? (
                <HealthStatusBadge status={vitalReadingStatus} />
              ) : (
                <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[11px] font-semibold text-muted bg-offwhite">No data</span>
              )}
            </div>
            <div className="my-1">
              <p className={`font-display text-2xl font-bold ${vitalStatusColor}`}>
                {vitalStatusLabel}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {latest?.recorded_at ? `Recorded ${timeAgo(latest.recorded_at)}` : 'Awaiting baseline feed'}
              </p>
            </div>
          </div>

          {/* Total Readings Recorded */}
          <div className="card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Readings</span>
              <Database className="h-4 w-4 text-teal" />
            </div>
            <div className="my-1">
              <p className="num text-2xl font-bold text-ink">
                {vitalSummary?.total_readings ?? vitalHistory.length}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {isLoadingVitals ? 'Syncing...' : 'Historical telemetry records'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Critical Alerts ── */}
      <section aria-label="Critical and Active Alerts" className="card p-5">
        <header className="flex items-center justify-between border-b border-line pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                criticalCount > 0
                  ? 'bg-crit/10 text-crit'
                  : warningCount > 0
                  ? 'bg-warn/10 text-warn'
                  : 'bg-teal/10 text-teal-dark'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-ink">
                Active Medical Alerts
              </h2>
              <p className="text-xs text-muted">
                {activeAlerts.length === 0
                  ? 'All physiological indicators within baseline thresholds'
                  : `${activeAlerts.length} active alert(s) requiring medical review or action`}
              </p>
            </div>
          </div>
          {activeAlerts.length > 0 && (
            <span className="font-mono text-xs text-muted">
              {criticalCount} Critical · {warningCount} Warning
            </span>
          )}
        </header>

        {activeAlerts.length === 0 ? (
          <EmptyState
            title="No Active Alerts"
            hint="All monitored physiological parameters are currently within baseline thresholds."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeAlerts.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onAcknowledge={acknowledge}
                onResolve={resolveAlert}
                hour12={settings.hour12}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 4. Current Vital Signs (Display ONLY 4 metrics) ── */}
      <section aria-label="Current Vital Signs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-base font-bold text-ink">Current Vital Signs</h2>
            <p className="text-xs text-muted">Essential clinical telemetry parameters</p>
          </div>
          {latest?.recorded_at && (
            <span className="text-xs text-muted font-mono">
              Observed: {timeAgo(latest.recorded_at)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {/* Heart rate (BPM) */}
          <MetricCard
            label="Heart Rate"
            icon={HeartPulse}
            value={latest?.heart_rate != null ? Math.round(latest.heart_rate) : '—'}
            unit="BPM"
            status={hrStatus}
            baseline="Normal: 60–100 BPM"
            footnote={
              latest?.recorded_at
                ? `Observed ${fmtDateTime(latest.recorded_at, settings.hour12)}`
                : 'Awaiting sensor reading'
            }
          />

          {/* SpO₂ (%) */}
          <MetricCard
            label="Oxygen Saturation (SpO₂)"
            icon={Activity}
            value={latest?.spo2 != null ? Number(latest.spo2).toFixed(1) : '—'}
            unit="%"
            status={spo2Status}
            baseline="Normal: ≥ 95%"
            footnote="Continuous pulse oximetry"
          />

          {/* Body temperature (°C) */}
          <MetricCard
            label="Body Temperature"
            icon={Thermometer}
            value={
              latest?.body_temperature != null
                ? toTemp(latest.body_temperature, settings.units).toFixed(1)
                : '—'
            }
            unit={tempUnit(settings.units)}
            status={tempStatus}
            baseline={`Normal: ${toTemp(36.5, settings.units)}–${toTemp(37.5, settings.units)} ${tempUnit(settings.units)}`}
            footnote="Core thermoregulation"
          />

          {/* Respiratory rate (/min) */}
          <MetricCard
            label="Respiratory Rate"
            icon={Wind}
            value={latest?.respiratory_rate != null ? Math.round(latest.respiratory_rate) : '—'}
            unit="/min"
            status={respStatus}
            baseline="Normal: 12–20 /min"
            footnote="Ventilation frequency"
          />
        </div>
      </section>

      {/* ── 5. Vital Trends (Heart Rate & SpO₂ from backend) ── */}
      <section aria-label="Vital Trends Chart">
        <ChartCard
          title="Vital Trends: Heart Rate &amp; SpO₂"
          subtitle="Historical telemetry recordings retrieved directly from the space health database."
          height={300}
        >
          {trendData.length === 0 ? (
            <EmptyState
              title="No Historical Readings"
              hint="Historical trends will be graphed as telemetry readings are logged."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={tick} stroke={grid} minTickGap={32} />
                <YAxis
                  yAxisId="hr"
                  tick={tick}
                  stroke={grid}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  unit=" bpm"
                />
                <YAxis
                  yAxisId="spo2"
                  orientation="right"
                  tick={tick}
                  stroke={grid}
                  domain={[80, 100]}
                  unit="%"
                />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#16324F', paddingTop: 8 }} />
                <Line
                  yAxisId="hr"
                  type="monotone"
                  dataKey="hr"
                  name="Heart Rate (BPM)"
                  stroke={C_PRIMARY}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: C_PRIMARY }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="spo2"
                  type="monotone"
                  dataKey="spo2"
                  name="Oxygen Saturation SpO₂ (%)"
                  stroke={C_SECONDARY}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: C_SECONDARY }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>
    </div>
  );
}
