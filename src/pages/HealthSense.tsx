import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Droplets,
  HeartPulse,
  Sparkles,
  Thermometer,
  Waves,
  Wind,
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
import BaselineComparison from '../components/common/BaselineComparison';
import ChartCard from '../components/common/ChartCard';
import EmptyState from '../components/common/EmptyState';
import HealthStatusBadge, { STATUS_STYLE } from '../components/common/HealthStatusBadge';
import PageHeader from '../components/common/PageHeader';
import { useApp } from '../context/AppContext';
import { getAstronautVitalHistory, getAstronautVitalSummary } from '../services/vitalService';
import type { Status, VitalReading, VitalSummaryResponse } from '../types';
import { cx, fmtDateTime, tempUnit, toTemp } from '../utils';
import { C_PRIMARY, C_SECONDARY, grid, tick, tooltipProps } from '../utils/chart';

type MetricKey = 'hr' | 'hrv' | 'spo2' | 'bp' | 'temp' | 'resp';

interface DeviationItem {
  id: MetricKey;
  label: string;
  icon: typeof HeartPulse;
  observedDisplay: string;
  observedNum: number | null;
  baselineDisplay: string;
  baselineNum: number;
  unit: string;
  alertThreshold: string;
  status: Status;
  pct: number | null;
  recordedAt: string | null;
  why: string;
  explanation: string;
  checks: string[];
  historicalStats: { avg: number; min: number; max: number; count: number } | null;
}

export default function HealthSense() {
  const {
    baselines: b,
    settings,
    astronauts,
    selectedAstronaut,
    setSelectedAstronaut,
    apiConnected,
  } = useApp();

  const [summary, setSummary] = useState<VitalSummaryResponse | null>(null);
  const [history, setHistory] = useState<VitalReading[]>([]);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [selectedChartMetric, setSelectedChartMetric] = useState<MetricKey>('hr');
  const [showNominal, setShowNominal] = useState<boolean>(false);

  // Fetch real PostgreSQL vital data for active astronaut
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!selectedAstronaut || !apiConnected) return;
      try {
        const [sum, hist] = await Promise.all([
          getAstronautVitalSummary(selectedAstronaut.id),
          getAstronautVitalHistory(selectedAstronaut.id, { limit: 100 }),
        ]);
        if (!cancelled) {
          setSummary(sum);
          setHistory(hist);
        }
      } catch (err) {
        console.warn('Could not load vital data for HealthSense AI:', err);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [selectedAstronaut, apiConnected]);

  const latest = summary?.latest_reading;

  // Helper to calculate actual historical stats from PostgreSQL
  const getHistoryStats = (key: keyof VitalReading) => {
    const vals = history
      .map((h) => h[key])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (vals.length === 0) return null;
    const avg = vals.reduce((acc, curr) => acc + curr, 0) / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { avg, min, max, count: vals.length };
  };

  // ── Build Monitored Metrics with Explainable Rationale ────────────────────────
  const monitoredMetrics: DeviationItem[] = useMemo(() => {
    const recordedAt = latest?.recorded_at || null;

    // 1. Heart Rate
    const hrVal = latest?.heart_rate ?? null;
    let hrStatus: Status = 'normal';
    if (hrVal != null) {
      if (hrVal < 50 || hrVal > 120) hrStatus = 'critical';
      else if (hrVal < 60 || hrVal > 100) hrStatus = 'warning';
    }
    const hrPct = hrVal != null ? ((hrVal - b.restingHr) / b.restingHr) * 100 : null;

    // 2. HRV
    const hrvVal = latest?.hrv ?? null;
    let hrvStatus: Status = 'normal';
    if (hrvVal != null) {
      if (hrvVal < 20) hrvStatus = 'critical';
      else if (hrvVal < 35) hrvStatus = 'warning';
    }
    const hrvPct = hrvVal != null ? ((hrvVal - b.hrv) / b.hrv) * 100 : null;

    // 3. SpO2
    const spo2Val = latest?.spo2 ?? null;
    let spo2Status: Status = 'normal';
    if (spo2Val != null) {
      if (spo2Val < 90) spo2Status = 'critical';
      else if (spo2Val < 95) spo2Status = 'warning';
    }
    const spo2Pct = spo2Val != null ? ((spo2Val - b.spo2) / b.spo2) * 100 : null;

    // 4. Blood Pressure
    const sysVal = latest?.systolic_bp ?? null;
    const diaVal = latest?.diastolic_bp ?? null;
    let bpStatus: Status = 'normal';
    if (sysVal != null && diaVal != null) {
      if (sysVal >= 160 || diaVal >= 100 || sysVal < 90 || diaVal < 60) bpStatus = 'critical';
      else if (sysVal >= 140 || diaVal >= 90 || sysVal < 100) bpStatus = 'warning';
    }
    const bpPct = sysVal != null ? ((sysVal - b.systolic) / b.systolic) * 100 : null;

    // 5. Body Temperature
    const tempVal = latest?.body_temperature ?? null;
    let tempStatus: Status = 'normal';
    if (tempVal != null) {
      if (tempVal < 35.0 || tempVal > 38.0) tempStatus = 'critical';
      else if (tempVal < 36.2 || tempVal > 37.5) tempStatus = 'warning';
    }
    const tempDisplayVal = tempVal != null ? toTemp(tempVal, settings.units) : null;
    const tempBaseDisplay = toTemp(b.temp, settings.units);
    const tempPct = tempDisplayVal != null ? ((tempDisplayVal - tempBaseDisplay) / tempBaseDisplay) * 100 : null;

    // 6. Respiratory Rate
    const respVal = latest?.respiratory_rate ?? null;
    let respStatus: Status = 'normal';
    if (respVal != null) {
      if (respVal < 10 || respVal > 25) respStatus = 'critical';
      else if (respVal < 12 || respVal > 20) respStatus = 'warning';
    }
    const respPct = respVal != null ? ((respVal - b.resp) / b.resp) * 100 : null;

    return [
      {
        id: 'hr',
        label: 'Heart Rate',
        icon: HeartPulse,
        observedDisplay: hrVal != null ? `${Math.round(hrVal)}` : '—',
        observedNum: hrVal,
        baselineDisplay: `${b.restingHr} BPM`,
        baselineNum: b.restingHr,
        unit: 'BPM',
        alertThreshold: '< 50 or > 120 BPM',
        status: hrStatus,
        pct: hrPct,
        recordedAt,
        why: hrVal != null
          ? hrVal > 120
            ? `Observed rate of ${Math.round(hrVal)} BPM exceeds the critical tachycardia threshold (> 120 BPM).`
            : hrVal < 50
            ? `Observed rate of ${Math.round(hrVal)} BPM is below the critical bradycardia threshold (< 50 BPM).`
            : hrStatus === 'warning'
            ? `Rate of ${Math.round(hrVal)} BPM deviates from personal resting baseline (${b.restingHr} BPM).`
            : 'Heart rate is within nominal operational boundaries.'
          : 'Awaiting telemetry packet.',
        explanation: 'Resting heart rate reflects autonomic regulation and cardiovascular tone. In microgravity, cephalad fluid shifts, spaceflight deconditioning, physical workload, or cabin atmospheric changes can influence resting cardiovascular tone.',
        checks: [
          'Perform a 10-minute resting recalibration in a calm seated position.',
          'Cross-reference with recent EVA physical workload and sleep recovery in MindSpace.',
          'Verify telemetry sensor placement and skin contact.',
        ],
        historicalStats: getHistoryStats('heart_rate'),
      },
      {
        id: 'hrv',
        label: 'Heart Rate Variability (HRV)',
        icon: Waves,
        observedDisplay: hrvVal != null ? `${Math.round(hrvVal)}` : '—',
        observedNum: hrvVal,
        baselineDisplay: `${b.hrv} ms`,
        baselineNum: b.hrv,
        unit: 'ms',
        alertThreshold: '< 20 ms',
        status: hrvStatus,
        pct: hrvPct,
        recordedAt,
        why: hrvVal != null
          ? hrvVal < 20
            ? `HRV rMSSD of ${Math.round(hrvVal)} ms is below the acute fatigue alert threshold (< 20 ms).`
            : hrvStatus === 'warning'
            ? `HRV rMSSD of ${Math.round(hrvVal)} ms indicates diminished parasympathetic tone relative to baseline (${b.hrv} ms).`
            : 'HRV is within nominal parasympathetic baseline limits.'
          : 'Awaiting telemetry packet.',
        explanation: 'Heart rate variability (RMSSD) reflects parasympathetic vagal regulation. Sustained downward variance is an established early physiological biomarker of cumulative physical fatigue, circadian disruption, or autonomic stress.',
        checks: [
          'Examine multi-sol longitudinal HRV baseline drift.',
          'Correlate with subjective fatigue ratings and sleep architecture in MindSpace.',
          'Recommend a scheduled restorative rest period or decompression protocol.',
        ],
        historicalStats: getHistoryStats('hrv'),
      },
      {
        id: 'spo2',
        label: 'Oxygen Saturation (SpO₂)',
        icon: Activity,
        observedDisplay: spo2Val != null ? `${spo2Val.toFixed(1)}` : '—',
        observedNum: spo2Val,
        baselineDisplay: `${b.spo2} %`,
        baselineNum: b.spo2,
        unit: '%',
        alertThreshold: '< 90 %',
        status: spo2Status,
        pct: spo2Pct,
        recordedAt,
        why: spo2Val != null
          ? spo2Val < 90
            ? `Oxygen saturation of ${spo2Val.toFixed(1)}% is below the clinical hypoxia threshold (< 90%).`
            : spo2Status === 'warning'
            ? `Oxygen saturation of ${spo2Val.toFixed(1)}% is mildly reduced relative to personal target (${b.spo2}%).`
            : 'Oxygen saturation is stable and within expected clinical limits.'
          : 'Awaiting telemetry packet.',
        explanation: 'Pulse oximetry measures arterial hemoglobin oxygen saturation. In closed habitats, reduced readings may stem from sensor misplacement, peripheral vasoconstriction, or variations in ambient cabin O₂/CO₂ partial pressure.',
        checks: [
          'Inspect pulse oximeter probe alignment and signal perfusion index.',
          'Verify habitat atmospheric O₂ and CO₂ scrubber telemetry on SpaceGuard.',
          'Obtain a secondary manual pulse oximetry confirmation reading.',
        ],
        historicalStats: getHistoryStats('spo2'),
      },
      {
        id: 'bp',
        label: 'Blood Pressure',
        icon: Droplets,
        observedDisplay: sysVal != null && diaVal != null ? `${sysVal}/${diaVal}` : '—',
        observedNum: sysVal,
        baselineDisplay: `${b.systolic}/${b.diastolic} mmHg`,
        baselineNum: b.systolic,
        unit: 'mmHg',
        alertThreshold: 'Systolic > 140 or Diastolic > 90 mmHg',
        status: bpStatus,
        pct: bpPct,
        recordedAt,
        why: sysVal != null && diaVal != null
          ? bpStatus === 'critical'
            ? `Blood pressure of ${sysVal}/${diaVal} mmHg exceeds critical triage boundaries.`
            : bpStatus === 'warning'
            ? `Blood pressure of ${sysVal}/${diaVal} mmHg deviates from resting target baseline (${b.systolic}/${b.diastolic} mmHg).`
            : 'Arterial blood pressure is within nominal homeostatic limits.'
          : 'Awaiting telemetry packet.',
        explanation: 'Microgravity induces cephalad fluid redistribution that alters baroreceptor set points and central venous pressure. Serial blood pressure observations provide clinical context for systemic vascular adaptation.',
        checks: [
          'Ensure subject is rested and seated for duplicate measurement.',
          'Confirm telemetry cuff sizing and proper upper-arm placement.',
          'Review 24-hour diurnal arterial pressure trend.',
        ],
        historicalStats: getHistoryStats('systolic_bp'),
      },
      {
        id: 'temp',
        label: 'Body Temperature',
        icon: Thermometer,
        observedDisplay: tempDisplayVal != null ? `${tempDisplayVal.toFixed(1)}` : '—',
        observedNum: tempDisplayVal,
        baselineDisplay: `${tempBaseDisplay} ${tempUnit(settings.units)}`,
        baselineNum: tempBaseDisplay,
        unit: tempUnit(settings.units),
        alertThreshold: '< 35.0 °C or > 38.0 °C',
        status: tempStatus,
        pct: tempPct,
        recordedAt,
        why: tempVal != null
          ? tempStatus === 'critical'
            ? `Core temperature of ${tempDisplayVal?.toFixed(1)} ${tempUnit(settings.units)} represents an acute thermal deviation.`
            : tempStatus === 'warning'
            ? `Core temperature of ${tempDisplayVal?.toFixed(1)} ${tempUnit(settings.units)} deviates from calibrated circadian baseline.`
            : 'Core temperature is stable and within expected circadian limits.'
          : 'Awaiting telemetry packet.',
        explanation: 'Core thermoregulation is tightly coupled with circadian pacing. Temperature fluctuations beyond baseline can indicate metabolic exertion, thermal suit retention during EVA, or an immune inflammatory response.',
        checks: [
          'Verify cabin environmental temperature and crew quarters ventilation.',
          'Rule out post-exercise thermogenesis or EVA thermal suit heat retention.',
          'Repeat measurement using secondary core sensor.',
        ],
        historicalStats: getHistoryStats('body_temperature'),
      },
      {
        id: 'resp',
        label: 'Respiratory Rate',
        icon: Wind,
        observedDisplay: respVal != null ? `${Math.round(respVal)}` : '—',
        observedNum: respVal,
        baselineDisplay: `${b.resp} /min`,
        baselineNum: b.resp,
        unit: '/min',
        alertThreshold: '< 10 or > 25 /min',
        status: respStatus,
        pct: respPct,
        recordedAt,
        why: respVal != null
          ? respVal > 25
            ? `Respiratory rate of ${Math.round(respVal)} /min exceeds the tachypnea alert threshold (> 25 /min).`
            : respVal < 10
            ? `Respiratory rate of ${Math.round(respVal)} /min is below the bradypnea threshold (< 10 /min).`
            : respStatus === 'warning'
            ? `Respiratory rate of ${Math.round(respVal)} /min deviates from resting baseline (${b.resp} /min).`
            : 'Ventilation rate is stable and nominal.'
          : 'Awaiting telemetry packet.',
        explanation: 'Ventilation frequency reflects metabolic gas exchange and acid-base homeostasis. Elevated rates in closed habitats may reflect physical exertion recovery or compensatory response to mild ambient CO₂ accumulation.',
        checks: [
          'Cross-check ambient cabin CO₂ concentration on SpaceGuard.',
          'Re-evaluate ventilation frequency during resting seated protocol.',
          'Assess for subjective symptoms of dyspnea or air hunger.',
        ],
        historicalStats: getHistoryStats('respiratory_rate'),
      },
    ];
  }, [latest, b, settings]);

  // Separate detected deviations from nominal metrics
  const detectedDeviations = useMemo(
    () => monitoredMetrics.filter((m) => m.status !== 'normal'),
    [monitoredMetrics]
  );
  const nominalMetrics = useMemo(
    () => monitoredMetrics.filter((m) => m.status === 'normal'),
    [monitoredMetrics]
  );

  // Auto-open the first deviation if none is opened
  useEffect(() => {
    if (detectedDeviations.length > 0 && !openItem) {
      setOpenItem(detectedDeviations[0].id);
    }
  }, [detectedDeviations, openItem]);

  // ── Health Overview Counts & Status ──────────────────────────────────────────
  const criticalCount = detectedDeviations.filter((d) => d.status === 'critical').length;
  const warningCount = detectedDeviations.filter((d) => d.status === 'warning').length;

  const overallStatus: Status = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'normal';
  const overallStatusLabel = criticalCount > 0 ? 'Action Required' : warningCount > 0 ? 'Review Required' : 'All Nominal';
  const overallStatusColor = criticalCount > 0 ? 'text-crit' : warningCount > 0 ? 'text-warn' : 'text-teal-dark';
  const overallStatusDesc = criticalCount > 0
    ? `${criticalCount} critical physiological deviation(s) detected`
    : warningCount > 0
    ? `${warningCount} physiological metric(s) requiring review`
    : 'All monitored physiological streams within baseline boundaries';

  // ── Historical Chart Data (Real PostgreSQL Records) ──────────────────────────
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history]
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map((pt) => {
        const d = new Date(pt.recorded_at);
        return {
          id: pt.id,
          time: pt.recorded_at,
          label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: settings.hour12 }),
          fullDate: fmtDateTime(pt.recorded_at, settings.hour12),
          hr: pt.heart_rate,
          hrv: pt.hrv,
          spo2: pt.spo2,
          systolic: pt.systolic_bp,
          diastolic: pt.diastolic_bp,
          temp: pt.body_temperature != null ? toTemp(pt.body_temperature, settings.units) : null,
          resp: pt.respiratory_rate,
        };
      });
  }, [history, settings]);

  const metricConfigs: Record<
    MetricKey,
    { label: string; unit: string; dataKey: string; color: string; baseline: number }
  > = {
    hr: { label: 'Heart Rate', unit: 'BPM', dataKey: 'hr', color: C_PRIMARY, baseline: b.restingHr },
    hrv: { label: 'HRV', unit: 'ms', dataKey: 'hrv', color: C_SECONDARY, baseline: b.hrv },
    spo2: { label: 'Oxygen Saturation', unit: '%', dataKey: 'spo2', color: '#3A7FC1', baseline: b.spo2 },
    bp: { label: 'Blood Pressure', unit: 'mmHg', dataKey: 'systolic', color: C_PRIMARY, baseline: b.systolic },
    temp: { label: 'Body Temperature', unit: tempUnit(settings.units), dataKey: 'temp', color: '#E8972D', baseline: toTemp(b.temp, settings.units) },
    resp: { label: 'Respiratory Rate', unit: '/min', dataKey: 'resp', color: '#2A9D8F', baseline: b.resp },
  };

  const activeChartMetric = metricConfigs[selectedChartMetric];

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header ── */}
      <PageHeader
        title="HealthSense AI"
        subtitle="Explainable analysis of astronaut physiological readings."
      >
        {/* Backend Connection Status */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border ${
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
          {apiConnected ? 'Backend Connected' : 'Offline'}
        </span>

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

        {/* Badge: Explainable Health Insights */}
        <span className="inline-flex items-center gap-1.5 rounded-md border border-teal/30 bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal-dark">
          <Sparkles className="h-3.5 w-3.5 text-teal" aria-hidden />
          Explainable Health Insights
        </span>
      </PageHeader>

      {/* ── 2. Health Overview (Display ONLY 3 Cards) ── */}
      <section aria-label="Health Overview Summary">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Monitored Metrics Count */}
          <div className="card p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Metrics Monitored
            </span>
            <div className="my-1">
              <p className="num text-2xl font-bold text-ink">{monitoredMetrics.length}</p>
              <p className="text-xs text-muted mt-0.5">HR, HRV, SpO₂, BP, Temp, Resp</p>
            </div>
          </div>

          {/* Card 2: Detected Deviations Count */}
          <div className="card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Detected Deviations
              </span>
              <AlertTriangle className={`h-4 w-4 ${detectedDeviations.length > 0 ? 'text-warn' : 'text-teal'}`} />
            </div>
            <div className="my-1">
              <p className="num text-2xl font-bold text-ink">{detectedDeviations.length}</p>
              <p className="text-xs text-muted mt-0.5">
                {detectedDeviations.length === 0
                  ? 'All metrics within nominal range'
                  : `${detectedDeviations.length} physiological stream(s) flagged`}
              </p>
            </div>
          </div>

          {/* Card 3: Overall Monitoring Status */}
          <div className="card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Monitoring Status
              </span>
              <HealthStatusBadge status={overallStatus} />
            </div>
            <div className="my-1">
              <p className={`font-display text-2xl font-bold ${overallStatusColor}`}>
                {overallStatusLabel}
              </p>
              <p className="text-xs text-muted mt-0.5 truncate">{overallStatusDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Detected Physiological Deviations (Primary Section) ── */}
      <section aria-label="Detected Physiological Deviations" className="card p-5 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Detected Physiological Deviations
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Explainable analysis of physiological anomalies comparing latest telemetry with individual baselines and alert thresholds.
            </p>
          </div>
          <span className="text-xs font-mono text-muted">
            {detectedDeviations.length} active deviation(s)
          </span>
        </header>

        {detectedDeviations.length === 0 ? (
          <EmptyState
            title="No Physiological Deviations Detected"
            hint="All 6 monitored physiological parameters are currently within normal baseline thresholds."
            variant="alerts"
          />
        ) : (
          <ul className="space-y-3">
            {detectedDeviations.map((item) => {
              const isOpen = openItem === item.id;
              const s = STATUS_STYLE[item.status];
              const Icon = item.icon;

              return (
                <li
                  key={item.id}
                  className={cx(
                    'rounded-xl border transition-all duration-150 overflow-hidden',
                    isOpen ? 'border-border-strong bg-offwhite/50 shadow-sm' : 'border-border hover:bg-offwhite/30',
                    'border-l-4 ' + s.borderL
                  )}
                >
                  {/* Expandable Header */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
                    aria-expanded={isOpen}
                    onClick={() => setOpenItem(isOpen ? null : item.id)}
                  >
                    <div className={cx('p-2 rounded-lg shrink-0', s.badge)}>
                      <Icon className={cx('h-4 w-4', s.text)} aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-ink">{item.label}</p>
                        <span className="text-xs text-muted">·</span>
                        <span className="num text-xs font-semibold text-ink">
                          Observed: {item.observedDisplay} {item.unit}
                        </span>
                        <span className="text-xs text-muted">·</span>
                        <span className="text-xs text-muted">
                          Baseline: {item.baselineDisplay}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted mt-0.5">
                        <span>Threshold: <strong className="text-body font-mono font-medium">{item.alertThreshold}</strong></span>
                        {item.recordedAt && (
                          <>
                            <span>·</span>
                            <span>{fmtDateTime(item.recordedAt, settings.hour12)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {item.pct != null && (
                      <span className={cx('num text-xs font-bold mr-1', s.text)}>
                        {item.pct >= 0 ? '+' : ''}{item.pct.toFixed(1)}%
                      </span>
                    )}

                    <HealthStatusBadge status={item.status} />

                    <ChevronDown
                      className={cx('h-4 w-4 text-muted transition-transform duration-200', isOpen && 'rotate-180')}
                      aria-hidden
                    />
                  </button>

                  {/* Expanded Detail View */}
                  {isOpen && (
                    <div className="space-y-4 border-t border-line/60 px-5 py-4 text-xs bg-white animate-fadeIn">
                      {/* Reason Flagged */}
                      <div className="rounded-lg bg-crit/[0.03] border border-crit/20 p-3">
                        <p className="font-semibold text-crit mb-0.5">Flagged Reason:</p>
                        <p className="text-body leading-relaxed">{item.why}</p>
                      </div>

                      {/* Historical Baseline & Population Comparison */}
                      <div>
                        <p className="font-semibold text-ink mb-1.5">Baseline Comparison:</p>
                        {item.observedNum != null && (
                          <BaselineComparison
                            label={item.label}
                            current={item.observedNum}
                            baseline={item.baselineNum}
                            unit={item.unit}
                          />
                        )}
                        {item.historicalStats && (
                          <p className="num text-[11px] text-muted mt-2 font-mono">
                            Historical Average: <strong className="text-ink">{item.historicalStats.avg.toFixed(1)} {item.unit}</strong>{' '}
                            (Range: {item.historicalStats.min.toFixed(1)} – {item.historicalStats.max.toFixed(1)} {item.unit} across {item.historicalStats.count} readings)
                          </p>
                        )}
                      </div>

                      {/* Evidence-Based Explanation */}
                      <div className="rounded-lg bg-offwhite border border-line p-3">
                        <p className="font-semibold text-ink mb-1">Evidence-Based Physiological Context:</p>
                        <p className="text-body leading-relaxed">{item.explanation}</p>
                      </div>

                      {/* Action Protocols */}
                      <div>
                        <p className="font-semibold text-ink mb-1.5">Suggested Flight Medical Checks &amp; Actions:</p>
                        <ul className="space-y-1 text-muted">
                          {item.checks.map((check) => (
                            <li key={check} className="flex items-start gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-teal mt-0.5 shrink-0" aria-hidden />
                              <span className="text-body">{check}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Optional Toggle to inspect Nominal Streams */}
        {nominalMetrics.length > 0 && (
          <div className="pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setShowNominal((v) => !v)}
              className="text-xs font-semibold text-teal hover:text-teal-dark flex items-center gap-1.5 transition-colors"
            >
              <span>{showNominal ? 'Hide' : 'Inspect'} Nominal Telemetry Streams ({nominalMetrics.length})</span>
              <ChevronDown className={cx('h-3.5 w-3.5 transition-transform duration-200', showNominal && 'rotate-180')} />
            </button>

            {showNominal && (
              <ul className="mt-3 space-y-2">
                {nominalMetrics.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-line bg-offwhite/40 p-3 text-xs flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-teal" />
                      <span className="font-semibold text-ink">{item.label}</span>
                      <span className="num text-muted">
                        {item.observedDisplay} {item.unit}
                      </span>
                      <span className="text-muted font-mono">(Baseline: {item.baselineDisplay})</span>
                    </div>
                    <HealthStatusBadge status="normal" label="Nominal" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ── 4. Historical Trends (Compact Chart Section) ── */}
      <section aria-label="Historical Telemetry Trends">
        <ChartCard
          title="Historical Physiological Telemetry"
          subtitle={`Telemetry trend from PostgreSQL database. Calibrated baseline: ${activeChartMetric.baseline} ${activeChartMetric.unit}.`}
          height={260}
          actions={
            <div role="group" aria-label="Select vital metric" className="flex flex-wrap gap-1.5">
              {(Object.keys(metricConfigs) as MetricKey[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedChartMetric(m)}
                  aria-pressed={selectedChartMetric === m}
                  className={`chip ${selectedChartMetric === m ? 'chip-on' : 'chip-off'}`}
                >
                  {metricConfigs[m].label}
                </button>
              ))}
            </div>
          }
        >
          {chartData.length === 0 ? (
            <EmptyState
              title="Insufficient Historical Telemetry Data"
              hint="Historical trends will be graphed as vital telemetry records are logged in PostgreSQL."
              variant="data"
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={tick} stroke={grid} minTickGap={32} />
                <YAxis
                  tick={tick}
                  stroke={grid}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  unit={` ${activeChartMetric.unit}`}
                />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#16324F', paddingTop: 6 }} />

                {selectedChartMetric === 'bp' ? (
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
                      dot={{ r: 3.5, fill: '#16324F' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      name="Diastolic BP (mmHg)"
                      stroke="#2A9D8F"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#2A9D8F' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </>
                ) : (
                  <>
                    <ReferenceLine
                      y={activeChartMetric.baseline}
                      stroke="#2A9D8F"
                      strokeDasharray="4 4"
                      label={{
                        value: `Baseline (${activeChartMetric.baseline} ${activeChartMetric.unit})`,
                        fill: '#2A9D8F',
                        fontSize: 10,
                        position: 'insideTopLeft',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={activeChartMetric.dataKey}
                      name={`${activeChartMetric.label} (${activeChartMetric.unit})`}
                      stroke={activeChartMetric.color}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: activeChartMetric.color }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>
    </div>
  );
}
