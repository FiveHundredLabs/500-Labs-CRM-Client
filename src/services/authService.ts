import { userRepository } from '../repositories';
import { User } from '../models/domain';
import { STORAGE_KEYS } from '../repositories/mock/mockStore';
import usersSeed from '../data/seed/users.json';

const ROLE_PASSWORDS: Record<string, string[]> = {
  ADMIN: ['admin1234', 'password123', 'admin'],
  SUPERVISOR: ['supervisor1234', 'password123', 'supervisor'],
  TEAM_MEMBER: ['member1234', 'password123', 'member'],
  FINANCE: ['finance1234', 'password123', 'finance'],
};

export class AuthService {
  static getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) {
      // Default auto-login as Pathum Nishshanka (Team Member) for seamless demo
      const defaultUser = (usersSeed as User[]).find((u) => u.id === 'usr_mem_01') || (usersSeed as User[])[0];
      if (defaultUser) {
        this.setCurrentUser(defaultUser);
        return defaultUser;
      }
      return null;
    }
    try {
      const cached = JSON.parse(raw);
      // Sync cached user with latest seed user details
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

  static async login(emailOrUsername: string, password?: string): Promise<User> {
    const query = emailOrUsername.trim().toLowerCase();

    // Map common aliases
    let targetEmail = query;
    if (query === 'supervisor@crm.com' || query === 'supervisor.alpha@crm.com' || query === 'supervisor') {
      targetEmail = 'supervisor@gmail.com';
    } else if (query === 'admin') {
      targetEmail = 'admin@crm.com';
    } else if (query === 'member' || query === 'member.a1@crm.com') {
      targetEmail = 'member@crm.com';
    } else if (query === 'finance') {
      targetEmail = 'finance@crm.com';
    }

    let user = await userRepository.getByEmail(targetEmail);

    if (!user) {
      // Fallback search in seed
      const seedUser = (usersSeed as User[]).find(
        (u) =>
          u.email.toLowerCase() === targetEmail ||
          u.username.toLowerCase() === targetEmail ||
          u.email.toLowerCase() === query ||
          u.username.toLowerCase() === query
      );
      if (seedUser) {
        user = seedUser;
      }
    }

    if (!user) {
      throw new Error('Invalid username or email. Please check your credentials.');
    }

    if (!user.isActive) {
      throw new Error('This user account has been disabled. Please contact the administrator.');
    }

    // Validate password if provided
    if (password && password.trim()) {
      const allowedPasswords = ROLE_PASSWORDS[user.role] || ['password123'];
      const pwd = password.trim();
      if (!allowedPasswords.includes(pwd) && pwd !== 'admin1234' && pwd !== 'supervisor1234' && pwd !== 'member1234' && pwd !== 'finance1234' && pwd !== 'password123') {
        throw new Error(`Invalid password for ${user.role}. Please check your password.`);
      }
    }

    this.setCurrentUser(user);
    return user;
  }

  static logout(): void {
    this.setCurrentUser(null);
  }
}
