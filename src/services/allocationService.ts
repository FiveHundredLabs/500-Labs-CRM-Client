import {
  contactRepository,
  allocationRepository,
  userRepository,
} from '../repositories';
import { User, ContactAllocation } from '../models/domain';
import { RoundRobinAllocationStrategy, AllocationResult } from './allocationStrategy';
import { ActivityLogService } from './activityLogService';

export class AllocationService {
  static async allocateTeamContacts(
    actor: User,
    targetMemberIds?: string[],
    contactIds?: string[]
  ): Promise<{ batchId: string; result: AllocationResult }> {
    if (!actor.teamId) {
      throw new Error('Please select a valid team before allocating contacts.');
    }

    // Fetch team members
    const teamMembers = await userRepository.getByTeamId(actor.teamId);
    let activeMembers = teamMembers.filter((m) => m.role === 'TEAM_MEMBER' && m.isActive);

    if (targetMemberIds && targetMemberIds.length > 0) {
      activeMembers = activeMembers.filter((m) => targetMemberIds.includes(m.id));
    }

    if (activeMembers.length === 0) {
      throw new Error('No selected active team members found to receive allocations.');
    }

    // Fetch contacts
    let contactsToAllocate = await contactRepository.getByTeamId(actor.teamId);
    contactsToAllocate = contactsToAllocate.filter((c) => !c.isAllocated && c.status === 'NEW');

    if (contactIds && contactIds.length > 0) {
      contactsToAllocate = contactsToAllocate.filter((c) => contactIds.includes(c.id));
    }

    if (contactsToAllocate.length === 0) {
      throw new Error('No unallocated contacts available for distribution.');
    }

    const batchId = `batch_alc_${Date.now()}`;
    const strategy = new RoundRobinAllocationStrategy();
    const result = strategy.allocate(
      contactsToAllocate,
      activeMembers,
      actor.id,
      actor.teamId,
      batchId
    );

    // Save allocation batch records
    await allocationRepository.createMany(result.allocations);

    // Update contacts in store
    const now = new Date().toISOString();
    for (const update of result.contactsToUpdate) {
      await contactRepository.update(update.contactId, {
        isAllocated: true,
        allocatedToId: update.allocatedToId,
        allocatedAt: now,
        allocationBatchId: update.allocationBatchId,
      });
    }

    // Log action attributing to actual actor (ADMIN or SUPERVISOR)
    await ActivityLogService.logAction({
      userId: actor.id,
      userRole: actor.role,
      userName: actor.fullName,
      teamId: actor.teamId,
      action: 'CONTACT_ALLOCATED',
      entityType: 'Allocation',
      entityId: batchId,
      description: `Allocated ${contactsToAllocate.length} contacts across ${activeMembers.length} selected team members (Batch #${batchId})`,
    });

    return { batchId, result };
  }

  static async getAllocationsByBatch(batchId: string): Promise<ContactAllocation[]> {
    return allocationRepository.getByBatchId(batchId);
  }

  static async getAllAllocations(): Promise<ContactAllocation[]> {
    return allocationRepository.getAll();
  }
}
