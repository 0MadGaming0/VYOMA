import { api } from './api';
import type { Astronaut, AstronautCreate, AstronautUpdate } from '../types';

export const getAstronauts = async (): Promise<Astronaut[]> => {
  const res = await api.get<Astronaut[]>('/api/astronauts/');
  return res.data;
};

export const getAstronaut = async (id: number): Promise<Astronaut> => {
  const res = await api.get<Astronaut>(`/api/astronauts/${id}`);
  return res.data;
};

export const createAstronaut = async (data: AstronautCreate): Promise<Astronaut> => {
  const res = await api.post<Astronaut>('/api/astronauts/', data);
  return res.data;
};

export const updateAstronaut = async (id: number, data: AstronautUpdate): Promise<Astronaut> => {
  const res = await api.put<Astronaut>(`/api/astronauts/${id}`, data);
  return res.data;
};

export const deleteAstronaut = async (id: number): Promise<{ message: string; astronaut_id: number }> => {
  const res = await api.delete<{ message: string; astronaut_id: number }>(`/api/astronauts/${id}`);
  return res.data;
};
