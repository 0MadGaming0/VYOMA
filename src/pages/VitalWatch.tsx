import { useEffect, useMemo, useState } from 'react';
import { Activity, Droplets, HeartPulse, Radio, Thermometer, Waves, Wind, Trash2 } from 'lucide-react';
import ChartCard from '../components/common/ChartCard';
import DataTable, { type Column } from '../components/common/DataTable';
import DemoNotice from '../components/common/DemoNotice';
import EmptyState from '../components/common/EmptyState';
import HealthStatusBadge from '../components/common/HealthStatusBadge';
import LoadingState from '../components/common/LoadingState';
import MetricCard from '../components/common/MetricCard';
import PageHeader from '../components/common/PageHeader';
import TelemetryChart from '../components/common/TelemetryChart';
import BaselineComparison from '../components/common/BaselineComparison';
import EcgWaveform from '../components/vitalwatch/EcgWaveform';
import RangeSelector from '../components/vitalwatch/RangeSelector';
import { useApp } from '../context/AppContext';
import {
  currentVitals as v, nextLivePoint,
  sensors, spark, telemetryLog, vitalSeries, type Point,
} from '../data/mockData';
import { useSimulatedLoad } from '../hooks/useSimulatedLoad';
import type { Range } from '../types';
import { deviation, deviationStatus, fmtClock, fmtDateTime, tempUnit, toTemp } from '../utils';
import { C_PRIMARY, C_SECONDARY } from '../utils/chart';

type Metric = 'hr' | 'hrv' | 'spo2';
const metricCfg: Record<Metric, { label: string; unit: string; color: string }> = {
  hr:   { label: 'Heart rate', unit: 'BPM',  color: C_PRIMARY   },
  hrv:  { label: 'HRV',        unit: 'ms',   color: C_SECONDARY  },
  spo2: { label: 'SpO2',       unit: '%',    color: '#3A7FC1'   },
};

export default function VitalWatch() {
  const { baselines: b, settings, notes, addNote, deleteNote } = useApp();
  const [range, setRange]   = useState<Range>('24H');
  const [sensor, setSensor] = useState(sensors[0].id);
  const [metric, setMetric] = useState<Metric>('hr');
  const [live, setLive]     = useState<Point[]>(() => vitalSeries('LIVE'));
  const [draft, setDraft]   = useState('');
  const loading  = useSimulatedLoad(range + sensor);
  const base     = useMemo(() => vitalSeries(range), [range, sensor]);
  const data     = range === 'LIVE' ? live : base;
  const last     = data[data.length - 1];

  useEffect(() => {
    if (range !== 'LIVE') return;
    const id = setInterval(() => setLive((p) => [...p.slice(1), nextLivePoint(p[p.length - 1])]), 1000);
    return () => clearInterval(id);
  }, [range]);

  const st        = (c: number, bl: number) => deviationStatus(deviation(c, bl));
  const hr        = range === 'LIVE' ? last.hr : v.hr;
  const sensorName = sensors.find((s) => s.id === sensor)?.name;
  const stamp     = fmtClock(v.measuredAt, settings.hour12);
  const baselineFor: Record<Metric, number> = { hr: b.restingHr, hrv: b.hrv, spo2: b.spo2 };

  const cols: Column<typeof telemetryLog[number]>[] = [
    { key: 't', header: 'Time',     render: (r) => <span className="num text-muted">{fmtDateTime(r.time, settings.hour12)}</span> },
    { key: 'm', header: 'Metric',   render: (r) => <span className="text-body font-medium">{r.metric}</span> },
    { key: 'r', header: 'Reading',  render: (r) => <span className="num font-semibold text-ink">{r.reading}</span> },
    { key: 'b', header: 'Baseline', render: (r) => <span className="num text-muted">{r.baseline}</span> },
    { key: 's', header: 'Status',   render: (r) => <HealthStatusBadge status={r.severity} /> },
  ];

  return (
    <>
      <PageHeader title="VitalWatch" subtitle="Physiological telemetry compared with your personal baseline.">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-crit/30 bg-crit/8 px-2.5 py-1 text-xs font-semibold text-crit">
          <Radio className="h-3 w-3 animate-pulseDot" aria-hidden />
          Simulated live feed
        </span>
        <label className="sr-only" htmlFor="sensor">Sensor source</label>
        <select id="sensor" className="input w-auto text-xs" value={sensor} onChange={(e) => setSensor(e.target.value)}>
          {sensors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </PageHeader>

      {/* Range selector */}
      <div className="mb-5"><RangeSelector value={range} onChange={setRange} /></div>

      {/* Vitals grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-5">
        <MetricCard label="Heart rate"         icon={HeartPulse}  value={hr}                                 unit="BPM"  status={st(hr, b.restingHr)}    baseline={`${b.restingHr} BPM`}             spark={spark(66, 6)}   footnote={stamp} />
        <MetricCard label="Heart rate variability" icon={Waves}   value={range === 'LIVE' ? last.hrv : v.hrv} unit="ms"  status={st(v.hrv, b.hrv)}       baseline={`${b.hrv} ms`}                    spark={spark(55, 7)}   footnote={stamp} />
        <MetricCard label="SpO2"               icon={Activity}    value={range === 'LIVE' ? last.spo2 : v.spo2} unit="%" status={st(v.spo2, b.spo2)}     baseline={`${b.spo2} %`}                    spark={spark(97, 0.7)} footnote={stamp} />
        <MetricCard label="Blood pressure"     icon={Droplets}    value={`${v.systolic}/${v.diastolic}`}      unit="mmHg" status={st(v.systolic, b.systolic)} baseline={`${b.systolic}/${b.diastolic}`} spark={spark(121, 4)} footnote={stamp} />
        <MetricCard label="Body temperature"   icon={Thermometer} value={toTemp(v.temp, settings.units)}      unit={tempUnit(settings.units)} status={st(v.temp, b.temp)} baseline={`${toTemp(b.temp, settings.units)} ${tempUnit(settings.units)}`} spark={spark(36.7, 0.15)} footnote={stamp} />
        <MetricCard label="Respiratory rate"   icon={Wind}        value={v.resp}                              unit="/min" status={st(v.resp, b.resp)}     baseline={`${b.resp} /min`}                 spark={spark(15, 1.6)} footnote={stamp} />
      </div>
      <p className="mb-5 text-xs text-muted">
        Source: <span className="text-body font-medium">{sensorName}</span> (simulated)
      </p>

      {/* ECG + Baseline */}
      <div className="grid gap-4 xl:grid-cols-3 mb-5">
        <ChartCard
          className="xl:col-span-2"
          title="ECG waveform"
          subtitle={`Synthetic trace at ${hr} BPM. For interface demonstration only.`}
          height={160}
        >
          <EcgWaveform bpm={hr} />
        </ChartCard>
        <section className="card p-5 space-y-5" aria-label="Baseline comparison">
          <h3 className="font-display text-sm font-semibold text-ink">Against Your Baseline</h3>
          <BaselineComparison label="Heart rate" current={hr}    baseline={b.restingHr} unit="BPM" />
          <BaselineComparison label="HRV"        current={v.hrv} baseline={b.hrv}       unit="ms"  />
          <BaselineComparison label="SpO2"       current={v.spo2} baseline={b.spo2}     unit="%"   />
        </section>
      </div>

      {/* Metric history chart */}
      <ChartCard
        className="mb-5"
        title={`${metricCfg[metric].label} history (${range})`}
        subtitle="Dashed line is your personal baseline"
        height={280}
        actions={
          <div role="group" aria-label="Chart metric" className="flex gap-1.5">
            {(Object.keys(metricCfg) as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                aria-pressed={metric === m}
                className={`chip ${metric === m ? 'chip-on' : 'chip-off'}`}
              >
                {metricCfg[m].label}
              </button>
            ))}
          </div>
        }
      >
        {loading
          ? <LoadingState />
          : <TelemetryChart data={data} dataKey={metric} color={metricCfg[metric].color} baseline={baselineFor[metric]} unit={metricCfg[metric].unit} />
        }
      </ChartCard>

      {/* Log + Notes */}
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2" aria-label="Abnormal telemetry log">
          <h3 className="font-display text-sm font-semibold text-ink mb-4">Abnormal Telemetry Log</h3>
          <DataTable columns={cols} rows={telemetryLog} />
        </section>

        {/* Persisted Flight Notes */}
        <section className="card flex flex-col gap-3 p-5" aria-label="Flight notes">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink">Flight Notes</h3>
            <span className="text-[11px] text-muted">{notes.length} saved</span>
          </div>
          <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {notes.length === 0
              ? <EmptyState title="No notes yet" hint="Add clinical observations or symptoms for today's readings." />
              : notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-offwhite border border-line/60 p-3 text-sm group hover:border-line transition-colors">
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
                    <p className="num mt-1.5 text-[10px] text-muted">{fmtDateTime(n.time, settings.hour12)}</p>
                  </li>
                ))
            }
          </ul>
          <form
            className="mt-auto space-y-2 pt-2 border-t border-line/50"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              addNote(draft);
              setDraft('');
            }}
          >
            <label htmlFor="note" className="sr-only">New flight note</label>
            <textarea
              id="note"
              className="input min-h-[72px] resize-none text-xs"
              placeholder="Record physiological symptoms, exertion notes, or mission observations…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn-primary w-full text-xs" type="submit" disabled={!draft.trim()}>
              Save Flight Note
            </button>
          </form>
        </section>
      </div>

      <DemoNotice />
    </>
  );
}
