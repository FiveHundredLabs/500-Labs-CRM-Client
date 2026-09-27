import { contactRepository } from '../repositories';
import { Contact, User, DuplicatePhoneCheckResult, DuplicatePhoneIntelligence } from '../models/domain';
import { ActivityLogService } from './activityLogService';
import { normalizeSriLankanPhone } from '../utils/phoneUtils';

export interface ImportPreviewRow {
  id: string;
  phone: string;
  isValid: boolean;
  isDuplicate: boolean;
  isOwnDuplicate?: boolean;
  isClaimableDuplicate?: boolean;
  assignedMemberName?: string;
  notes?: string | null;
  reason?: string;
  intelligence?: DuplicatePhoneIntelligence;
}

export interface ImportSummary {
  batchId: string;
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  ownDuplicateCount: number;
  claimableDuplicateCount: number;
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

  static async checkPhoneDuplicate(phone: string, actor: User): Promise<DuplicatePhoneCheckResult> {
    const normalized = normalizeSriLankanPhone(phone);
    if (!normalized) {
      return {
        exists: false,
        isOwnedBySelf: false,
        message: 'Invalid Sri Lankan mobile format. Must be 10 digits starting with 07.',
      };
    }

    return contactRepository.checkDuplicate({
      phone: normalized,
      memberId: actor.id,
      teamId: actor.teamId || undefined,
    });
  }

  static async addPersonalContact(
    phone: string,
    actor: User,
    city?: string,
    secondaryMobile?: string,
    code?: string
  ): Promise<Contact> {
    const normalized = normalizeSriLankanPhone(phone);
    if (!normalized) {
      throw new Error('Please enter a valid Sri Lankan mobile number (e.g., 0705787818, +94 70 578 7818, 705787818).');
    }

    const dupCheck = await this.checkPhoneDuplicate(normalized, actor);
    if (dupCheck.exists && dupCheck.isOwnedBySelf) {
      throw new Error(`Duplicate rejected: Phone number ${normalized} is already in your profile.`);
    }
    if (!actor.teamId) {
      throw new Error('Your account is not assigned to a team. Please contact an administrator.');
    }

    const newContact = await contactRepository.addPersonalNumber({
      phone: normalized,
      memberId: actor.id,
      teamId: actor.teamId,
      city,
      secondaryMobile,
      code: code?.trim() || undefined,
    });

    await ActivityLogService.logAction({
      userId: actor.id,
      userRole: actor.role,
      userName: actor.fullName,
      teamId: actor.teamId,
      action: 'NUMBER_ADDED',
      entityType: 'Contact',
      entityId: newContact.id,
      description: dupCheck.exists
        ? `Team member ${actor.fullName} claimed/added existing contact ${normalized} [Code: ${code || 'N/A'}] (previously in CRM under ${dupCheck.intelligence?.assignedMemberName || 'another rep'})`
        : `Team member ${actor.fullName} added personal contact ${normalized} [Code: ${code || 'N/A'}]`,
    });

    return newContact;
  }

  static async addManualContact(phone: string, actor: User, code?: string): Promise<Contact> {
    return this.addPersonalContact(phone, actor, undefined, undefined, code);
  }

  static async processBulkImport(
    rawPhones: string[],
    actor: User,
    includeClaimablePhones: string[] = []
  ): Promise<{ summary: ImportSummary; executeImport: (batchCode?: string, overridePhones?: string[]) => Promise<Contact[]> }> {
    // 1. Gather all normalized valid candidate phones
    const normalizedCandidates: { raw: string; normalized: string | null }[] = rawPhones.map((raw) => ({
      raw,
      normalized: normalizeSriLankanPhone(raw),
    }));

    const validCandidatePhones = Array.from(
      new Set(
        normalizedCandidates
          .map((c) => c.normalized)
          .filter((p): p is string => Boolean(p))
      )
    );

    // 2. Perform batch duplicate check against database/storage
    let dupBatchResults: Record<string, DuplicatePhoneCheckResult> = {};
    if (validCandidatePhones.length > 0) {
      if (typeof contactRepository.checkDuplicatesBatch === 'function') {
        try {
          dupBatchResults = await contactRepository.checkDuplicatesBatch({
            phones: validCandidatePhones,
            memberId: actor.id,
            teamId: actor.teamId || undefined,
          });
        } catch {
          // Fallback if network issue
          dupBatchResults = {};
        }
      } else {
        // Fallback to checking via checkDuplicate
        const checks = await Promise.all(
          validCandidatePhones.map(async (phone) => {
            const res = await contactRepository.checkDuplicate({
              phone,
              memberId: actor.id,
              teamId: actor.teamId || undefined,
            });
            return { phone, res };
          })
        );
        checks.forEach(({ phone, res }) => {
          dupBatchResults[phone] = res;
        });
      }
    }

    const rows: ImportPreviewRow[] = [];
    const validNewPhones: string[] = [];
    const claimablePhones: string[] = [];
    const seenInBatch = new Set<string>();

    let invalidCount = 0;
    let ownDuplicateCount = 0;
    let claimableDuplicateCount = 0;

    normalizedCandidates.forEach(({ raw, normalized }, index) => {
      const rowId = `row_${index}_${normalized || raw}`;

      if (!normalized) {
        invalidCount++;
        rows.push({
          id: rowId,
          phone: String(raw).trim(),
          isValid: false,
          isDuplicate: false,
          reason: 'Invalid Sri Lankan mobile number (must be 10 digits starting with 07)',
        });
        return;
      }

      if (seenInBatch.has(normalized)) {
        rows.push({
          id: rowId,
          phone: normalized,
          isValid: false,
          isDuplicate: true,
          isOwnDuplicate: true,
          reason: 'Duplicate within this import file/batch',
        });
        return;
      }
      seenInBatch.add(normalized);

      const checkResult = dupBatchResults[normalized];

      // 1. Duplicate in user's own account: automatically identify and exclude
      if (checkResult?.isOwnedBySelf) {
        ownDuplicateCount++;
        rows.push({
          id: rowId,
          phone: normalized,
          isValid: false,
          isDuplicate: true,
          isOwnDuplicate: true,
          reason: 'Already exists in your personal queue (automatically excluded)',
        });
        return;
      }

      // 2. Duplicate within team / another team member's account:
      // Display warning showing who owns it + notes, do NOT automatically remove.
      if (checkResult?.exists && !checkResult?.isOwnedBySelf) {
        claimableDuplicateCount++;
        claimablePhones.push(normalized);
        const intel = checkResult.intelligence;
        const owner = intel?.assignedMemberName || 'Another Team Specialist';
        const notes = intel?.notes || intel?.lastCallRemarks || 'No previous notes';
        rows.push({
          id: rowId,
          phone: normalized,
          isValid: true,
          isDuplicate: true,
          isClaimableDuplicate: true,
          assignedMemberName: owner,
          notes,
          reason: `Owned by ${owner} • Notes: "${notes}"`,
          intelligence: intel,
        });
        return;
      }

      // 3. Brand new valid phone
      validNewPhones.push(normalized);
      rows.push({
        id: rowId,
        phone: normalized,
        isValid: true,
        isDuplicate: false,
        reason: 'Brand new number',
      });
    });

    const defaultPhonesToImport = Array.from(new Set([...validNewPhones, ...includeClaimablePhones]));
    const batchId = `batch_imp_${Date.now()}`;

    const summary: ImportSummary = {
      batchId,
      totalParsed: rawPhones.length,
      validCount: validNewPhones.length,
      invalidCount,
      duplicateCount: ownDuplicateCount + claimableDuplicateCount,
      ownDuplicateCount,
      claimableDuplicateCount,
      rows,
    };

    const executeImport = async (batchCode?: string, overridePhones?: string[]): Promise<Contact[]> => {
      const finalPhonesToImport = overridePhones !== undefined ? overridePhones : defaultPhonesToImport;

      if (finalPhonesToImport.length === 0) {
        throw new Error('No valid phone numbers selected to import.');
      }
      if (!actor.teamId) {
        throw new Error('Select a real team before importing contacts.');
      }

      const isMember = actor.role === 'TEAM_MEMBER';
      let created: Contact[];

      if (isMember) {
        created = await Promise.all(
          finalPhonesToImport.map((phone) =>
            contactRepository.addPersonalNumber({
              phone,
              memberId: actor.id,
              teamId: actor.teamId!,
              code: batchCode?.trim() || undefined,
            })
          )
        );
      } else {
        const now = new Date().toISOString();
        const contactsToCreate = finalPhonesToImport.map((phone) => ({
          phone,
          code: batchCode?.trim() || undefined,
          status: 'NEW' as const,
          teamId: actor.teamId!,
          importedAt: now,
          importedBy: actor.id,
          importBatchId: batchId,
          isAllocated: false,
          allocatedToId: null,
          allocatedAt: null,
          allocationBatchId: null,
          isSelfAdded: false,
          addedBy: undefined,
          allocationSource: undefined,
          attemptCount: 0,
          lastCalledAt: null,
        }));
        created = await contactRepository.createMany(contactsToCreate);
      }

      await ActivityLogService.logAction({
        userId: actor.id,
        userRole: actor.role,
        userName: actor.fullName,
        teamId: actor.teamId,
        action: isMember ? 'NUMBER_ADDED' : 'CONTACT_IMPORTED',
        entityType: 'Contact',
        entityId: batchId,
        description: isMember
          ? `Team member ${actor.fullName} imported and allocated ${created.length} numbers [Batch Code: ${batchCode || 'N/A'}] (Batch #${batchId})`
          : `Imported ${created.length} phone numbers via Bulk Import [Batch Code: ${batchCode || 'N/A'}] (Batch #${batchId})`,
      });

      return created;
    };

    return { summary, executeImport };
  }
}
