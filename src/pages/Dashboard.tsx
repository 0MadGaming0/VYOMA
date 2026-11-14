import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Droplets, HeartPulse, Moon, Radiation, Thermometer, Wind, AlertTriangle, ShieldCheck } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import AlertCard from '../components/alerts/AlertCard';
import ChartCard from '../components/common/ChartCard';
import DemoNotice from '../components/common/DemoNotice';
import EmptyState from '../components/common/EmptyState';
import HealthStatusBadge from '../components/common/HealthStatusBadge';
import MetricCard from '../components/common/MetricCard';
import { useApp } from '../context/AppContext';
import { currentVitals as v, envNow, mission, recentEvents, sleepWeek, spark, vitalSeries } from '../data/mockData';
import { RANK, deviation, deviationStatus, elapsed, fmtClock, rangeStatus, tempUnit, timeAgo, toTemp } from '../utils';
import { envRanges } from '../data/mockData';
import { grid, tick, tooltipProps, C_PRIMARY, C_SECONDARY } from '../utils/chart';

export default function Dashboard() {
  const { alerts, acknowledge, baselines: b, profile, settings } = useApp();
  const [chartRange, setChartRange] = useState<'1H' | '6H' | '24H'>('24H');
  const series = useMemo(() => vitalSeries(chartRange), [chartRange]);
  
  const active = alerts.filter((a) => !a.acknowledged).sort((x, y) => RANK[y.severity] - RANK[x.severity]);
  const top = active[0];
  const criticalCount = active.filter((a) => a.severity === 'critical').length;
  const warningCount = active.filter((a) => a.severity === 'warning').length;

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const st = (cur: number, base: number) => deviationStatus(deviation(cur, base));
  
  const flagged = active.filter((a) => a.severity !== 'info').length;
  const overall = flagged === 0 ? 'All Systems Nominal' : criticalCount > 0 ? 'Critical Triage Action' : 'Monitor Physiological Drift';
  const score = Math.max(40, 96 - active.reduce((n, a) => n + RANK[a.severity] * 3, 0));
  
  const lastSleep = sleepWeek[sleepWeek.length - 1];
  const avgSleep = sleepWeek.reduce((n, d) => n + d.hours, 0) / sleepWeek.length;
  const circ = 2 * Math.PI * 44;
  const scoreColor = flagged === 0 ? '#2A9D8F' : criticalCount > 0 ? '#C0392B' : '#E8972D';

  return (
    <div className="space-y-6">
      {/* ── Mission Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-line">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/15 px-2.5 py-0.5 text-[11px] font-bold text-teal-dark border border-teal/30">
              <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulseDot" />
              Live Telemetry Stream
            </span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs font-mono text-muted">{mission.id} Orbit Increment</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl tracking-tight">
            {greet}, {profile.name}
          </h1>
          <p className="num mt-1 text-xs text-muted">
            {mission.name} · {mission.phase} · MET {elapsed(mission.startISO)} · {fmtClock(new Date(), settings.hour12)}
          </p>
        </div>

        {/* Health score & Readiness ring */}
        <div className="flex items-center gap-4 bg-white rounded-xl border border-line p-3 shadow-card">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r="44" fill="none" stroke="#EEF2F6" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - score / 100)}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="num text-lg font-bold text-ink leading-none">{score}</p>
                <p className="text-[8px] uppercase tracking-wider text-muted font-bold mt-0.5">Readiness</p>
              </div>
            </div>
          </div>
          <div>
            <p className="label text-[10px] text-muted">Physiological State</p>
            <p className="font-display text-base font-bold text-ink">{overall}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted">
              {criticalCount > 0 && (
                <span className="font-bold text-crit flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {criticalCount} Critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="font-medium text-warn flex items-center gap-1">
                  {warningCount} Warning
                </span>
              )}
              {flagged === 0 && (
                <span className="font-semibold text-teal-dark flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-teal" /> Optimal Stability
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── High-Priority Critical Alert Banner ── */}
      {top && top.severity !== 'info' && (
        <aside
          role="alert"
          aria-live="assertive"
          className={`flex items-center justify-between gap-3 rounded-xl border p-4 shadow-card transition-all ${
            top.severity === 'critical'
              ? 'border-crit/40 bg-crit/[0.04]'
              : 'border-warn/40 bg-warn/[0.04]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`h-3 w-3 shrink-0 rounded-full animate-pulseDot ${
                top.severity === 'critical' ? 'bg-crit ring-4 ring-crit/20' : 'bg-warn ring-4 ring-warn/20'
              }`}
              aria-hidden
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  top.severity === 'critical' ? 'bg-crit text-white' : 'bg-warn text-white'
                }`}>
                  {top.severity} Triage
                </span>
                <p className="text-sm font-bold text-ink truncate">{top.title}</p>
              </div>
              <p className="num text-xs text-muted truncate mt-0.5">
                Observed: {top.observed} · Target: {top.baseline} · Logged {timeAgo(top.timestamp)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => acknowledge(top.id)}
              className="btn-ghost text-xs bg-white border border-line px-3 py-1.5 hover:bg-offwhite"
            >
              Acknowledge
            </button>
            <Link
              to="/alerts"
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1"
            >
              Open Triage <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      )}

      {/* ── Primary Vitals Grid (Standardized Heights) ── */}
      <section aria-label="Vital Signs Metrics">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Heart Rate"
            icon={HeartPulse}
            value={v.hr}
            unit="BPM"
            status={st(v.hr, b.restingHr)}
            baseline={`${b.restingHr} BPM`}
            spark={spark(66, 6)}
            footnote="Resting Basal Pulse"
          />
          <MetricCard
            label="Oxygen Saturation (SpO2)"
            icon={Activity}
            value={v.spo2}
            unit="%"
            status={st(v.spo2, b.spo2)}
            baseline={`${b.spo2} %`}
            spark={spark(97, 0.8)}
            footnote="Continuous Pulse Oximetry"
          />
          <MetricCard
            label="Blood Pressure"
            icon={Droplets}
            value={`${v.systolic}/${v.diastolic}`}
            unit="mmHg"
            status={st(v.systolic, b.systolic)}
            baseline={`${b.systolic}/${b.diastolic}`}
            spark={spark(121, 4)}
            footnote="Oscillometric Arterial"
          />
          <MetricCard
            label="Core Body Temperature"
            icon={Thermometer}
            value={toTemp(v.temp, settings.units)}
            unit={tempUnit(settings.units)}
            status={st(v.temp, b.temp)}
            baseline={`${toTemp(b.temp, settings.units)} ${tempUnit(settings.units)}`}
            spark={spark(36.7, 0.15)}
            footnote="Tympanic Thermoregulation"
          />
        </div>
      </section>

      {/* ── Visual Prominence: Primary HR/HRV Telemetry Chart + Triage Alerts ── */}
      <div className="grid gap-6 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          title="Autonomic Cardiac &amp; HRV Telemetry"
          subtitle="Real-time continuous correlation between Heart Rate (BPM) and Heart Rate Variability (rMSSD in ms)."
          height={300}
          actions={
            <div className="flex items-center gap-1 bg-offwhite border border-line rounded-lg p-0.5">
              {(['1H', '6H', '24H'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setChartRange(r)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    chartRange === r ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={tick} stroke={grid} minTickGap={32} />
              <YAxis yAxisId="hr" tick={tick} stroke={grid} domain={['dataMin - 5', 'dataMax + 10']} />
              <YAxis yAxisId="hrv" orientation="right" tick={tick} stroke={grid} domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip {...tooltipProps} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#16324F', paddingTop: 10 }} />
              <ReferenceLine yAxisId="hr" y={b.restingHr} stroke="#2A9D8F" strokeDasharray="4 4" label={{ value: `Basal HR (${b.restingHr})`, fill: '#2A9D8F', fontSize: 10, position: 'insideTopLeft' }} />
              <Line yAxisId="hr" type="monotone" dataKey="hr" name="Heart Rate (BPM)" stroke={C_PRIMARY} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line yAxisId="hrv" type="monotone" dataKey="hrv" name="HRV rMSSD (ms)" stroke={C_SECONDARY} strokeWidth={2} dot={false} isAnimationActive={false} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Active Alerts Panel */}
        <section className="xl:col-span-2 card p-5 flex flex-col justify-between" aria-label="Active Triage Queue">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
              <div>
                <h2 className="font-display text-sm font-bold text-ink">Active Triage Queue</h2>
                <p className="text-xs text-muted">Priority medical and environmental alerts</p>
              </div>
              <Link to="/alerts" className="text-xs font-bold text-teal hover:text-teal-dark hover:underline flex items-center gap-1">
                All Alerts ({alerts.length}) <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {active.length === 0 ? (
                <EmptyState title="Triage Queue Clear" hint="All physiological deviations nominal or acknowledged." />
              ) : (
                active.slice(0, 2).map((a) => (
                  <AlertCard key={a.id} alert={a} compact onAcknowledge={acknowledge} hour12={settings.hour12} />
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-muted">
            <span>Flight Surgeon Triage Rulebook: <strong>Active</strong></span>
            <span className="font-mono text-teal-dark font-semibold">Triage v4.2</span>
          </div>
        </section>
      </div>

      {/* ── Standardized Secondary Summary Row ── */}
      <section aria-label="Physiological and Environmental Summaries">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Sleep Summary */}
          <div className="card p-5 flex flex-col justify-between min-h-[190px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5 text-teal" aria-hidden />
                  Sleep Architecture
                </span>
                <span className="text-[10px] font-bold text-teal-dark bg-teal/10 px-2 py-0.5 rounded-full">
                  Circadian Ok
                </span>
              </div>
              <p className="num text-2xl font-bold text-ink">
                {lastSleep.hours}
                <span className="ml-1 text-xs font-normal text-muted">hours (last sleep)</span>
              </p>
            </div>

            <div className="border-t border-line pt-3 mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-muted">
                <span>7-Day Running Avg</span>
                <span className="num font-bold text-ink">{avgSleep.toFixed(1)} hrs</span>
              </div>
              <div className="flex justify-between items-center text-muted">
                <span>Sleep Quality Score</span>
                <span className="num font-bold text-teal-dark">{lastSleep.quality}/5 (Restorative)</span>
              </div>
            </div>
          </div>

          {/* Neurocognitive & Fatigue */}
          <div className="card p-5 flex flex-col justify-between min-h-[190px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label">Autonomic Load</span>
                <span className="text-[10px] font-bold text-warn bg-warn/10 px-2 py-0.5 rounded-full">
                  Moderate Fatigue
                </span>
              </div>
              <div className="space-y-2 mt-2">
                {[['Mental Stress Index', 6] as const, ['Physical Fatigue', 7] as const].map(([label, scoreVal]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-body">{label}</span>
                      <span className="num font-bold text-ink">{scoreVal}/10</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${scoreVal * 10}%`,
                          background: scoreVal >= 7 ? '#E8972D' : '#2A9D8F',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="border-t border-line pt-2 text-[11px] text-muted">
              Scheduled 45-min decompression protocol recommended.
            </p>
          </div>

          {/* Habitat Environmental Telemetry */}
          <div className="card p-5 flex flex-col justify-between min-h-[190px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label flex items-center gap-1.5">
                  <Wind className="h-3.5 w-3.5 text-teal" aria-hidden />
                  Habitat Life Support
                </span>
                <span className="text-[10px] font-bold text-teal-dark bg-teal/10 px-2 py-0.5 rounded-full">
                  ECLSS Nominal
                </span>
              </div>
              <ul className="space-y-1.5 text-xs">
                {([
                  ['CO2 Partial Pressure', `${envNow.co2} ppm`, envRanges.co2, envNow.co2],
                  ['Module Cabin Temp', `${toTemp(envNow.temp, settings.units)} ${tempUnit(settings.units)}`, envRanges.temp, envNow.temp],
                  ['Radiation Dose Rate', `${envNow.radiation} mSv/d`, envRanges.radiation, envNow.radiation],
                ] as const).map(([lbl, valStr, cfg, numVal]) => (
                  <li key={lbl} className="flex items-center justify-between py-0.5">
                    <span className="text-muted flex items-center gap-1">
                      {lbl.includes('Radiation') && <Radiation className="h-3 w-3 text-muted" />}
                      {lbl}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="num font-semibold text-ink">{valStr}</span>
                      <HealthStatusBadge status={rangeStatus(numVal, cfg)} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="border-t border-line pt-2 text-[11px] text-muted">
              Cabin pressure: 101.3 kPa · O2: 21.0%
            </p>
          </div>

          {/* Recent Mission Events */}
          <div className="card p-5 flex flex-col justify-between min-h-[190px]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label">Telemetry Timeline</span>
                <span className="text-[10px] text-muted font-mono">Real-time</span>
              </div>
              <ul className="space-y-2 text-xs">
                {recentEvents.slice(0, 3).map((e) => (
                  <li key={e.id} className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        e.type === 'critical' ? 'bg-crit' : e.type === 'warning' ? 'bg-warn' : 'bg-teal'
                      }`}
                      aria-hidden
                    />
                    <span className="flex-1 text-body line-clamp-1 leading-snug">{e.text}</span>
                    <span className="num text-[10px] text-muted shrink-0">{timeAgo(e.time)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-line pt-2 flex items-center justify-between text-[11px] text-muted">
              <span>Station Uplink Log</span>
              <span className="text-teal-dark font-medium">Synced</span>
            </div>
          </div>
        </div>
      </section>

      <DemoNotice />
    </div>
  );
}