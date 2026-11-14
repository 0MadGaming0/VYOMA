import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Droplets,
  HeartPulse,
  PlusCircle,
  Thermometer,
  Trash2,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from '../components/common/ChartCard';
import DataTable, { type Column } from '../components/common/DataTable';
import EmptyState from '../components/common/EmptyState';
import HealthStatusBadge from '../components/common/HealthStatusBadge';
import MetricCard from '../components/common/MetricCard';
import PageHeader from '../components/common/PageHeader';
import RangeSelector from '../components/vitalwatch/RangeSelector';
import { useApp } from '../context/AppContext';
import {
  createVitalReading,
  getAstronautVitalHistory,
  getAstronautVitalSummary,
} from '../services/vitalService';
import { getAstronautAlerts, mapMetricLabel, mapMetricUnit, mapSeverity } from '../services/alertService';
import type { BackendAlert, Range, Status, VitalReading, VitalReadingCreate, VitalSummaryResponse } from '../types';
import { fmtDateTime, tempUnit, toTemp } from '../utils';
import { C_PRIMARY, C_SECONDARY, grid, tick, tooltipProps } from '../utils/chart';

type MetricType = 'hr' | 'hrv' | 'spo2' | 'bp' | 'temp' | 'resp';

interface AbnormalTableRow {
  id: string;
  t: string;
  m: string;
  r: string;
  b: string;
  s: Status;
  status: string;
}

export default function VitalWatch() {
  const {
    baselines: b,
    settings,
    notes,
    addNote,
    deleteNote,
    astronauts,
    selectedAstronaut,
    setSelectedAstronaut,
    refreshAlerts,
    apiConnected,
  } = useApp();

  const [range, setRange] = useState<Range>('24H');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('hr');
  const [draft, setDraft] = useState('');
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Real backend state for vitals and alerts
  const [summary, setSummary] = useState<VitalSummaryResponse | null>(null);
  const [history, setHistory] = useState<VitalReading[]>([]);
  const [astronautAlerts, setAstronautAlerts] = useState<BackendAlert[]>([]);

  // Modal state for recording vitals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // New Vital Reading Form state
  const [formAstronautId, setFormAstronautId] = useState<number>(selectedAstronaut?.id ?? 1);
  const [formHr, setFormHr] = useState<string>('75');
  const [formHrv, setFormHrv] = useState<string>('65');
  const [formSpo2, setFormSpo2] = useState<string>('98');
  const [formSystolic, setFormSystolic] = useState<string>('120');
  const [formDiastolic, setFormDiastolic] = useState<string>('80');
  const [formTemp, setFormTemp] = useState<string>('36.8');
  const [formResp, setFormResp] = useState<string>('16');

  // Sync form astronaut with selected astronaut
  useEffect(() => {
    if (selectedAstronaut) {
      setFormAstronautId(selectedAstronaut.id);
    }
  }, [selectedAstronaut]);

  // Load real backend data for selected astronaut
  const loadAstronautData = async (astroId: number) => {
    if (!apiConnected) return;
    try {
      const [sum, hist, alts] = await Promise.all([
        getAstronautVitalSummary(astroId),
        getAstronautVitalHistory(astroId, { limit: 200 }),
        getAstronautAlerts(astroId),
      ]);
      setSummary(sum);
      setHistory(hist);
      setAstronautAlerts(alts);
    } catch (err) {
      console.warn('Failed to fetch astronaut vital data:', err);
    }
  };

  useEffect(() => {
    if (selectedAstronaut && apiConnected) {
      loadAstronautData(selectedAstronaut.id);
    }
  }, [selectedAstronaut, apiConnected]);

  // LIVE mode periodic polling (every 4 seconds) to stream actual backend updates
  useEffect(() => {
    if (range !== 'LIVE' || !selectedAstronaut || !apiConnected) return;
    const interval = setInterval(() => {
      loadAstronautData(selectedAstronaut.id);
    }, 4000);
    return () => clearInterval(interval);
  }, [range, selectedAstronaut, apiConnected]);

  // Latest actual reading from PostgreSQL
  const latestReading = summary?.latest_reading;
  const cardStamp = latestReading?.recorded_at
    ? fmtDateTime(latestReading.recorded_at, settings.hour12)
    : 'Awaiting data';

  // ── Clinical Status Evaluations ──────────────────────────────────────────────
  const hrStatus: Status = useMemo(() => {
    const hr = latestReading?.heart_rate;
    if (hr == null) return 'normal';
    if (hr < 50 || hr > 120) return 'critical';
    if (hr < 60 || hr > 100) return 'warning';
    return 'normal';
  }, [latestReading?.heart_rate]);

  const hrvStatus: Status = useMemo(() => {
    const hrv = latestReading?.hrv;
    if (hrv == null) return 'normal';
    if (hrv < 20) return 'critical';
    if (hrv < 35) return 'warning';
    return 'normal';
  }, [latestReading?.hrv]);

  const spo2Status: Status = useMemo(() => {
    const s = latestReading?.spo2;
    if (s == null) return 'normal';
    if (s < 90) return 'critical';
    if (s < 95) return 'warning';
    return 'normal';
  }, [latestReading?.spo2]);

  const bpStatus: Status = useMemo(() => {
    const sys = latestReading?.systolic_bp;
    const dia = latestReading?.diastolic_bp;
    if (sys == null || dia == null) return 'normal';
    if (sys >= 160 || dia >= 100 || sys < 90 || dia < 60) return 'critical';
    if (sys >= 130 || dia >= 85 || sys < 100) return 'warning';
    return 'normal';
  }, [latestReading?.systolic_bp, latestReading?.diastolic_bp]);

  const tempStatus: Status = useMemo(() => {
    const t = latestReading?.body_temperature;
    if (t == null) return 'normal';
    if (t < 35.0 || t > 38.5) return 'critical';
    if (t < 36.2 || t > 37.5) return 'warning';
    return 'normal';
  }, [latestReading?.body_temperature]);

  const respStatus: Status = useMemo(() => {
    const r = latestReading?.respiratory_rate;
    if (r == null) return 'normal';
    if (r < 10 || r > 26) return 'critical';
    if (r < 12 || r > 20) return 'warning';
    return 'normal';
  }, [latestReading?.respiratory_rate]);

  // ── Historical Filtered Data ────────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];

    // Chronological order ascending (oldest to newest)
    const sorted = [...history].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    if (range === 'LIVE') {
      return sorted.slice(-25);
    }

    const now = Date.now();
    const rangeMs: Record<Exclude<Range, 'LIVE'>, number> = {
      '1H': 60 * 60 * 1000,
      '6H': 6 * 60 * 60 * 1000,
      '24H': 24 * 60 * 60 * 1000,
      '7D': 7 * 24 * 60 * 60 * 1000,
      '30D': 30 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - rangeMs[range];
    return sorted.filter((pt) => new Date(pt.recorded_at).getTime() >= cutoff);
  }, [history, range]);

  const chartData = useMemo(() => {
    return filteredHistory.map((pt) => {
      const d = new Date(pt.recorded_at);
      const isMultiDay = range === '7D' || range === '30D';
      const label = isMultiDay
        ? `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: settings.hour12 })}`
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: settings.hour12 });

      return {
        id: pt.id,
        time: pt.recorded_at,
        label,
        hr: pt.heart_rate,
        hrv: pt.hrv,
        spo2: pt.spo2,
        systolic: pt.systolic_bp,
        diastolic: pt.diastolic_bp,
        temp: pt.body_temperature != null ? toTemp(pt.body_temperature, settings.units) : null,
        resp: pt.respiratory_rate,
      };
    });
  }, [filteredHistory, range, settings.hour12, settings.units]);

  // ── Metric Configuration for the 6 Vital Metrics ─────────────────────────────
  const metricConfigs: Record<
    MetricType,
    { label: string; unit: string; dataKey: string; color: string; baseline: number }
  > = {
    hr: {
      label: 'Heart Rate',
      unit: 'BPM',
      dataKey: 'hr',
      color: C_PRIMARY,
      baseline: b.restingHr,
    },
    hrv: {
      label: 'HRV',
      unit: 'ms',
      dataKey: 'hrv',
      color: C_SECONDARY,
      baseline: b.hrv,
    },
    spo2: {
      label: 'Oxygen Saturation',
      unit: '%',
      dataKey: 'spo2',
      color: '#3A7FC1',
      baseline: b.spo2,
    },
    bp: {
      label: 'Blood Pressure',
      unit: 'mmHg',
      dataKey: 'systolic',
      color: C_PRIMARY,
      baseline: b.systolic,
    },
    temp: {
      label: 'Body Temperature',
      unit: tempUnit(settings.units),
      dataKey: 'temp',
      color: '#E8972D',
      baseline: toTemp(b.temp, settings.units),
    },
    resp: {
      label: 'Respiratory Rate',
      unit: '/min',
      dataKey: 'resp',
      color: '#2A9D8F',
      baseline: b.resp,
    },
  };

  const activeMetricCfg = metricConfigs[selectedMetric];

  // ── Record Vitals Submission ─────────────────────────────────────────────────
  const handleRecordVitals = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const astroId = Number(formAstronautId);
    if (!astroId || astroId <= 0) {
      setSubmitError('Please select a valid astronaut.');
      return;
    }

    const payload: VitalReadingCreate = {
      astronaut_id: astroId,
      heart_rate: formHr ? parseFloat(formHr) : null,
      hrv: formHrv ? parseFloat(formHrv) : null,
      spo2: formSpo2 ? parseFloat(formSpo2) : null,
      systolic_bp: formSystolic ? parseInt(formSystolic, 10) : null,
      diastolic_bp: formDiastolic ? parseInt(formDiastolic, 10) : null,
      body_temperature: formTemp ? parseFloat(formTemp) : null,
      respiratory_rate: formResp ? parseFloat(formResp) : null,
    };

    setIsSubmitting(true);
    try {
      await createVitalReading(payload);
      setSubmitSuccess('Vital reading recorded successfully! Alert evaluation complete.');

      // Refresh data immediately from backend
      await Promise.all([loadAstronautData(astroId), refreshAlerts()]);

      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      const errMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setSubmitError(errMsg || 'Failed to submit vital reading. Verify that the backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Abnormal Telemetry Table ─────────────────────────────────────────────────
  const tableRows: AbnormalTableRow[] = useMemo(() => {
    return astronautAlerts.map((a) => {
      const unit = mapMetricUnit(a.metric);
      return {
        id: `alert-${a.id}`,
        t: a.created_at,
        m: mapMetricLabel(a.metric),
        r: `${a.observed_value} ${unit}`,
        b: `Threshold ${a.threshold_value} ${unit}`,
        s: mapSeverity(a.severity),
        status: a.status ? a.status.toUpperCase() : 'OPEN',
      };
    });
  }, [astronautAlerts]);

  const displayedRows = showAllAlerts ? tableRows : tableRows.slice(0, 8);

  const cols: Column<AbnormalTableRow>[] = [
    {
      key: 't',
      header: 'Time',
      render: (r) => <span className="num text-muted font-mono">{fmtDateTime(r.t, settings.hour12)}</span>,
    },
    {
      key: 'm',
      header: 'Metric',
      render: (r) => <span className="text-ink font-semibold">{r.m}</span>,
    },
    {
      key: 'r',
      header: 'Observed Reading',
      render: (r) => <span className="num font-bold text-ink">{r.r}</span>,
    },
    {
      key: 'b',
      header: 'Alert Threshold',
      render: (r) => <span className="num text-muted">{r.b}</span>,
    },
    {
      key: 's',
      header: 'Severity',
      render: (r) => <HealthStatusBadge status={r.s} />,
    },
    {
      key: 'status',
      header: 'Triage Status',
      render: (r) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
            r.status === 'OPEN'
              ? 'bg-crit/10 text-crit border border-crit/20'
              : r.status === 'ACKNOWLEDGED'
              ? 'bg-warn/10 text-warn border border-warn/20'
              : 'bg-teal/10 text-teal-dark border border-teal/20'
          }`}
        >
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. Header and Controls ── */}
      <PageHeader
        title="VitalWatch"
        subtitle="Physiological telemetry compared with personal baselines and PostgreSQL clinical records."
      >
        {/* Record Vitals Button */}
        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setSubmitSuccess(null);
            setSubmitError(null);
          }}
          className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Record Vitals</span>
        </button>

        {/* Astronaut Selector */}
        {astronauts.length > 0 && (
          <select
            aria-label="Active Astronaut"
            className="input w-auto text-xs font-semibold"
            value={selectedAstronaut?.id ?? ''}
            onChange={(e) => {
              const found = astronauts.find((a) => a.id === Number(e.target.value));
              if (found) setSelectedAstronaut(found);
            }}
          >
            {astronauts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.astronaut_code} - {a.name}
              </option>
            ))}
          </select>
        )}
      </PageHeader>

      {/* Time Range Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeSelector value={range} onChange={setRange} />
        {summary && (
          <span className="text-xs text-muted font-mono">
            PostgreSQL: <strong className="text-ink font-semibold">{summary.total_readings}</strong> records for{' '}
            <span className="text-teal-dark font-semibold">{selectedAstronaut?.astronaut_code}</span>
          </span>
        )}
      </div>

      {/* ── 2. Current Vital Readings (6 Essential Metrics) ── */}
      <section aria-label="Current Vital Telemetry">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-base font-bold text-ink">Current Vital Readings</h2>
            <p className="text-xs text-muted">
              Latest physiological telemetry from PostgreSQL health database
            </p>
          </div>
          {latestReading?.recorded_at && (
            <span className="text-xs text-muted font-mono">
              Last packet: {fmtDateTime(latestReading.recorded_at, settings.hour12)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {/* Heart rate (BPM) */}
          <MetricCard
            label="Heart Rate"
            icon={HeartPulse}
            value={latestReading?.heart_rate != null ? Math.round(latestReading.heart_rate) : '—'}
            unit="BPM"
            status={hrStatus}
            baseline={`${b.restingHr} BPM`}
            footnote={cardStamp}
          />

          {/* Heart rate variability (HRV) */}
          <MetricCard
            label="Heart Rate Variability (HRV)"
            icon={Waves}
            value={latestReading?.hrv != null ? Math.round(latestReading.hrv) : '—'}
            unit="ms"
            status={hrvStatus}
            baseline={`${b.hrv} ms`}
            footnote={cardStamp}
          />

          {/* SpO₂ (%) */}
          <MetricCard
            label="Oxygen Saturation (SpO₂)"
            icon={Activity}
            value={latestReading?.spo2 != null ? Number(latestReading.spo2).toFixed(1) : '—'}
            unit="%"
            status={spo2Status}
            baseline={`${b.spo2} %`}
            footnote={cardStamp}
          />

          {/* Blood pressure (mmHg) */}
          <MetricCard
            label="Blood Pressure"
            icon={Droplets}
            value={
              latestReading?.systolic_bp != null && latestReading?.diastolic_bp != null
                ? `${latestReading.systolic_bp}/${latestReading.diastolic_bp}`
                : '—'
            }
            unit="mmHg"
            status={bpStatus}
            baseline={`${b.systolic}/${b.diastolic} mmHg`}
            footnote={cardStamp}
          />

          {/* Body temperature (°C / °F) */}
          <MetricCard
            label="Body Temperature"
            icon={Thermometer}
            value={
              latestReading?.body_temperature != null
                ? toTemp(latestReading.body_temperature, settings.units).toFixed(1)
                : '—'
            }
            unit={tempUnit(settings.units)}
            status={tempStatus}
            baseline={`${toTemp(b.temp, settings.units)} ${tempUnit(settings.units)}`}
            footnote={cardStamp}
          />

          {/* Respiratory rate (/min) */}
          <MetricCard
            label="Respiratory Rate"
            icon={Wind}
            value={latestReading?.respiratory_rate != null ? Math.round(latestReading.respiratory_rate) : '—'}
            unit="/min"
            status={respStatus}
            baseline={`${b.resp} /min`}
            footnote={cardStamp}
          />
        </div>
      </section>

      {/* ── 3. Historical Trends (All 6 Metrics) ── */}
      <section aria-label="Historical Telemetry Trends">
        <ChartCard
          title={`${activeMetricCfg.label} Telemetry Trend (${range})`}
          subtitle={`Historical observations from PostgreSQL vital_readings. Personal baseline is ${activeMetricCfg.baseline} ${activeMetricCfg.unit}.`}
          height={320}
          actions={
            <div role="group" aria-label="Select vital metric" className="flex flex-wrap gap-1.5">
              {(Object.keys(metricConfigs) as MetricType[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMetric(m)}
                  aria-pressed={selectedMetric === m}
                  className={`chip ${selectedMetric === m ? 'chip-on' : 'chip-off'}`}
                >
                  {metricConfigs[m].label}
                </button>
              ))}
            </div>
          }
        >
          {chartData.length === 0 ? (
            <EmptyState
              title={`No ${activeMetricCfg.label} Telemetry in Selected Window`}
              hint={`No readings recorded for the ${range} time filter. Try selecting 24H, 7D, or 30D, or record new vitals.`}
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={tick} stroke={grid} minTickGap={32} />
                <YAxis
                  tick={tick}
                  stroke={grid}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  unit={` ${activeMetricCfg.unit}`}
                />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#16324F', paddingTop: 8 }} />

                {selectedMetric === 'bp' ? (
                  <>
                    <ReferenceLine
                      y={b.systolic}
                      stroke="#16324F"
                      strokeDasharray="3 3"
                      label={{
                        value: `Target Systolic (${b.systolic} mmHg)`,
                        fill: '#16324F',
                        fontSize: 10,
                        position: 'insideTopLeft',
                      }}
                    />
                    <ReferenceLine
                      y={b.diastolic}
                      stroke="#2A9D8F"
                      strokeDasharray="3 3"
                      label={{
                        value: `Target Diastolic (${b.diastolic} mmHg)`,
                        fill: '#2A9D8F',
                        fontSize: 10,
                        position: 'insideBottomLeft',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      name="Systolic BP (mmHg)"
                      stroke="#16324F"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#16324F' }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      name="Diastolic BP (mmHg)"
                      stroke="#2A9D8F"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#2A9D8F' }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                  </>
                ) : (
                  <>
                    <ReferenceLine
                      y={activeMetricCfg.baseline}
                      stroke="#2A9D8F"
                      strokeDasharray="4 4"
                      label={{
                        value: `Baseline (${activeMetricCfg.baseline} ${activeMetricCfg.unit})`,
                        fill: '#2A9D8F',
                        fontSize: 10,
                        position: 'insideTopLeft',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={activeMetricCfg.dataKey}
                      name={`${activeMetricCfg.label} (${activeMetricCfg.unit})`}
                      stroke={activeMetricCfg.color}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: activeMetricCfg.color }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* ── 4. Abnormal Telemetry Log ── */}
      <section className="card p-5" aria-label="Abnormal telemetry log">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink">Abnormal Telemetry Log</h2>
            <p className="text-xs text-muted">
              Clinical threshold exceedances logged by the automated triage engine
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted">
              {astronautAlerts.length} alert(s) in database
            </span>
            {tableRows.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllAlerts((v) => !v)}
                className="btn-ghost text-xs px-2.5 py-1 border border-line"
              >
                {showAllAlerts ? 'Show Less' : `View All (${tableRows.length})`}
              </button>
            )}
          </div>
        </div>

        {tableRows.length === 0 ? (
          <EmptyState
            title="No Abnormal Telemetry"
            hint="All recorded physiological vitals for this astronaut are within nominal flight safety thresholds."
          />
        ) : (
          <DataTable columns={cols} rows={displayedRows} />
        )}
      </section>

      {/* ── 5. Dedicated Clinical Flight Notes Section ── */}
      <section className="card p-5" aria-label="Clinical flight notes">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Clinical Flight Notes &amp; Observations
            </h2>
            <p className="text-xs text-muted">
              Document subjective physiological symptoms, EVA exertion, or crew adaptation
            </p>
          </div>
          <span className="text-xs font-mono text-muted">{notes.length} note(s) recorded</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Notes list */}
          <div className="lg:col-span-2">
            <ul className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <EmptyState
                  title="No Flight Notes Recorded"
                  hint="Log clinical symptoms or exertion notes using the form."
                />
              ) : (
                notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg bg-offwhite border border-line/60 p-3 text-sm group hover:border-line transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-body text-xs leading-relaxed flex-1">{n.text}</p>
                      <button
                        type="button"
                        onClick={() => deleteNote(n.id)}
                        className="text-muted/40 hover:text-crit p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete note"
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="num mt-1.5 text-[11px] text-muted">
                      {fmtDateTime(n.time, settings.hour12)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Note submission form */}
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                addNote(draft);
                setDraft('');
              }}
              className="space-y-3"
            >
              <label htmlFor="note-input" className="block text-xs font-semibold text-ink">
                Add Clinical Note
              </label>
              <textarea
                id="note-input"
                className="input min-h-[96px] resize-none text-xs w-full"
                placeholder="Log physical symptoms, EVA exertion, or adaptation notes…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="btn-primary w-full text-xs font-semibold disabled:opacity-50"
              >
                Save Flight Note
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── 6. Record Vitals Modal Dialog ── */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-vitals-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div className="card w-full max-w-lg p-6 shadow-card-lg relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div>
                <h2 id="record-vitals-title" className="font-display text-base font-bold text-ink">
                  Record Astronaut Vital Reading
                </h2>
                <p className="text-xs text-muted">
                  Submits reading to PostgreSQL and triggers automated triage evaluation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-muted hover:text-ink hover:bg-offwhite"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-teal/10 border border-teal/30 p-3 text-xs text-teal-dark font-medium">
                <CheckCircle className="h-4 w-4 text-teal shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {submitError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-crit/10 border border-crit/30 p-3 text-xs text-crit font-medium">
                <AlertCircle className="h-4 w-4 text-crit shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleRecordVitals} className="space-y-4">
              {/* Astronaut Selection */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1" htmlFor="modal-astro">
                  Subject Astronaut *
                </label>
                <select
                  id="modal-astro"
                  className="input w-full text-xs"
                  value={formAstronautId}
                  onChange={(e) => setFormAstronautId(Number(e.target.value))}
                  required
                >
                  {astronauts.length > 0 ? (
                    astronauts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.astronaut_code} — {a.name} (Mission: {a.mission_id || 'N/A'})
                      </option>
                    ))
                  ) : (
                    <option value={1}>AST-001 (Default)</option>
                  )}
                </select>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-ink font-semibold mb-1" htmlFor="modal-hr">
                    Heart Rate (BPM)
                  </label>
                  <input
                    id="modal-hr"
                    type="number"
                    step="any"
                    min="1"
                    max="300"
                    placeholder="e.g. 75"
                    className="input w-full"
                    value={formHr}
                    onChange={(e) => setFormHr(e.target.value)}
                  />
                  <span className="text-[11px] text-muted mt-0.5 block">Alert if &lt;50 or &gt;120</span>
                </div>

                <div>
                  <label className="block text-ink font-semibold mb-1" htmlFor="modal-spo2">
                    SpO₂ Saturation (%)
                  </label>
                  <input
                    id="modal-spo2"
                    type="number"
                    step="any"
                    min="1"
                    max="100"
                    placeholder="e.g. 98"
                    className="input w-full"
                    value={formSpo2}
                    onChange={(e) => setFormSpo2(e.target.value)}
                  />
                  <span className="text-[11px] text-muted mt-0.5 block">Alert if &lt;90%</span>
                </div>

                <div>
                  <label className="block text-ink font-semibold mb-1" htmlFor="modal-hrv">
                    HRV rMSSD (ms)
                  </label>
                  <input
                    id="modal-hrv"
                    type="number"
                    step="any"
                    min="0"
                    max="500"
                    placeholder="e.g. 65"
                    className="input w-full"
                    value={formHrv}
                    onChange={(e) => setFormHrv(e.target.value)}
                  />
                  <span className="text-[11px] text-muted mt-0.5 block">Autonomic buffer</span>
                </div>

                <div>
                  <label className="block text-ink font-semibold mb-1" htmlFor="modal-temp">
                    Body Temp (°C)
                  </label>
                  <input
                    id="modal-temp"
                    type="number"
                    step="0.1"
                    min="25"
                    max="45"
                    placeholder="e.g. 36.8"
                    className="input w-full"
                    value={formTemp}
                    onChange={(e) => setFormTemp(e.target.value)}
                  />
                  <span className="text-[11px] text-muted mt-0.5 block">Alert if &lt;35° or &gt;38°</span>
                </div>

                <div>
                  <label className="block text-ink font-semibold mb-1" htmlFor="modal-systolic">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    id="modal-systolic"
                    type="number"
                    min="1"
                    max="300"
                    placeholder="e.g. 120"
                    className="input w-full"
                    value={formSystolic}
                    onChange={(e) => setFormSystolic(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-ink font-semibold mb-1" htmlFor="modal-diastolic">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    id="modal-diastolic"
                    type="number"
                    min="1"
                    max="200"
                    placeholder="e.g. 80"
                    className="input w-full"
                    value={formDiastolic}
                    onChange={(e) => setFormDiastolic(e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-ink font-semibold mb-1" htmlFor="modal-resp">
                    Respiratory Rate (/min)
                  </label>
                  <input
                    id="modal-resp"
                    type="number"
                    step="any"
                    min="1"
                    max="100"
                    placeholder="e.g. 16"
                    className="input w-full"
                    value={formResp}
                    onChange={(e) => setFormResp(e.target.value)}
                  />
                  <span className="text-[11px] text-muted mt-0.5 block">Alert if &lt;10 or &gt;25</span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="rounded-lg bg-offwhite p-3 text-[11px] text-muted border border-line">
                <p className="font-semibold text-ink mb-0.5">Automated Alert Rules:</p>
                <p>
                  Readings trigger HIGH severity alerts for Heart Rate (&lt;50 or &gt;120 BPM) and SpO₂ (&lt;90%), and MEDIUM severity for Temperature (&lt;35.0 or &gt;38.0°C) and Respiratory Rate (&lt;10 or &gt;25 /min).
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ghost text-xs px-3.5 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Commit Reading'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
