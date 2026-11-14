import type { RangeCfg, Status, Units } from '../types';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export const fmtClock = (d: Date | string | number, hour12 = false) =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12 });

export const fmtDateTime = (d: Date | string | number, hour12 = false) =>
  new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12 });

export const timeAgo = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};

export const toTemp = (c: number, u: Units) => +(u === 'imperial' ? (c * 9) / 5 + 32 : c).toFixed(1);
export const tempUnit = (u: Units) => (u === 'imperial' ? '°F' : '°C');

export const deviation = (cur: number, base: number) => ((cur - base) / base) * 100;

/** Demo thresholds only. NOT clinically validated. */
export const deviationStatus = (pct: number): Status => {
  const a = Math.abs(pct);
  if (a < 5) return 'normal';
  if (a < 15) return 'info';
  if (a < 35) return 'warning';
  return 'critical';
};

export const rangeStatus = (v: number, c: RangeCfg): Status => {
  if (v >= c.safeLo && v <= c.safeHi) return 'normal';
  if (v >= c.warnLo && v <= c.warnHi) return 'warning';
  return 'critical';
};

export const RANK: Record<Status, number> = { critical: 3, warning: 2, info: 1, normal: 0 };

export const pad = (n: number) => String(n).padStart(2, '0');

export const elapsed = (startISO: string) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(startISO).getTime()) / 1000));
  const d = Math.floor(s / 86400);
  return `${d}d ${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};
