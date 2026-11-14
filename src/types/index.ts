export type Severity = 'info' | 'warning' | 'critical';
export type Status = 'normal' | Severity;
export type Range = 'LIVE' | '1H' | '6H' | '24H' | '7D' | '30D';
export type Units = 'metric' | 'imperial';

export interface Alert {
  id: string;
  backendId?: number;
  severity: Severity;
  rawSeverity?: string; // e.g. "HIGH", "MEDIUM", "LOW"
  status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  indicator: string;
  title: string;
  observed: string;
  baseline: string;
  explanation: string;
  action: string;
  timestamp: string; // ISO
  acknowledged: boolean;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  astronautId?: number;
  astronautCode?: string;
  metric?: string;
  observedValue?: number;
  thresholdValue?: number;
}

// ── Backend Schema Types ─────────────────────────────────────
export interface Astronaut {
  id: number;
  astronaut_code: string;
  name: string;
  age: number | null;
  mission_id: string | null;
  created_at: string;
}

export interface AstronautCreate {
  astronaut_code: string;
  name: string;
  age?: number | null;
  mission_id?: string | null;
}

export interface AstronautUpdate {
  name?: string | null;
  age?: number | null;
  mission_id?: string | null;
}

export interface VitalReading {
  id: number;
  astronaut_id: number;
  heart_rate: number | null;
  hrv: number | null;
  spo2: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  body_temperature: number | null;
  respiratory_rate: number | null;
  recorded_at: string;
}

export interface VitalReadingCreate {
  astronaut_id: number;
  heart_rate?: number | null;
  hrv?: number | null;
  spo2?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  body_temperature?: number | null;
  respiratory_rate?: number | null;
}

export interface VitalAverages {
  heart_rate: number | null;
  hrv: number | null;
  spo2: number | null;
  body_temperature: number | null;
  respiratory_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
}

export interface VitalSummaryResponse {
  astronaut_id: number;
  astronaut_name: string;
  total_readings: number;
  averages: VitalAverages;
  latest_reading: VitalReading | null;
}

export interface BackendAlert {
  id: number;
  astronaut_id: number;
  vital_reading_id: number | null;
  metric: string;
  observed_value: number;
  threshold_value: number;
  severity: string;
  message: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AlertListResponse {
  alerts: BackendAlert[];
  total: number;
  skip: number;
  limit: number;
}

export interface AlertStatusUpdate {
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
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
