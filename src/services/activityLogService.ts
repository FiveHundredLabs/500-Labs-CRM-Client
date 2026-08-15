import { activityLogRepository } from '../repositories';
import { ActivityLog, UserRole } from '../models/domain';

export class ActivityLogService {
  static async logAction(params: {
    userId: string;
    userRole: UserRole;
    userName: string;
    teamId?: string;
    action: ActivityLog['action'];
    entityType: ActivityLog['entityType'];
    entityId: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<ActivityLog> {
    return activityLogRepository.create({
      userId: params.userId,
      userRole: params.userRole,
      userName: params.userName,
      teamId: params.teamId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      metadata: params.metadata,
    });
  }

  static async getAllLogs(): Promise<ActivityLog[]> {
    return activityLogRepository.getAll();
  }

  static async getLogsByUser(userId: string): Promise<ActivityLog[]> {
    return activityLogRepository.getByUserId(userId);
  }
}
