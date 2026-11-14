import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;

/** True when VITE_API_BASE_URL is set. Pages fall back to demo data when false. */
export const apiConfigured = Boolean(baseURL);

export const api = axios.create({
  baseURL: baseURL ?? '',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('vyoma_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
