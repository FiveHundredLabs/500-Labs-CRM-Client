import { contactRepository } from '../repositories';
import { Contact, User } from '../models/domain';
import { ActivityLogService } from './activityLogService';

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

  static async addManualContact(phone: string, supervisor: User): Promise<Contact> {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      throw new Error('Please enter a valid phone number with at least 7 digits.');
    }

    // Check duplicate
    const existing = await contactRepository.getByPhone(cleanPhone);
    if (existing) {
      throw new Error(`Duplicate entry: Phone number ${cleanPhone} already exists in the system.`);
    }

    const batchId = `batch_imp_manual_${Date.now()}`;
    const newContact = await contactRepository.create({
      phone: cleanPhone,
      status: 'NEW',
      teamId: supervisor.teamId!,
      importedAt: new Date().toISOString(),
      importedBy: supervisor.id,
      importBatchId: batchId,
      isAllocated: false,
      allocatedToId: null,
      allocatedAt: null,
      allocationBatchId: null,
      attemptCount: 0,
      lastCalledAt: null,
    });

    await ActivityLogService.logAction({
      userId: supervisor.id,
      userRole: supervisor.role,
      userName: supervisor.fullName,
      teamId: supervisor.teamId!,
      action: 'CONTACT_IMPORTED',
      entityType: 'Contact',
      entityId: newContact.id,
      description: `Manually added contact number ${cleanPhone}`,
    });

    return newContact;
  }

  static async processBulkImport(
    rawPhones: string[],
    supervisor: User
  ): Promise<{ summary: ImportSummary; executeImport: () => Promise<Contact[]> }> {
    const existingContacts = await contactRepository.getAll();
    const existingPhoneSet = new Set(existingContacts.map((c) => c.phone.trim()));

    const rows: ImportPreviewRow[] = [];
    const validUniquePhones: string[] = [];
    const seenInBatch = new Set<string>();

    let invalidCount = 0;
    let duplicateCount = 0;

    rawPhones.forEach((raw) => {
      const clean = raw.trim();
      // Basic phone format check: 7-15 digits, allowing spaces, hyphens, plus
      const isValid = /^\+?[0-9\s\-()]{7,20}$/.test(clean);

      if (!isValid) {
        invalidCount++;
        rows.push({ phone: raw, isValid: false, isDuplicate: false, reason: 'Invalid phone format' });
        return;
      }

      const isDuplicate = existingPhoneSet.has(clean) || seenInBatch.has(clean);

      if (isDuplicate) {
        duplicateCount++;
        rows.push({ phone: clean, isValid: true, isDuplicate: true, reason: 'Already exists in system' });
      } else {
        seenInBatch.add(clean);
        validUniquePhones.push(clean);
        rows.push({ phone: clean, isValid: true, isDuplicate: false });
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

      const now = new Date().toISOString();
      const contactsToCreate = validUniquePhones.map((phone) => ({
        phone,
        status: 'NEW' as const,
        teamId: supervisor.teamId!,
        importedAt: now,
        importedBy: supervisor.id,
        importBatchId: batchId,
        isAllocated: false,
        allocatedToId: null,
        allocatedAt: null,
        allocationBatchId: null,
        attemptCount: 0,
        lastCalledAt: null,
      }));

      const created = await contactRepository.createMany(contactsToCreate);

      await ActivityLogService.logAction({
        userId: supervisor.id,
        userRole: supervisor.role,
        userName: supervisor.fullName,
        teamId: supervisor.teamId!,
        action: 'CONTACT_IMPORTED',
        entityType: 'Contact',
        entityId: batchId,
        description: `Imported ${created.length} phone numbers via Bulk Import (Batch #${batchId})`,
      });

      return created;
    };

    return { summary, executeImport };
  }
}
