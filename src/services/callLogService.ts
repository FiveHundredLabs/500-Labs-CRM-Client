import { callLogRepository } from '../repositories';
import { ContactStatus, User, Customer, CallLog } from '../models/domain';
import apiClient from '../lib/apiClient';

export interface SubmitCallResultInput {
  contactId: string;
  status: ContactStatus;
  customerName?: string;
  customerAddress?: string;
  city?: string;
  secondaryMobile?: string;
  customerEmail?: string;
  selectedPackage?: 'ADULT' | 'KIDS' | 'BOTH' | 'NONE' | string;
  adultQty?: number;
  adultUnitPrice?: number;
  adultSubtotal?: number;
  kidsQty?: number;
  kidsUnitPrice?: number;
  kidsSubtotal?: number;
  totalPackageValue?: number;
  codAmount?: number;
  remarks?: string;
  callDurationSeconds?: number;
  isFollowUp?: boolean;
}

export class CallLogService {
  static async submitCallResult(
    input: SubmitCallResultInput,
    member: User
  ): Promise<{ callLog: CallLog; customer: Customer | null }> {
    if (!member.teamId) {
      throw new Error('You must belong to a team before submitting call results.');
    }

    try {
      const response = await apiClient.post<{
        data: { callLog: CallLog; customer: Customer | null };
      }>('/call-logs/submit-result', input);
      return response.data.data;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to record call result.';
      throw new Error(message);
    }
  }

  static async getCallLogsByMember(memberId: string): Promise<CallLog[]> {
    return callLogRepository.getByMemberId(memberId);
  }

  static async getCallLogsByTeam(teamId: string): Promise<CallLog[]> {
    return callLogRepository.getByTeamId(teamId);
  }
}

