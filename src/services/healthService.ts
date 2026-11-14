import { api } from './api';

// Endpoint paths follow the brief. Confirm payload shapes with the backend owner
// before wiring them into pages, then add types in src/types.
const get = <T = unknown>(url: string, params?: object) => api.get<T>(url, { params }).then((r) => r.data);
const post = <T = unknown>(url: string, body?: object) => api.post<T>(url, body).then((r) => r.data);

// Vitals
export const getLatestVitals = () => get('/api/vitals/latest');
export const getVitalsHistory = (range: string) => get('/api/vitals/history', { range });
export const postVitals = (payload: object) => post('/api/vitals', payload);

// Behavioral health
export const getBehavioralHistory = () => get('/api/behavioral-health/history');
export const postBehavioral = (payload: object) => post('/api/behavioral-health', payload);

// Environment
export const getLatestEnvironment = () => get('/api/environment/latest');
export const getEnvironmentHistory = () => get('/api/environment/history');

// Health analysis
export const getLatestAnalysis = () => get('/api/health-analysis/latest');
export const requestAnalysis = (payload: object) => post('/api/health-analysis', payload);

// AI assistant
export const sendChat = (message: string) => post<{ reply: string }>('/api/assistant/chat', { message });
export const getAssistantSummary = () => get('/api/assistant/summary');

// Synchronization
export const getSyncStatus = () => get('/api/sync/status');
export const startSync = () => post('/api/sync');
