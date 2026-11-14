import { api, setAuthToken } from './api';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  astronaut_id: number;
  email: string;
  name: string;
}

export interface RegisterResponse extends LoginResponse {}

export interface UserProfileResponse {
  astronaut_id: number;
  email: string;
  name: string;
  astronaut_code: string;
  age: number | null;
  mission_id: string | null;
  is_active: boolean;
}

export const login = async (identifier: string, password: string): Promise<LoginResponse> => {
  const res = await api.post<LoginResponse>('/api/auth/login', {
    identifier,
    password,
  });
  if (res.data?.access_token) {
    setAuthToken(res.data.access_token);
  }
  return res.data;
};

export const register = async (
  astronautCode: string | undefined,
  email: string,
  password: string,
  confirmPassword: string,
  name?: string,
): Promise<RegisterResponse> => {
  const payload: Record<string, any> = {
    email,
    password,
    confirm_password: confirmPassword,
  };
  if (astronautCode && astronautCode.trim()) {
    payload.astronaut_code = astronautCode.trim();
  }
  if (name && name.trim()) {
    payload.name = name.trim();
  }

  const res = await api.post<RegisterResponse>('/api/auth/register', payload);
  if (res.data?.access_token) {
    setAuthToken(res.data.access_token);
  }
  return res.data;
};

export const getMe = async (): Promise<UserProfileResponse> => {
  const res = await api.get<UserProfileResponse>('/api/auth/me');
  return res.data;
};

export const logout = async (): Promise<{ message: string }> => {
  try {
    const res = await api.post<{ message: string }>('/api/auth/logout');
    return res.data;
  } finally {
    setAuthToken(null);
  }
};
