import AsyncStorage from '@react-native-async-storage/async-storage';

// Android emulator -> host: 10.0.2.2
// iOS simulator   -> host: localhost
// Physical device -> host LAN IP
export const API_BASE = 'https://stock-app-1h93.onrender.com';

let inMemoryToken: string | null = null;

export function setToken(token: string | null): void {
  inMemoryToken = token;
}

export function getToken(): string | null {
  return inMemoryToken;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (inMemoryToken) headers.Authorization = `Bearer ${inMemoryToken}`;

  const res = await fetch(`${API_BASE}/api${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Quote {
  c: number; d: number | null; dp: number | null;
  h: number; l: number; o: number; pc: number; t: number;
}
export interface Stock { symbol: string; name: string; quote: Quote | null }
export interface Candle { c: number[]; t: number[]; s: 'ok' | 'no_data' }
export interface Alert {
  id: string; symbol: string; targetPrice: number;
  condition: 'ABOVE' | 'BELOW'; active: boolean;
  triggeredAt: string | null; createdAt: string;
}
export interface AuthResult { token: string; user: { id: string; email: string } }

export const api = {
  register: (email: string, password: string) =>
    request<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  registerFcmToken: (token: string) =>
    request<void>('/auth/fcm-token', { method: 'POST', body: JSON.stringify({ token }) }),

  listStocks: () => request<{ stocks: Stock[] }>('/stocks').then((r) => r.stocks),

  getCandles: (symbol: string) =>
    request<{ candles: Candle }>(`/stocks/${symbol}/candles`).then((r) => r.candles),

  listAlerts: () => request<{ alerts: Alert[] }>('/alerts').then((r) => r.alerts),

  createAlert: (symbol: string, targetPrice: number, condition: 'ABOVE' | 'BELOW') =>
    request<{ alert: Alert }>('/alerts', {
      method: 'POST',
      body: JSON.stringify({ symbol, targetPrice, condition }),
    }).then((r) => r.alert),

  deleteAlert: (id: string) => request<void>(`/alerts/${id}`, { method: 'DELETE' }),
};

// Persisted auth state
const TOKEN_KEY = 'auth.token';

export async function loadStoredToken(): Promise<string | null> {
  const t = await AsyncStorage.getItem(TOKEN_KEY);
  if (t) setToken(t);
  return t;
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  setToken(token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  setToken(null);
}
