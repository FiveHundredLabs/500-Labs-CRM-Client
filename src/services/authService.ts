import { userRepository } from '../repositories';
import { User } from '../models/domain';
import { STORAGE_KEYS } from '../repositories/mock/mockStore';
import usersSeed from '../data/seed/users.json';

export class AuthService {
  static getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) {
      // Default auto-login as Pathum Nishshanka (Team Member 1) for seamless demo
      const defaultUser = (usersSeed as User[]).find((u) => u.id === 'usr_mem_01') || (usersSeed as User[])[0];
      if (defaultUser) {
        this.setCurrentUser(defaultUser);
        return defaultUser;
      }
      return null;
    }
    try {
      const cached = JSON.parse(raw);
      // Sync cached user with latest seed user details (e.g. Sri Lankan names)
      const matchedSeed = (usersSeed as User[]).find((u) => u.id === cached.id || u.email === cached.email);
      if (matchedSeed) {
        this.setCurrentUser(matchedSeed);
        return matchedSeed;
      }
      return cached;
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

  static async login(emailOrUsername: string): Promise<User> {
    const user = await userRepository.getByEmail(emailOrUsername);
    if (!user) {
      // Fallback search in seed if localStorage was stale
      const seedUser = (usersSeed as User[]).find(
        (u) => u.email.toLowerCase() === emailOrUsername.toLowerCase() || u.username.toLowerCase() === emailOrUsername.toLowerCase()
      );
      if (seedUser) {
        this.setCurrentUser(seedUser);
        return seedUser;
      }
      throw new Error('User account not found. Please check credentials.');
    }
    if (!user.isActive) {
      throw new Error('This user account has been disabled. Please contact administrator.');
    }
    this.setCurrentUser(user);
    return user;
  }

  static logout(): void {
    this.setCurrentUser(null);
  }
}
