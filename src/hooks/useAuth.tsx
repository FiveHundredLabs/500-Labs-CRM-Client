import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, UserRole } from '../models/domain';
import { AuthService } from '../services/authService';
import { AUTH_EXPIRED_EVENT } from '../lib/apiClient';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  useEffect(() => {
    const init = async () => {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    init();
  }, []);

  const login = async (emailOrUsername: string, password: string): Promise<User> => {
    try {
      const loggedUser = await AuthService.login(emailOrUsername, password);
      setUser(loggedUser);
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
      // Always clear local user state even if the server session is already gone.
    }
    setUser(null);
    toast.success('Logged out successfully.');
  };

  const updateCurrentUser = (updatedUser: User) => {
    setUser(updatedUser);
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
