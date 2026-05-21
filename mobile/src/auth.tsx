import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, clearToken, loadStoredToken, saveToken } from './api';

interface AuthContextValue {
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadStoredToken().then((t) => {
      setTokenState(t);
      setReady(true);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    await saveToken(res.token);
    setTokenState(res.token);
  };

  const register = async (email: string, password: string) => {
    const res = await api.register(email, password);
    await saveToken(res.token);
    setTokenState(res.token);
  };

  const logout = async () => {
    await clearToken();
    setTokenState(null);
  };

  return (
    <AuthContext.Provider value={{ token, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
