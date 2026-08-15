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
    supervisor: User,
    contactIds?: string[]
  ): Promise<{ batchId: string; result: AllocationResult }> {
    if (!supervisor.teamId) {
      throw new Error('Supervisor does not belong to a valid team.');
    }

    // Fetch team members
    const teamMembers = await userRepository.getByTeamId(supervisor.teamId);
    const activeMembers = teamMembers.filter((m) => m.role === 'TEAM_MEMBER' && m.isActive);

    if (activeMembers.length === 0) {
      throw new Error('No active team members found to receive allocations.');
    }

    // Fetch contacts
    let contactsToAllocate = await contactRepository.getByTeamId(supervisor.teamId);
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
      supervisor.id,
      supervisor.teamId,
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

    // Log action
    await ActivityLogService.logAction({
      userId: supervisor.id,
      userRole: supervisor.role,
      userName: supervisor.fullName,
      teamId: supervisor.teamId,
      action: 'CONTACT_ALLOCATED',
      entityType: 'Allocation',
      entityId: batchId,
      description: `Allocated ${contactsToAllocate.length} contacts across ${activeMembers.length} active team members (Batch #${batchId})`,
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
