import { Droplets, Radiation, Thermometer, Wind, Gauge, ShieldCheck, Activity } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AlertCard from '../components/alerts/AlertCard';
import ChartCard from '../components/common/ChartCard';
import DemoNotice from '../components/common/DemoNotice';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import RangeGauge from '../components/spaceguard/RangeGauge';
import { useApp } from '../context/AppContext';
import { envNow, envRanges, envSeries } from '../data/mockData';
import { tempUnit, toTemp } from '../utils';
import { grid, tick, tooltipProps, C_PRIMARY, C_SECONDARY } from '../utils/chart';
import type { RangeCfg } from '../types';

const cabinPressureRange: RangeCfg = {
  unit: 'kPa',
  min: 80,
  max: 120,
  safeLo: 98,
  safeHi: 104,
  warnLo: 92,
  warnHi: 110,
};

const oxygenLevelRange: RangeCfg = {
  unit: '%',
  min: 15,
  max: 30,
  safeLo: 19.5,
  safeHi: 23.5,
  warnLo: 18.0,
  warnHi: 25.0,
};

export default function SpaceGuard() {
  const { alerts, acknowledge, settings } = useApp();
  const envAlerts = alerts.filter((a) =>
    ['Radiation', 'CO2', 'Temperature', 'Humidity', 'Atmospheric', 'Pressure', 'Oxygen'].includes(a.indicator)
  );
  const tUnit = tempUnit(settings.units);
  const tData = envSeries.map((p) => ({ ...p, temp: toTemp(p.temp, settings.units) }));
  const margin = { top: 8, right: 12, left: -14, bottom: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SpaceGuard"
        subtitle="Life support and cabin atmospheric telemetry monitored against safe NASA Gateway and ISS human habitation thresholds."
      >
        <div className="flex items-center gap-2 bg-white border border-line px-3 py-1.5 rounded-lg shadow-sm text-xs font-semibold text-teal-dark">
          <ShieldCheck className="h-4 w-4 text-teal" />
          <span>ECLSS Life Support Online</span>
        </div>
      </PageHeader>

      {/* ── Standardized 6 Metrics Cards ── */}
      <section aria-label="Environmental telemetry gauges">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <RangeGauge
            label="Radiation Dose Rate"
            icon={Radiation}
            value={envNow.radiation}
            cfg={envRanges.radiation}
            decimals={2}
            footnote="Active Dosimetry"
          />
          <RangeGauge
            label="CO2 Partial Pressure"
            icon={Wind}
            value={envNow.co2}
            cfg={envRanges.co2}
            decimals={0}
            footnote="Scrubber Loop A"
          />
          <RangeGauge
            label="Cabin Total Pressure"
            icon={Gauge}
            value={101.3}
            cfg={cabinPressureRange}
            decimals={1}
            footnote="Hermetic Seal"
          />
          <RangeGauge
            label="Habitat Temperature"
            icon={Thermometer}
            value={toTemp(envNow.temp, settings.units)}
            cfg={
              settings.units === 'metric'
                ? envRanges.temp
                : { ...envRanges.temp, unit: tUnit, min: 57, max: 90, safeLo: 64, safeHi: 79, warnLo: 59, warnHi: 84 }
            }
            decimals={1}
            footnote="HVAC Controlled"
          />
          <RangeGauge
            label="Relative Humidity"
            icon={Droplets}
            value={envNow.humidity}
            cfg={envRanges.humidity}
            decimals={0}
            footnote="Condensate Recycled"
          />
          <RangeGauge
            label="O2 Partial Vol"
            icon={Activity}
            value={21.1}
            cfg={oxygenLevelRange}
            decimals={1}
            footnote="Regenerative O2"
          />
        </div>
      </section>

      {/* ── Environmental Telemetry Charts ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radiation Flux Area Chart */}
        <ChartCard
          title="Radiation Dose Rate (Last 24 Hours)"
          subtitle="Real-time ionizing galactic cosmic radiation flux. Dashed line denotes mission threshold (0.60 mSv/day)."
          height={260}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={envSeries} margin={margin}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={tick} stroke={grid} minTickGap={32} />
              <YAxis tick={tick} stroke={grid} width={42} />
              <Tooltip {...tooltipProps} />
              <ReferenceLine
                y={envRanges.radiation.safeHi}
                stroke="#E8972D"
                strokeDasharray="4 3"
                label={{ value: 'Safe Limit (0.60)', fill: '#E8972D', fontSize: 10, position: 'insideTopRight' }}
              />
              <Area
                type="monotone"
                dataKey="radiation"
                name="Flux (mSv/day)"
                stroke={C_PRIMARY}
                fill={C_PRIMARY}
                fillOpacity={0.08}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* CO2 Concentration Line Chart */}
        <ChartCard
          title="Cabin CO2 Partial Concentration"
          subtitle="Carbon dioxide atmospheric scrubber tracking. Levels remain comfortably below hypercapnia limits."
          height={260}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={envSeries} margin={margin}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={tick} stroke={grid} minTickGap={32} />
              <YAxis tick={tick} stroke={grid} width={46} />
              <Tooltip {...tooltipProps} />
              <ReferenceLine
                y={envRanges.co2.safeHi}
                stroke="#E8972D"
                strokeDasharray="4 3"
                label={{ value: 'Warning Threshold (3500 ppm)', fill: '#E8972D', fontSize: 10, position: 'insideTopRight' }}
              />
              <Line
                type="monotone"
                dataKey="co2"
                name="CO2 (ppm)"
                stroke={C_SECONDARY}
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Habitat Thermal & Humidity Profile */}
        <ChartCard
          className="lg:col-span-2"
          title="Habitation Thermal &amp; Humidity Profile"
          subtitle={`Dual-axis environmental regulation. Temperature in ${tUnit} (Navy line), Relative Humidity in % (Teal dashed).`}
          height={240}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tData} margin={margin}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={tick} stroke={grid} minTickGap={32} />
              <YAxis yAxisId="l" tick={tick} stroke={grid} width={42} domain={['auto', 'auto']} />
              <YAxis yAxisId="r" orientation="right" tick={tick} stroke={grid} width={36} domain={[30, 70]} />
              <Tooltip {...tooltipProps} />
              <Line
                yAxisId="l"
                type="monotone"
                dataKey="temp"
                name={`Temperature (${tUnit})`}
                stroke={C_PRIMARY}
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="r"
                type="monotone"
                dataKey="humidity"
                name="Humidity (%)"
                stroke={C_SECONDARY}
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Active Environmental Alerts Section ── */}
      <section aria-label="Environmental alerts" className="card p-5">
        <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
          <div>
            <h2 className="font-display text-sm font-bold text-ink">Active Environmental &amp; Radiative Alerts</h2>
            <p className="text-xs text-muted">Habitation sensors exceeding safe or warning baseline thresholds</p>
          </div>
          <span className="text-xs font-mono font-semibold text-teal-dark bg-teal/10 px-2.5 py-1 rounded">
            {envAlerts.length} Active {envAlerts.length === 1 ? 'Alert' : 'Alerts'}
          </span>
        </div>

        {envAlerts.length === 0 ? (
          <EmptyState
            title="Atmospheric Parameters Nominal"
            hint="All cabin environmental readings are within standard NASA-3001 operational envelope."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {envAlerts.map((a) => (
              <AlertCard key={a.id} alert={a} compact onAcknowledge={acknowledge} hour12={settings.hour12} />
            ))}
          </div>
        )}
      </section>

      <DemoNotice text="Safe operational parameters reflect simulated ISS/Gateway design baselines. Data feeds generated synthetically." />
    </div>
  );
}