import apiClient, { markAuthRecovered } from '../lib/apiClient';
import { User } from '../models/domain';

interface LoginResponse {
  data: {
    user: User;
  };
}

interface RefreshResponse {
  data: {
    user: User;
  };
}

export class AuthService {
  /**
   * Login with username/email + password.
   * Backend stores access and refresh tokens as HttpOnly cookies.
   */
  static async login(emailOrUsername: string, password: string): Promise<User> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      emailOrUsername: emailOrUsername.trim(),
      password,
    });

    const { user } = response.data.data;
    markAuthRecovered();
    return user;
  }

  /**
   * Refresh the cookie-backed session.
   */
  static async refresh(): Promise<User> {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh');
    markAuthRecovered();
    return response.data.data.user;
  }

  /**
   * Logout: revoke server session and clear auth cookies.
   */
  static async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }

  /**
   * Fetch the current user's profile from the API.
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<{ data: User }>('/auth/me');
      return response.data.data;
    } catch {
      return null;
    }
  }
}
