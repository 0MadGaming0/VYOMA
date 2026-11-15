import { api } from './api';
import * as vitalService from './vitalService';
import * as alertService from './alertService';
import * as astronautService from './astronautService';

export { vitalService, alertService, astronautService };

// System health checks
export const getSystemHealth = async () => {
  const res = await api.get<{ status: string; system: string; message: string }>('/api/health');
  return res.data;
};

export const getDatabaseHealth = async () => {
  const res = await api.get<{ status: string; database: string; message: string }>('/api/health/db');
  return res.data;
};

// Re-export vital functions for backward compatibility
export const getLatestVitals = async (astronautId?: number) => {
  if (astronautId) {
    return vitalService.getAstronautVitalSummary(astronautId);
  }
  return vitalService.getVitalReadings();
};

export const getVitalsHistory = async (astronautId: number, limit = 50) => {
  return vitalService.getAstronautVitalHistory(astronautId, { limit });
};

export const postVitals = vitalService.createVitalReading;

// AI assistant chat (calls endpoint if available, otherwise handled by AstroAssist fallback)
export interface AssistantChatResponse {
  reply: string;
  astronaut_id?: number;
  astronaut_code?: string;
  context_used?: any;
  suggested_actions?: string[];
}

export const sendChat = (
  message: string,
  astronautId?: number,
  history?: Array<{ role: string; content: string }>
): Promise<AssistantChatResponse> =>
  api.post<AssistantChatResponse>('/api/assistant/chat', {
    message,
    astronaut_id: astronautId,
    history,
  }).then((r) => r.data);
