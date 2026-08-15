import { User, Contact, ContactAllocation } from '../models/domain';

export interface AllocationResult {
  allocations: Array<Omit<ContactAllocation, 'id'>>;
  contactsToUpdate: Array<{ contactId: string; allocatedToId: string; allocationBatchId: string }>;
  summary: Array<{ memberId: string; memberName: string; count: number }>;
}

export interface IAllocationStrategy {
  allocate(
    contacts: Contact[],
    activeMembers: User[],
    supervisorId: string,
    teamId: string,
    batchId: string
  ): AllocationResult;
}

export class RoundRobinAllocationStrategy implements IAllocationStrategy {
  allocate(
    contacts: Contact[],
    activeMembers: User[],
    supervisorId: string,
    teamId: string,
    batchId: string
  ): AllocationResult {
    // 1. Filter out disabled or inactive members
    const validMembers = activeMembers.filter((m) => m.isActive && m.teamId === teamId);
    if (validMembers.length === 0) {
      throw new Error('No active team members available for allocation in this team.');
    }

    if (contacts.length === 0) {
      return { allocations: [], contactsToUpdate: [], summary: [] };
    }

    const now = new Date().toISOString();
    const allocations: Array<Omit<ContactAllocation, 'id'>> = [];
    const contactsToUpdate: Array<{ contactId: string; allocatedToId: string; allocationBatchId: string }> = [];
    const memberCounts: Record<string, number> = {};

    validMembers.forEach((m) => {
      memberCounts[m.id] = 0;
    });

    // 2. Round-Robin Distribution
    contacts.forEach((contact, idx) => {
      const assignedMember = validMembers[idx % validMembers.length];
      memberCounts[assignedMember.id] += 1;

      allocations.push({
        allocationBatchId: batchId,
        contactId: contact.id,
        teamMemberId: assignedMember.id,
        supervisorId,
        teamId,
        allocatedAt: now,
      });

      contactsToUpdate.push({
        contactId: contact.id,
        allocatedToId: assignedMember.id,
        allocationBatchId: batchId,
      });
    });

    const summary = validMembers.map((m) => ({
      memberId: m.id,
      memberName: m.fullName,
      count: memberCounts[m.id] || 0,
    }));

    return {
      allocations,
      contactsToUpdate,
      summary,
    };
  }
}
