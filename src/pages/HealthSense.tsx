import { useMemo, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import BaselineComparison from '../components/common/BaselineComparison';
import ChartCard from '../components/common/ChartCard';
import DemoNotice from '../components/common/DemoNotice';
import HealthStatusBadge, { STATUS_STYLE } from '../components/common/HealthStatusBadge';
import PageHeader from '../components/common/PageHeader';
import TelemetryChart from '../components/common/TelemetryChart';
import { useApp } from '../context/AppContext';
import { currentVitals as v, vitalSeries } from '../data/mockData';
import type { Status } from '../types';
import { RANK, cx, deviation, deviationStatus } from '../utils';
import { C_PRIMARY, C_SECONDARY } from '../utils/chart';

const level = (pct: number): { label: string; status: Status } => {
  const a = Math.abs(pct);
  return a < 8 ? { label: 'Low', status: 'normal' } : a < 20 ? { label: 'Moderate', status: 'info' } : a < 35 ? { label: 'Elevated', status: 'warning' } : { label: 'High', status: 'critical' };
};

export default function HealthSense() {
  const { baselines: b } = useApp();
  const [open, setOpen] = useState<string | null>('hr');
  const series = useMemo(() => vitalSeries('7D'), []);

  const rows = [
    { id: 'hr', label: 'Resting heart rate', cur: v.hr, base: b.restingHr, unit: 'BPM', dec: 0,
      why: 'Resting heart rate is a sensitive indicator of autonomic nervous system balance. A sustained rise above individual baseline may signify incomplete recovery, acute workload stress, fluid redistribution in microgravity, or elevated cabin CO2 exposure.',
      checks: ['Perform 15-minute resting recalibration', 'Review nocturnal sleep architecture in MindSpace', 'Verify cabin atmospheric CO2 & thermal readings'] },
    { id: 'hrv', label: 'Heart rate variability (RMSSD)', cur: v.hrv, base: b.hrv, unit: 'ms', dec: 0,
      why: 'Diminished HRV indicates reduced parasympathetic tone and physiological strain. Sustained downward drift over consecutive sols is a key early biomarker of cumulative mission fatigue.',
      checks: ['Examine 7-day rolling HRV baseline trend', 'Correlate with subjective fatigue rating in MindSpace'] },
    { id: 'resp', label: 'Respiratory rate', cur: v.resp, base: b.resp, unit: '/min', dec: 0,
      why: 'Tachypneic shifts can reflect mild hypercapnia, metabolic compensation, or exercise after-effects.',
      checks: ['Review cabin ventilation scrubber performance in SpaceGuard', 'Re-check rate in seated calm state'] },
    { id: 'bp', label: 'Systolic blood pressure', cur: v.systolic, base: b.systolic, unit: 'mmHg', dec: 0,
      why: 'Mild transient elevations can occur with cephalad fluid shifting. Serial automated readings over 24 hours provide better clinical context than isolated spikes.',
      checks: ['Confirm measurement with upper-arm telemetry cuff'] },
    { id: 'spo2', label: 'Blood oxygen saturation (SpO2)', cur: v.spo2, base: b.spo2, unit: '%', dec: 0,
      why: 'Oxygenation remains well-maintained within individual physiological bounds.', checks: ['Routine monitoring continues'] },
    { id: 'temp', label: 'Core body temperature', cur: v.temp, base: b.temp, unit: '°C', dec: 1,
      why: 'Core thermal regulation is stable and tightly coupled with circadian baseline.', checks: ['Nominal baseline'] },
  ].map((r) => ({ ...r, pct: deviation(r.cur, r.base), status: deviationStatus(deviation(r.cur, r.base)) }))
   .sort((x, y) => RANK[y.status] - RANK[x.status]);

  const anomalies = rows.filter((r) => r.status !== 'normal');
  const cardio = (Math.abs(rows.find((r) => r.id === 'hr')!.pct) + Math.abs(rows.find((r) => r.id === 'hrv')!.pct) + Math.abs(rows.find((r) => r.id === 'bp')!.pct)) / 3;
  const risks = [
    { name: 'Cardiovascular Load', ...level(cardio), note: 'Calculated from composite HR, HRV and arterial pressure variance' },
    { name: 'Sleep & Neuro-Recovery', ...level(22), note: 'Derived from 7-sol sleep architecture & circadian consistency' },
    { name: 'Environmental Strain Index', ...level(12), note: 'Correlated from partial CO2 pressure and acute radiation dosage' },
  ];

  return (
    <>
      <PageHeader
        title="HealthSense AI"
        subtitle="Explainable physiological deviation analysis. Compares live telemetry against individual baseline to isolate clinical signals."
      >
        <span className="inline-flex items-center gap-1.5 rounded-md border border-teal/30 bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal-dark">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Automated Health Diagnostics
        </span>
      </PageHeader>

      {/* ── Risk Indicators ── */}
      <div className="mb-5 grid gap-4 md:grid-cols-3" aria-label="Risk indicators">
        {risks.map((r) => (
          <section key={r.name} className="card p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">{r.name}</h3>
              <HealthStatusBadge status={r.status} label={r.label} />
            </div>
            <div className="progress-bar mt-3">
              <div
                className="progress-fill"
                style={{
                  width: r.label === 'Low' ? '25%' : r.label === 'Moderate' ? '48%' : r.label === 'Elevated' ? '72%' : '92%',
                  background: r.status === 'normal' ? C_SECONDARY : STATUS_STYLE[r.status].hex,
                }}
              />
            </div>
            <p className="mt-2.5 text-xs text-muted leading-relaxed">{r.note}</p>
          </section>
        ))}
      </div>

      {/* ── Main Deviations & Analytics ── */}
      <div className="grid gap-5 xl:grid-cols-3">
        {/* Deviations accordion */}
        <section className="card p-5 xl:col-span-2 space-y-4" aria-label="Detected deviations">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Detected Physiological Deviations</h2>
            <p className="text-xs text-muted mt-0.5">
              {anomalies.length} of {rows.length} telemetry streams deviate beyond nominal baseline thresholds. Select any stream for clinical rationale and recommended protocols.
            </p>
          </div>

          <ul className="space-y-2">
            {rows.map((r) => {
              const isOpen = open === r.id;
              const s = STATUS_STYLE[r.status];
              return (
                <li
                  key={r.id}
                  className={cx(
                    'rounded-lg border transition-all duration-150 overflow-hidden',
                    isOpen ? 'border-border-strong bg-offwhite/50' : 'border-border hover:bg-offwhite/30',
                    r.status !== 'normal' && 'border-l-4 ' + s.borderL
                  )}
                >
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : r.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{r.label}</p>
                      <p className="num text-xs text-muted mt-0.5">
                        {r.cur.toFixed(r.dec)} {r.unit} · baseline {r.base.toFixed(r.dec)} {r.unit}
                      </p>
                    </div>
                    <span className={cx('num text-xs font-bold mr-1', s.text)}>
                      {r.pct >= 0 ? '+' : ''}{r.pct.toFixed(1)}%
                    </span>
                    <HealthStatusBadge status={r.status} />
                    <ChevronDown
                      className={cx('h-4 w-4 text-muted transition-transform duration-200', isOpen && 'rotate-180')}
                      aria-hidden
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-4 border-t border-border px-4 py-4 text-xs bg-white">
                      <BaselineComparison label={r.label} current={r.cur} baseline={r.base} unit={r.unit} decimals={r.dec} />
                      <div className="card-inset p-3 rounded-lg">
                        <p className="font-semibold text-ink mb-1">Clinical Rationale:</p>
                        <p className="text-body leading-relaxed">{r.why}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-ink mb-1.5">Action Protocols to Verify:</p>
                        <ul className="space-y-1 text-muted">
                          {r.checks.map((c) => (
                            <li key={c} className="flex items-start gap-2">
                              <span className="h-1 w-1 rounded-full bg-teal mt-1.5 shrink-0" aria-hidden />
                              <span>{c}</span>
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
        </section>

        {/* Right side analytics */}
        <div className="space-y-5">
          <ChartCard
            title="7-Day Resting Heart Rate Drift"
            subtitle="Longitudinal progression showing divergence over last 24h"
            height={220}
          >
            <TelemetryChart data={series} dataKey="hr" color={C_PRIMARY} baseline={b.restingHr} unit="BPM" />
          </ChartCard>

          <section className="card p-5" aria-label="Diagnostic reference">
            <h3 className="font-display text-sm font-semibold text-ink mb-3">Diagnostic Classification</h3>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2.5">
                <HealthStatusBadge status="normal" label="Nominal" />
                <span className="text-muted leading-tight mt-0.5">&lt; 5% deviation. Normal physiological homeostatic range.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <HealthStatusBadge status="info" label="Notice" />
                <span className="text-muted leading-tight mt-0.5">5% to 15% deviation. Informational variation to monitor.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <HealthStatusBadge status="warning" label="Review" />
                <span className="text-muted leading-tight mt-0.5">15% to 35% deviation. Check telemetry sensors &amp; environment.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <HealthStatusBadge status="critical" label="Action" />
                <span className="text-muted leading-tight mt-0.5">&gt; 35% deviation. Notify Flight Surgeon &amp; begin triage.</span>
              </li>
            </ul>
            <p className="mt-4 pt-3 border-t border-border text-[11px] text-muted">
              Thresholds represent simulated calibration guidelines. Customize parameters under Bio-Calibration.
            </p>
          </section>
        </div>
      </div>

      <DemoNotice text="Automated anomaly analysis based on heuristic baseline variance modeling. For mission demonstration only; does not substitute clinical diagnostic review." />
    </>
  );
}
