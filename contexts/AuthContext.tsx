import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { artemisApi } from '../api/artemisClient';

type AuthContextType = {
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@artemis_token');
      if (storedToken) {
        setToken(storedToken);
        artemisApi.setToken(storedToken);
      }
    } catch (e) {
      console.warn('Failed to load token', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (newToken: string) => {
    try {
      await AsyncStorage.setItem('@artemis_token', newToken);
      setToken(newToken);
      artemisApi.setToken(newToken);
    } catch (e) {
      console.warn('Failed to save token', e);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@artemis_token');
      setToken(null);
      artemisApi.setToken(null);
    } catch (e) {
      console.warn('Failed to remove token', e);
    }
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
