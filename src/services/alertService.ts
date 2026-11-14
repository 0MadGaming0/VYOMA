import { api } from './api';

export const getAlerts = () => api.get('/api/alerts').then((r) => r.data);
export const getActiveAlerts = () => api.get('/api/alerts/active').then((r) => r.data);
export const acknowledgeAlert = (id: string) => api.patch(`/api/alerts/${id}/acknowledge`).then((r) => r.data);
