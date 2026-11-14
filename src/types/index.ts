export type Severity = 'info' | 'warning' | 'critical';
export type Status = 'normal' | Severity;
export type Range = 'LIVE' | '1H' | '6H' | '24H' | '7D' | '30D';
export type Units = 'metric' | 'imperial';

export interface Alert {
  id: string;
  severity: Severity;
  indicator: string;
  title: string;
  observed: string;
  baseline: string;
  explanation: string;
  action: string;
  timestamp: string; // ISO
  acknowledged: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
  demo?: boolean;
}

export interface Baselines {
  restingHr: number;
  hrv: number;
  spo2: number;
  systolic: number;
  diastolic: number;
  temp: number; // always stored in °C
  resp: number;
}

export interface Settings {
  units: Units;
  hour12: boolean;
  notifyCritical: boolean;
  notifyWarning: boolean;
  notifyInfo: boolean;
  sound: boolean;
  reduceMotion: boolean;
  showDemoBanner: boolean;
}

export interface Profile {
  name: string;
  role: string;
  id: string;
  crew: string;
}

export interface RangeCfg {
  unit: string;
  min: number;
  max: number;
  safeLo: number;
  safeHi: number;
  warnLo: number;
  warnHi: number;
}

export interface FlightNote {
  id: string;
  time: string;
  text: string;
}

export interface MoodEntry {
  id: string;
  label: string;
  mood: number;
  stress: number;
  fatigue: number;
}
