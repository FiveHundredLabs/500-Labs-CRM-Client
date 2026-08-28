import { contactRepository } from '../repositories';
import { Contact, User } from '../models/domain';
import { ActivityLogService } from './activityLogService';
import { normalizeSriLankanPhone } from '../utils/phoneUtils';

export interface ImportPreviewRow {
  phone: string;
  isValid: boolean;
  isDuplicate: boolean;
  reason?: string;
}

export interface ImportSummary {
  batchId: string;
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  rows: ImportPreviewRow[];
}

export class ContactService {
  static async getContactsByMember(memberId: string): Promise<Contact[]> {
    return contactRepository.getByMemberId(memberId);
  }

  static async getContactsByTeam(teamId: string): Promise<Contact[]> {
    return contactRepository.getByTeamId(teamId);
  }

  static async getUnallocatedContactsByTeam(teamId: string): Promise<Contact[]> {
    const contacts = await contactRepository.getByTeamId(teamId);
    return contacts.filter((c) => !c.isAllocated && c.status === 'NEW');
  }

  static async addManualContact(phone: string, actor: User): Promise<Contact> {
    const normalized = normalizeSriLankanPhone(phone);
    if (!normalized) {
      throw new Error('Please enter a valid Sri Lankan mobile number (e.g., 0705787818, +94 70 578 7818, 705787818).');
    }

    // Check duplicate
    const existing = await contactRepository.getByPhone(normalized);
    if (existing) {
      throw new Error(`Duplicate entry: Phone number ${normalized} already exists in the system.`);
    }

    const isMember = actor.role === 'TEAM_MEMBER';
    const now = new Date().toISOString();
    const batchId = `batch_imp_manual_${Date.now()}`;

    const newContact = await contactRepository.create({
      phone: normalized,
      status: 'NEW',
      teamId: actor.teamId || 'team_001',
      importedAt: now,
      importedBy: actor.id,
      importBatchId: batchId,
      isAllocated: isMember,
      allocatedToId: isMember ? actor.id : null,
      allocatedAt: isMember ? now : null,
      allocationBatchId: isMember ? batchId : null,
      isSelfAdded: isMember,
      addedBy: isMember ? actor.id : undefined,
      allocationSource: isMember ? 'SELF_ADDED' : undefined,
      attemptCount: 0,
      lastCalledAt: null,
    });

    await ActivityLogService.logAction({
      userId: actor.id,
      userRole: actor.role,
      userName: actor.fullName,
      teamId: actor.teamId || 'team_001',
      action: isMember ? 'NUMBER_ADDED' : 'CONTACT_IMPORTED',
      entityType: 'Contact',
      entityId: newContact.id,
      description: isMember
        ? `Team member ${actor.fullName} self-added contact ${normalized}`
        : `Manually added contact number ${normalized}`,
    });

    return newContact;
  }

  static async processBulkImport(
    rawPhones: string[],
    actor: User
  ): Promise<{ summary: ImportSummary; executeImport: () => Promise<Contact[]> }> {
    const existingContacts = await contactRepository.getAll();
    const existingPhoneSet = new Set(existingContacts.map((c) => c.phone.trim()));

    const rows: ImportPreviewRow[] = [];
    const validUniquePhones: string[] = [];
    const seenInBatch = new Set<string>();

    let invalidCount = 0;
    let duplicateCount = 0;

    rawPhones.forEach((raw) => {
      const normalized = normalizeSriLankanPhone(raw);

      if (!normalized) {
        invalidCount++;
        rows.push({
          phone: String(raw).trim(),
          isValid: false,
          isDuplicate: false,
          reason: 'Invalid Sri Lankan mobile number (must be 10 digits starting with 07)',
        });
        return;
      }

      const isDuplicate = existingPhoneSet.has(normalized) || seenInBatch.has(normalized);

      if (isDuplicate) {
        duplicateCount++;
        rows.push({
          phone: normalized,
          isValid: true,
          isDuplicate: true,
          reason: existingPhoneSet.has(normalized) ? 'Already exists in system database' : 'Duplicate in upload file',
        });
      } else {
        seenInBatch.add(normalized);
        validUniquePhones.push(normalized);
        rows.push({ phone: normalized, isValid: true, isDuplicate: false });
      }
    });

    const batchId = `batch_imp_${Date.now()}`;
    const summary: ImportSummary = {
      batchId,
      totalParsed: rawPhones.length,
      validCount: validUniquePhones.length,
      invalidCount,
      duplicateCount,
      rows,
    };

    const executeImport = async (): Promise<Contact[]> => {
      if (validUniquePhones.length === 0) {
        throw new Error('No valid unique phone numbers to import.');
      }

      const isMember = actor.role === 'TEAM_MEMBER';
      const now = new Date().toISOString();
      const contactsToCreate = validUniquePhones.map((phone) => ({
        phone,
        status: 'NEW' as const,
        teamId: actor.teamId || 'team_001',
        importedAt: now,
        importedBy: actor.id,
        importBatchId: batchId,
        isAllocated: isMember,
        allocatedToId: isMember ? actor.id : null,
        allocatedAt: isMember ? now : null,
        allocationBatchId: isMember ? batchId : null,
        isSelfAdded: isMember,
        addedBy: isMember ? actor.id : undefined,
        allocationSource: (isMember ? 'SELF_ADDED' : undefined) as any,
        attemptCount: 0,
        lastCalledAt: null,
      }));

      const created = await contactRepository.createMany(contactsToCreate);

      await ActivityLogService.logAction({
        userId: actor.id,
        userRole: actor.role,
        userName: actor.fullName,
        teamId: actor.teamId || 'team_001',
        action: isMember ? 'NUMBER_ADDED' : 'CONTACT_IMPORTED',
        entityType: 'Contact',
        entityId: batchId,
        description: isMember
          ? `Team member ${actor.fullName} imported and self-allocated ${created.length} numbers (Batch #${batchId})`
          : `Imported ${created.length} phone numbers via Bulk Import (Batch #${batchId})`,
      });

      return created;
    };

    return { summary, executeImport };
  }
}
