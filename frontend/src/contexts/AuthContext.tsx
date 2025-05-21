import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import api from '../services/api';
import jwtDecode from 'jwt-decode';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TokenData {
  exp: number;
  sub: string;
  role: string;
}

interface AuthState {
  token: string;
  refreshToken: string;
  user: User;
}

interface AuthContextData {
  signed: boolean;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateUser: (user: User) => void;
  isTokenExpired: () => boolean;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [data, setData] = useState<AuthState>({} as AuthState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStoredData() {
      const storedToken = localStorage.getItem('token');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedRefreshToken && storedUser) {
        api.defaults.headers.Authorization = `Bearer ${storedToken}`;
        
        setData({
          token: storedToken,
          refreshToken: storedRefreshToken,
          user: JSON.parse(storedUser),
        });
      }

      setLoading(false);
    }

    loadStoredData();
  }, []);

  async function signIn(email: string, password: string) {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      
      const { access_token, refresh_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      api.defaults.headers.Authorization = `Bearer ${access_token}`;
      
      setData({
        token: access_token,
        refreshToken: refresh_token,
        user,
      });
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setData({} as AuthState);
  }

  function updateUser(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
    setData({
      ...data,
      user,
    });
  }

  function isTokenExpired(): boolean {
    if (!data.token) return true;
    
    try {
      const decoded = jwtDecode<TokenData>(data.token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  async function refreshAccessToken(): Promise<boolean> {
    try {
      const response = await api.post('/auth/refresh', { refresh_token: data.refreshToken });
      const { access_token, refresh_token } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      
      api.defaults.headers.Authorization = `Bearer ${access_token}`;
      
      setData({
        ...data,
        token: access_token,
        refreshToken: refresh_token,
      });
      
      return true;
    } catch (error) {
      signOut();
      return false;
    }
  }

  return (
    <AuthContext.Provider
      value={{ 
        signed: !!data.user, 
        user: data.user || null, 
        loading, 
        signIn, 
        signOut, 
        updateUser,
        isTokenExpired,
        refreshAccessToken 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
