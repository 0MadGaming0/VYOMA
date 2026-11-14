import { api } from './api';

export const login = (username: string, password: string) =>
  api.post('/api/auth/login', { username, password }).then((r) => r.data);

export const getProfile = () => api.get('/api/auth/profile').then((r) => r.data);
