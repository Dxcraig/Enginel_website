'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import AuthService from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const loadUser = async () => {
      const currentUser = AuthService.getCurrentUser();
      const hasToken = AuthService.isAuthenticated();
      
      if (currentUser && hasToken) {
        // Trust the stored user data - don't verify on every page load
        // The API client will handle 401s and refresh tokens automatically
        console.log('Restoring user session from localStorage');
        setUser(currentUser);
      } else {
        console.log('No valid session found');
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    const userData = await AuthService.login({ username, password });
    setUser(userData);
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const userData = await AuthService.getCurrentUserFromAPI();
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
