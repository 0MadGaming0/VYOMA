import axios from 'axios';

const envBase = import.meta.env.VITE_API_BASE_URL;
export const baseURL = envBase || (import.meta.env.DEV ? 'http://localhost:8000' : '');

/** True when an API URL is available. */
export const apiConfigured = Boolean(baseURL);

export const api = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// In-memory token storage (with short-lived sessionStorage fallback for page refreshes)
// We DO NOT store long-lived tokens in localStorage.
let memoryToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  memoryToken = token;
  if (token) {
    sessionStorage.setItem('vyoma_session_token', token);
  } else {
    sessionStorage.removeItem('vyoma_session_token');
  }
};

export const getAuthToken = (): string | null => {
  return memoryToken || sessionStorage.getItem('vyoma_session_token');
};

api.interceptors.request.use((cfg) => {
  const token = getAuthToken();
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});
