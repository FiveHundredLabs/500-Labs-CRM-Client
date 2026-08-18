import { userRepository } from '../repositories';
import { User } from '../models/domain';
import { STORAGE_KEYS } from '../repositories/mock/mockStore';

export class AuthService {
  static getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  static async login(emailOrUsername: string, password?: string): Promise<User> {
    const query = emailOrUsername.trim().toLowerCase();

    const user = await userRepository.getByEmail(query);

    if (!user) {
      throw new Error('Invalid username or email. Please check your credentials.');
    }

    if (!user.isActive) {
      throw new Error('This user account has been disabled. Please contact the administrator.');
    }

    this.setCurrentUser(user);
    return user;
  }

  static logout(): void {
    this.setCurrentUser(null);
  }
}
