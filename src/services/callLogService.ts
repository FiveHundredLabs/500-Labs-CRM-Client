import {
  contactRepository,
  callLogRepository,
  customerRepository,
} from '../repositories';
import { ContactStatus, User, Customer, CallLog } from '../models/domain';
import { ActivityLogService } from './activityLogService';

export interface SubmitCallResultInput {
  contactId: string;
  status: ContactStatus;
  customerName?: string;
  customerAddress?: string;
  customerEmail?: string;
  remarks?: string;
  callDurationSeconds?: number;
}

export class CallLogService {
  static async submitCallResult(
    input: SubmitCallResultInput,
    member: User
  ): Promise<{ callLog: CallLog; customer: Customer | null }> {
    const contact = await contactRepository.getById(input.contactId);
    if (!contact) throw new Error('Contact not found');

    const now = new Date().toISOString();

    // 1. Create Call Log
    const callLog = await callLogRepository.create({
      contactId: input.contactId,
      teamMemberId: member.id,
      teamId: member.teamId!,
      status: input.status,
      customerName: input.customerName,
      customerAddress: input.customerAddress,
      customerEmail: input.customerEmail,
      remarks: input.remarks,
      callDurationSeconds: input.callDurationSeconds || 60,
      calledAt: now,
    });

    // 2. Update Contact status & attempt count
    await contactRepository.update(input.contactId, {
      status: input.status,
      attemptCount: (contact.attemptCount || 0) + 1,
      lastCalledAt: now,
    });

    let createdOrUpdatedCustomer: Customer | null = null;

    // 3. If customer details are provided (or status is INTERESTED), create/update Customer record
    if (input.status === 'INTERESTED' || (input.customerName && input.customerAddress)) {
      if (input.status === 'INTERESTED' && (!input.customerName || !input.customerAddress)) {
        throw new Error('Customer Name and Address are required when status is INTERESTED.');
      }

      if (input.customerName && input.customerAddress) {
        const existingCustomer = await customerRepository.getByContactId(input.contactId);
        if (existingCustomer) {
          createdOrUpdatedCustomer = await customerRepository.update(existingCustomer.id, {
            fullName: input.customerName,
            address: input.customerAddress,
            email: input.customerEmail || existingCustomer.email,
          });
        } else {
          createdOrUpdatedCustomer = await customerRepository.create({
            contactId: input.contactId,
            fullName: input.customerName,
            phone: contact.phone,
            address: input.customerAddress,
            email: input.customerEmail,
            teamId: member.teamId!,
            responsibleTeamMemberId: member.id,
            supervisorId: member.supervisorId || '',
          });
        }

        await ActivityLogService.logAction({
          userId: member.id,
          userRole: member.role,
          userName: member.fullName,
          teamId: member.teamId!,
          action: 'CUSTOMER_CREATED',
          entityType: 'Customer',
          entityId: createdOrUpdatedCustomer.id,
          description: `Customer record captured for ${createdOrUpdatedCustomer.fullName} (${contact.phone})`,
        });
      }
    }

    // 4. Log call completed action
    await ActivityLogService.logAction({
      userId: member.id,
      userRole: member.role,
      userName: member.fullName,
      teamId: member.teamId!,
      action: 'CALL_COMPLETED',
      entityType: 'CallLog',
      entityId: callLog.id,
      description: `Completed call for ${contact.phone} -> ${input.status}`,
    });

    return { callLog, customer: createdOrUpdatedCustomer };
  }

  static async getCallLogsByMember(memberId: string): Promise<CallLog[]> {
    return callLogRepository.getByMemberId(memberId);
  }

  static async getCallLogsByTeam(teamId: string): Promise<CallLog[]> {
    return callLogRepository.getByTeamId(teamId);
  }
}
