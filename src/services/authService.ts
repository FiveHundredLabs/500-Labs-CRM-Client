import apiClient, { tokenStore } from '../lib/apiClient';
import { User } from '../models/domain';

interface LoginResponse {
  data: {
    accessToken: string;
    user: User;
  };
}

interface RefreshResponse {
  data: {
    accessToken: string;
  };
}

export class AuthService {
  /**
   * Login with username/email + password.
   * Stores access token in memory via tokenStore.
   */
  static async login(emailOrUsername: string, password: string): Promise<User> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      emailOrUsername: emailOrUsername.trim(),
      password,
    });

    const { accessToken, user } = response.data.data;
    tokenStore.set(accessToken);
    return user;
  }

  /**
   * Refresh access token using HttpOnly cookie.
   * Returns the new access token on success.
   */
  static async refresh(): Promise<string> {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh');
    const { accessToken } = response.data.data;
    tokenStore.set(accessToken);
    return accessToken;
  }

  /**
   * Logout: revoke server session and clear local token.
   */
  static async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
    tokenStore.clear();
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
