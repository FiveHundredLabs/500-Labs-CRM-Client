import {
  contactRepository,
  callLogRepository,
  customerRepository,
  orderRepository,
} from '../repositories';
import { ContactStatus, User, Customer, CallLog } from '../models/domain';
import { ActivityLogService } from './activityLogService';

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
      city: input.city,
      secondaryMobile: input.secondaryMobile,
      customerEmail: input.customerEmail,
      selectedPackage: input.selectedPackage,
      adultQty: input.adultQty,
      adultUnitPrice: input.adultUnitPrice,
      adultSubtotal: input.adultSubtotal,
      kidsQty: input.kidsQty,
      kidsUnitPrice: input.kidsUnitPrice,
      kidsSubtotal: input.kidsSubtotal,
      totalPackageValue: input.totalPackageValue,
      codAmount: input.codAmount,
      remarks: input.remarks,
      callDurationSeconds: input.callDurationSeconds || 60,
      isFollowUp: input.isFollowUp,
      calledAt: now,
    });

    // 2. Update Contact status, attempt count, city, secondaryMobile & isFollowUp state
    await contactRepository.update(input.contactId, {
      status: input.status,
      attemptCount: (contact.attemptCount || 0) + 1,
      lastCalledAt: now,
      city: input.city || contact.city,
      secondaryMobile: input.secondaryMobile || contact.secondaryMobile,
      isFollowUp: input.isFollowUp !== undefined ? input.isFollowUp : contact.isFollowUp,
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
            city: input.city || existingCustomer.city,
            secondaryMobile: input.secondaryMobile || existingCustomer.secondaryMobile,
            email: input.customerEmail || existingCustomer.email,
          });
        } else {
          createdOrUpdatedCustomer = await customerRepository.create({
            contactId: input.contactId,
            fullName: input.customerName,
            phone: contact.phone,
            secondaryMobile: input.secondaryMobile,
            city: input.city,
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

        // If package items were selected, prepare an order record in DRAFT/PREPARED state
        if (input.totalPackageValue || input.codAmount) {
          const itemsDesc = [];
          if (input.adultQty) itemsDesc.push(`Adult Package x ${input.adultQty}`);
          if (input.kidsQty) itemsDesc.push(`Kids Package x ${input.kidsQty}`);
          
          await orderRepository.create({
            orderNumber: `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            customerId: createdOrUpdatedCustomer.id,
            teamId: member.teamId!,
            teamMemberId: member.id,
            supervisorId: member.supervisorId || '',
            status: 'PREPARED',
            itemsDescription: itemsDesc.join(', ') || 'Package Order',
            selectedPackage: input.selectedPackage || 'ADULT',
            adultQty: input.adultQty || 0,
            adultUnitPrice: input.adultUnitPrice || 6000,
            adultSubtotal: input.adultSubtotal || 0,
            kidsQty: input.kidsQty || 0,
            kidsUnitPrice: input.kidsUnitPrice || 3500,
            kidsSubtotal: input.kidsSubtotal || 0,
            totalPackageValue: input.totalPackageValue || 0,
            codAmount: input.codAmount || input.totalPackageValue || 0,
            totalAmount: input.codAmount || input.totalPackageValue || 0,
            currency: 'LKR',
            remarks: input.remarks,
          });
        }
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

