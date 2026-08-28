import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, UserRole } from '../models/domain';
import { AuthService } from '../services/authService';
import toast from 'react-hot-toast';

const USER_STORAGE_KEY = 'crm_current_user';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateCurrentUser: (updatedUser: User) => void;
  isAdmin: boolean;
  isSupervisor: boolean;
  isTeamMember: boolean;
  isFinance: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // On app load: try to restore user from localStorage and validate via /auth/me
  useEffect(() => {
    const init = async () => {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      if (cached) {
        try {
          const parsed: User = JSON.parse(cached);
          setUser(parsed);
          // Silently try token refresh to get a fresh access token
          const refreshed = await AuthService.refresh().catch(() => null);
          if (!refreshed) {
            // Refresh failed — clear stale user
            setUser(null);
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        } catch {
          setUser(null);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (emailOrUsername: string, password: string): Promise<User> => {
    try {
      const loggedUser = await AuthService.login(emailOrUsername, password);
      setUser(loggedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser));
      toast.success(`Welcome back, ${loggedUser.fullName}!`);
      return loggedUser;
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Login failed. Check your credentials.';
      toast.error(message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch {
      // Ignore logout API errors — always clear local state
    }
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    toast.success('Logged out successfully.');
  };

  const updateCurrentUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    role: user ? user.role : null,
    loading,
    login,
    logout,
    updateCurrentUser,
    isAdmin: user?.role === 'ADMIN',
    isSupervisor: user?.role === 'SUPERVISOR',
    isTeamMember: user?.role === 'TEAM_MEMBER',
    isFinance: user?.role === 'FINANCE',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
