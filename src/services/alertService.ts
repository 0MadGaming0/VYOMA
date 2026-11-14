import { api } from './api';
import type { Alert, AlertListResponse, AlertStatusUpdate, BackendAlert, Severity } from '../types';

export interface AlertFilterParams {
  status?: string;
  severity?: string;
  metric?: string;
  astronaut_id?: number;
  skip?: number;
  limit?: number;
}

export const getAlerts = async (params?: AlertFilterParams): Promise<AlertListResponse> => {
  const res = await api.get<AlertListResponse>('/api/alerts/', { params });
  return res.data;
};

export const getAlert = async (alertId: number): Promise<BackendAlert> => {
  const res = await api.get<BackendAlert>(`/api/alerts/${alertId}`);
  return res.data;
};

export const getAstronautAlerts = async (astronautId: number): Promise<BackendAlert[]> => {
  const res = await api.get<BackendAlert[]>(`/api/alerts/astronaut/${astronautId}`);
  return res.data;
};

export const updateAlertStatus = async (
  alertId: number,
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
): Promise<BackendAlert> => {
  const payload: AlertStatusUpdate = { status };
  const res = await api.patch<BackendAlert>(`/api/alerts/${alertId}/status`, payload);
  return res.data;
};

export const mapMetricLabel = (metric: string): string => {
  switch (metric.toLowerCase()) {
    case 'heart_rate':
      return 'Heart Rate';
    case 'spo2':
      return 'Oxygen Saturation (SpO2)';
    case 'body_temperature':
      return 'Body Temperature';
    case 'respiratory_rate':
      return 'Respiratory Rate';
    case 'hrv':
      return 'HRV';
    case 'systolic_bp':
      return 'Systolic BP';
    case 'diastolic_bp':
      return 'Diastolic BP';
    default:
      return metric.charAt(0).toUpperCase() + metric.slice(1).replace(/_/g, ' ');
  }
};

export const mapMetricUnit = (metric: string): string => {
  switch (metric.toLowerCase()) {
    case 'heart_rate':
      return 'BPM';
    case 'spo2':
      return '%';
    case 'body_temperature':
      return '°C';
    case 'respiratory_rate':
      return '/min';
    case 'hrv':
      return 'ms';
    case 'systolic_bp':
    case 'diastolic_bp':
      return 'mmHg';
    default:
      return '';
  }
};

export const mapSeverity = (sev: string): Severity => {
  switch (sev?.toUpperCase()) {
    case 'HIGH':
      return 'critical';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
    default:
      return 'info';
  }
};

export const mapBackendAlertToUi = (a: BackendAlert, astronautCode?: string): Alert => {
  const unit = mapMetricUnit(a.metric);
  const ind = mapMetricLabel(a.metric);
  const isAck = a.status !== 'OPEN';

  let explanation = `Observed ${a.observed_value} ${unit} crossed threshold ${a.threshold_value} ${unit}.`;
  let action = 'Review flight operational guidance and perform biometric re-check.';

  if (a.metric === 'heart_rate') {
    explanation = 'Elevated heart rate reflects cardiovascular workload or acute stress.';
    action = 'Perform 15-minute resting recalibration and check hydration.';
  } else if (a.metric === 'spo2') {
    explanation = 'Desaturation below safety bounds may indicate ventilation or ECLSS degradation.';
    action = 'Check cabin oxygen level, verify sensor placement, and consult flight surgeon.';
  } else if (a.metric === 'body_temperature') {
    explanation = 'Core temperature variance may reflect thermoregulatory strain or infection.';
    action = 'Review module thermal environment and hydrate.';
  } else if (a.metric === 'respiratory_rate') {
    explanation = 'Tachypnea or bradypnea indicates autonomic respiratory shift.';
    action = 'Verify cabin CO2 scrubbers and assess resting calm state.';
  }

  return {
    id: String(a.id),
    backendId: a.id,
    severity: mapSeverity(a.severity),
    rawSeverity: a.severity,
    status: a.status,
    indicator: ind,
    title: a.message,
    observed: `${a.observed_value} ${unit}`.trim(),
    baseline: `Threshold ${a.threshold_value} ${unit}`.trim(),
    explanation,
    action,
    timestamp: a.created_at,
    acknowledged: isAck,
    acknowledgedAt: a.acknowledged_at,
    resolvedAt: a.resolved_at,
    astronautId: a.astronaut_id,
    astronautCode: astronautCode,
    metric: a.metric,
    observedValue: a.observed_value,
    thresholdValue: a.threshold_value,
  };
};
