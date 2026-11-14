// ─────────────────────────────────────────────────────────────
// ALL DATA IN THIS FILE IS SIMULATED. Demo astronaut, demo mission.
// Replace with API responses (see src/services) when the backend is ready.
// ─────────────────────────────────────────────────────────────
import type { Alert, Baselines, Profile, Range, RangeCfg, Settings, Status } from '../types';

const now = Date.now();
const ago = (min: number) => new Date(now - min * 60000).toISOString();

export const DEMO_NOTICE = 'Simulated telemetry and demo astronaut. Demo analysis is not clinically validated.';

export const defaultProfile: Profile = { name: 'Crew Member', role: 'Mission Specialist', id: 'VYO-DEMO-01', crew: 'Expedition 72' };

export const mission = {
  id: 'VYOMA-M1',
  name: 'Long-duration demo mission',
  phase: 'Cruise phase',
  startISO: new Date(now - (112 * 86400000 + 4 * 3600000)).toISOString(),
};

export const defaultBaselines: Baselines = { restingHr: 65, hrv: 62, spo2: 98, systolic: 118, diastolic: 76, temp: 36.6, resp: 14 };

export const defaultSettings: Settings = {
  units: 'metric', hour12: false,
  notifyCritical: true, notifyWarning: true, notifyInfo: false, sound: false,
  reduceMotion: false, showDemoBanner: true,
};

export const currentVitals = { hr: 85, hrv: 41, spo2: 96, systolic: 128, diastolic: 82, temp: 36.9, resp: 17, measuredAt: ago(1) };

export const sensors = [
  { id: 'wrist', name: 'Wrist biosensor' },
  { id: 'chest', name: 'Chest patch' },
  { id: 'cuff', name: 'Smart cuff' },
  { id: 'ring', name: 'Sleep ring' },
];

export const spark = (base: number, amp: number, n = 20) =>
  Array.from({ length: n }, (_, i) => +(base + amp * Math.sin(i / 2.2) + amp * 0.4 * Math.sin(i * 1.9) + (i > n - 6 ? amp * 0.15 * (i - (n - 6)) : 0)).toFixed(1));

// ── Vital time series ──
const CFG: Record<Range, { points: number; stepMs: number }> = {
  LIVE: { points: 60, stepMs: 1000 }, '1H': { points: 60, stepMs: 60000 }, '6H': { points: 72, stepMs: 300000 },
  '24H': { points: 96, stepMs: 900000 }, '7D': { points: 84, stepMs: 7200000 }, '30D': { points: 90, stepMs: 28800000 },
};
export const RANGES: Range[] = ['LIVE', '1H', '6H', '24H', '7D', '30D'];

export interface Point { t: number; label: string; hr: number; hrv: number; spo2: number }

export const labelFor = (t: number, r: Range) => {
  const d = new Date(t);
  return r === '7D' || r === '30D'
    ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: r === 'LIVE' ? '2-digit' : undefined, hour12: false });
};

export function vitalSeries(r: Range): Point[] {
  const { points, stepMs } = CFG[r];
  const end = Date.now();
  return Array.from({ length: points }, (_, i) => {
    const t = end - (points - 1 - i) * stepMs;
    const drift = i > points * 0.8 ? (i - points * 0.8) * (20 / (points * 0.2)) * 0.9 : 0;
    return {
      t, label: labelFor(t, r),
      hr: Math.round(66 + 5 * Math.sin(i / 6) + 2.5 * Math.sin(i * 1.3) + drift),
      hrv: Math.round(60 - drift * 1.1 + 4 * Math.cos(i / 5)),
      spo2: +(97.6 + 0.6 * Math.sin(i / 4) - drift * 0.06).toFixed(1),
    };
  });
}

export function nextLivePoint(prev: Point): Point {
  const t = Date.now();
  return {
    t, label: labelFor(t, 'LIVE'),
    hr: Math.max(60, Math.min(110, Math.round(prev.hr + (Math.random() - 0.5) * 3))),
    hrv: Math.max(25, Math.min(80, Math.round(prev.hrv + (Math.random() - 0.5) * 3))),
    spo2: +Math.max(93, Math.min(99, prev.spo2 + (Math.random() - 0.5) * 0.4)).toFixed(1),
  };
}

export const telemetryLog = [
  { id: 't1', time: ago(14), metric: 'Heart rate', reading: '92 BPM', baseline: '65 BPM', severity: 'warning' as Status },
  { id: 't2', time: ago(52), metric: 'HRV', reading: '38 ms', baseline: '62 ms', severity: 'warning' as Status },
  { id: 't3', time: ago(131), metric: 'Respiratory rate', reading: '18 /min', baseline: '14 /min', severity: 'warning' as Status },
  { id: 't4', time: ago(260), metric: 'Blood pressure', reading: '131/84 mmHg', baseline: '118/76 mmHg', severity: 'info' as Status },
  { id: 't5', time: ago(420), metric: 'SpO2', reading: '95 %', baseline: '98 %', severity: 'info' as Status },
];

export const initialNotes = [
  { id: 'n1', time: ago(95), text: 'Finished treadmill session (30 min). Resting HR still elevated afterwards.' },
];

// ── Alerts ──
export const initialAlerts: Alert[] = [
  { id: 'a1', severity: 'critical', indicator: 'Radiation', title: 'Radiation dose-rate spike', observed: '1.08 mSv/day (peak)', baseline: 'Safe range ≤ 0.60 mSv/day',
    explanation: 'Dose rate briefly rose well above the demo safe range. It has since returned to 0.42 mSv/day, but the exposure was recorded.',
    action: 'Review the exposure log and consider time in the shielded area until instructed otherwise.', timestamp: ago(38), acknowledged: false },
  { id: 'a2', severity: 'warning', indicator: 'Heart rate', title: 'Resting heart rate above your baseline', observed: '85 BPM', baseline: '65 BPM (+31%)',
    explanation: 'Resting heart rate has stayed higher than your personal baseline for the last several hours. Fatigue, poor sleep and elevated CO2 can all contribute.',
    action: 'Rest for 15 minutes and re-measure. Log symptoms in MindSpace.', timestamp: ago(62), acknowledged: false },
  { id: 'a3', severity: 'warning', indicator: 'HRV', title: 'Heart rate variability is low', observed: '41 ms', baseline: '62 ms (−34%)',
    explanation: 'Lower HRV often accompanies stress or incomplete recovery. It is a trend signal, not a diagnosis.',
    action: 'Prioritise sleep tonight and review the stress check-in.', timestamp: ago(75), acknowledged: false },
  { id: 'a4', severity: 'warning', indicator: 'CO2', title: 'Cabin CO2 trending upward', observed: '1,850 ppm', baseline: 'Safe range ≤ 2,500 ppm',
    explanation: 'CO2 has risen steadily over 24 hours. It is still inside the safe range but trending toward the warning band.',
    action: 'Check scrubber status and airflow around the sleeping area.', timestamp: ago(180), acknowledged: false },
  { id: 'a5', severity: 'info', indicator: 'Sleep', title: 'Sleep duration slightly below baseline', observed: '6.4 h', baseline: '7.2 h average',
    explanation: 'Last night was about 45 minutes shorter than your usual. One short night is common.',
    action: 'No action needed. Aim for a consistent sleep window.', timestamp: ago(540), acknowledged: false },
  { id: 'a6', severity: 'info', indicator: 'Sync', title: 'Records waiting to sync', observed: '14 records', baseline: 'Synced every 6 h',
    explanation: 'Some readings are stored locally and will upload at the next connection.', action: 'Open MissionSync to sync now.', timestamp: ago(700), acknowledged: true },
];

export const recentEvents = [
  { id: 'e1', time: ago(14), text: 'Heart rate peaked at 92 BPM during rest', type: 'warning' as Status },
  { id: 'e2', time: ago(38), text: 'Radiation dose-rate spike recorded', type: 'critical' as Status },
  { id: 'e3', time: ago(95), text: 'Exercise session completed (30 min)', type: 'normal' as Status },
  { id: 'e4', time: ago(310), text: 'Morning check-in saved', type: 'normal' as Status },
  { id: 'e5', time: ago(540), text: 'Sleep recorded: 6.4 h, quality 3/5', type: 'info' as Status },
];

// ── MindSpace ──
export const sleepWeek = [
  { day: 'Mon', hours: 7.4, quality: 4 }, { day: 'Tue', hours: 7.1, quality: 4 }, { day: 'Wed', hours: 6.9, quality: 3 },
  { day: 'Thu', hours: 7.3, quality: 4 }, { day: 'Fri', hours: 6.6, quality: 3 }, { day: 'Sat', hours: 7.0, quality: 3 }, { day: 'Sun', hours: 6.4, quality: 3 },
];
export const initialMoodHistory = Array.from({ length: 14 }, (_, i) => ({
  id: `m${i}`, label: new Date(now - (13 - i) * 86400000).toLocaleDateString([], { month: 'short', day: 'numeric' }),
  mood: Math.max(1, Math.min(5, Math.round(3.6 + 0.9 * Math.sin(i / 2.4) - (i > 10 ? 0.6 : 0)))),
  stress: Math.round(4 + 1.5 * Math.sin(i / 3) + (i > 10 ? 1.5 : 0)),
  fatigue: Math.round(4 + 1.2 * Math.cos(i / 2.5) + (i > 10 ? 1.5 : 0)),
}));
export const moodLabels = ['Struggling', 'Low', 'Okay', 'Good', 'Great'];
export const behavioralInsights = [
  'Your sleep has been a little shorter over the past three nights. A steady bedtime can help.',
  'Mood has been mostly steady. Check-ins on days with exercise tend to be a point higher.',
  'Stress ratings crept up recently. A short breathing break or a call home may help.',
];

// ── SpaceGuard ──
export const envRanges: Record<'radiation' | 'cumulative' | 'temp' | 'humidity' | 'co2', RangeCfg> = {
  radiation: { unit: 'mSv/day', min: 0, max: 1.2, safeLo: 0, safeHi: 0.6, warnLo: 0, warnHi: 1.0 },
  cumulative: { unit: 'mSv', min: 0, max: 120, safeLo: 0, safeHi: 80, warnLo: 0, warnHi: 100 },
  temp: { unit: '°C', min: 14, max: 32, safeLo: 18, safeHi: 26, warnLo: 15, warnHi: 29 },
  humidity: { unit: '%', min: 10, max: 80, safeLo: 30, safeHi: 60, warnLo: 20, warnHi: 70 },
  co2: { unit: 'ppm', min: 0, max: 5000, safeLo: 0, safeHi: 2500, warnLo: 0, warnHi: 4000 },
};
export const envNow = { radiation: 0.42, cumulative: 74, temp: 22.4, humidity: 48, co2: 1850 };
export const envSeries = Array.from({ length: 48 }, (_, i) => {
  const t = now - (47 - i) * 30 * 60000;
  return {
    label: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    radiation: +(0.32 + 0.07 * Math.sin(i / 5) + (i === 36 ? 0.7 : 0)).toFixed(2),
    co2: Math.round(1500 + 230 * Math.sin(i / 7) + i * 8),
    temp: +(22 + 0.6 * Math.sin(i / 6)).toFixed(1),
    humidity: Math.round(47 + 4 * Math.sin(i / 9)),
  };
});

// ── MissionSync ──
export const initialSync = {
  pending: 14, synced: 2386, lastSync: ago(38),
  history: [
    { id: 's1', time: ago(38), records: 112, result: 'Success', duration: '4.1 s' },
    { id: 's2', time: ago(398), records: 96, result: 'Success', duration: '3.6 s' },
    { id: 's3', time: ago(758), records: 41, result: 'Partial', duration: '6.8 s' },
    { id: 's4', time: ago(1118), records: 118, result: 'Success', duration: '4.4 s' },
  ],
  local: [
    { id: 'l1', name: 'Vitals', records: 1840, size: '3.2 MB' },
    { id: 'l2', name: 'Behavioral check-ins', records: 112, size: '0.2 MB' },
    { id: 'l3', name: 'Environment', records: 420, size: '1.1 MB' },
    { id: 'l4', name: 'Alerts & notes', records: 28, size: '0.1 MB' },
  ],
};

// ── AstroAssist (demo responses) ──
export const suggestions = [
  'What is my current health status?', 'Why has my heart rate increased?', 'How has my sleep changed this week?',
  'What alerts require attention?', 'Summarize my health today.',
];
const answers: [string, string][] = [
  ['status', 'Overall you are stable, with three items worth watching: resting heart rate (85 BPM vs 65 baseline), low HRV (41 ms vs 62) and a raised respiratory rate (17/min vs 14). SpO2 and temperature are close to baseline.'],
  ['heart', 'Your resting heart rate is about 31% above your personal baseline. In the demo data this lines up with shorter sleep over three nights, higher stress ratings and CO2 creeping up in the cabin. These are possible contributors, not a diagnosis.'],
  ['sleep', 'You averaged about 6.9 hours this week, down from your usual 7.2. Sunday was the shortest night at 6.4 hours. Sleep quality has held at 3 to 4 out of 5.'],
  ['alert', 'One critical alert (radiation dose-rate spike, now back in range) and three warnings (heart rate, HRV, CO2 trend) are waiting for acknowledgment. Open Alerts & Triage to review them.'],
  ['summar', 'Today: resting HR elevated, HRV low, sleep a little short, radiation spike recorded earlier and now normal, CO2 trending up but within range. Suggested focus: rest, hydration, and a re-measure in 15 minutes.'],
];
export const demoAnswer = (q: string) => {
  const s = q.toLowerCase();
  return answers.find(([k]) => s.includes(k))?.[1] ??
    'This is a demo assistant with a few prepared answers. Try one of the suggested questions. A live model will answer anything once the backend is connected.';
};
