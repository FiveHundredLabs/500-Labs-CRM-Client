import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, UserRole } from '../models/domain';
import { AuthService } from '../services/authService';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  login: (emailOrUsername: string) => Promise<User>;
  logout: () => void;
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
    const active = AuthService.getCurrentUser();
    setUser(active);
    setLoading(false);
  }, []);

  const login = async (emailOrUsername: string): Promise<User> => {
    try {
      const loggedUser = await AuthService.login(emailOrUsername);
      setUser(loggedUser);
      toast.success(`Welcome back, ${loggedUser.fullName}!`);
      return loggedUser;
    } catch (err: any) {
      toast.error(err.message || 'Login failed.');
      throw err;
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    toast.success('Logged out successfully.');
  };

  const value: AuthContextType = {
    user,
    role: user ? user.role : null,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'ADMIN',
    isSupervisor: user?.role === 'SUPERVISOR',
    isTeamMember: user?.role === 'TEAM_MEMBER',
    isFinance: user?.role === 'FINANCE',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
