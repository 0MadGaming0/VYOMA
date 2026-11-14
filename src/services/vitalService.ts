import { api } from './api';
import type {
  VitalReading,
  VitalReadingCreate,
  VitalSummaryResponse,
} from '../types';

export const createVitalReading = async (reading: VitalReadingCreate): Promise<VitalReading> => {
  const res = await api.post<VitalReading>('/api/vitals/', reading);
  return res.data;
};

export const getVitalReadings = async (): Promise<VitalReading[]> => {
  const res = await api.get<VitalReading[]>('/api/vitals/');
  return res.data;
};

export const getVitalReading = async (readingId: number): Promise<VitalReading> => {
  const res = await api.get<VitalReading>(`/api/vitals/${readingId}`);
  return res.data;
};

export const getAstronautVitals = async (astronautId: number): Promise<VitalReading[]> => {
  const res = await api.get<VitalReading[]>(`/api/vitals/astronaut/${astronautId}`);
  return res.data;
};

export interface HistoryParams {
  start_time?: string;
  end_time?: string;
  limit?: number;
}

export const getAstronautVitalHistory = async (
  astronautId: number,
  params?: HistoryParams
): Promise<VitalReading[]> => {
  const res = await api.get<VitalReading[]>(`/api/vitals/astronaut/${astronautId}/history`, {
    params,
  });
  return res.data;
};

export const getAstronautVitalSummary = async (
  astronautId: number
): Promise<VitalSummaryResponse> => {
  const res = await api.get<VitalSummaryResponse>(`/api/vitals/astronaut/${astronautId}/summary`);
  return res.data;
};

export const deleteVitalReading = async (
  readingId: number
): Promise<{ message: string; reading_id: number }> => {
  const res = await api.delete<{ message: string; reading_id: number }>(`/api/vitals/${readingId}`);
  return res.data;
};
