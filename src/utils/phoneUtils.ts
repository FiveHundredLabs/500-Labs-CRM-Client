import * as XLSX from 'xlsx';

/**
 * Normalizes Sri Lankan mobile numbers into standard 10-digit local format: 07XXXXXXXX.
 *
 * Rules:
 * - Must start with 07 and be exactly 10 digits.
 * - Strips all spaces, hyphens, brackets, dots, pluses, slashes.
 * - Converts country codes (+94, 0094, 94) to local 0 format: e.g. +94 70 578 7818 -> 0705787818.
 * - Converts numbers without leading 0 (e.g. 705787888 or 70 578 7818) to 0 format: -> 0705787888.
 * - Embedded spaces (e.g. 07 55787818, 0705 787 818) -> 0755787818, 0705787818.
 * - Invalid non-mobile or malformed numbers return null.
 */
export function normalizeSriLankanPhone(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // Remove all non-numeric characters except a leading +
  let clean = str.replace(/[^\d+]/g, '');

  if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }

  // Handle international prefix 0094 (e.g. 0094705787818 -> 0705787818)
  if (clean.startsWith('0094')) {
    clean = clean.slice(4);
    if (!clean.startsWith('0')) {
      clean = '0' + clean;
    }
  }
  // Handle international prefix 94 (e.g. 94705787818 or 940705787818 -> 0705787818)
  else if (clean.startsWith('94')) {
    clean = clean.slice(2);
    if (!clean.startsWith('0')) {
      clean = '0' + clean;
    }
  }
  // Handle 9-digit format without leading 0 (e.g. 705787888 -> 0705787888)
  else if (clean.startsWith('7') && clean.length === 9) {
    clean = '0' + clean;
  }

  // Strict validation: Exactly 10 digits starting with 07 (Sri Lankan mobile number series)
  if (/^07\d{8}$/.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Extracts and normalizes all valid Sri Lankan mobile numbers from a cell or text string.
 * Handles:
 * - Single numbers with or without spaces/formatting
 * - Multiple numbers separated by commas, semicolons, slashes, newlines, spaces, or words
 */
export function extractSriLankanPhonesFromCell(cellValue: any): string[] {
  if (cellValue === null || cellValue === undefined) return [];
  const text = String(cellValue).trim();
  if (!text) return [];

  const foundNumbers = new Set<string>();

  // 1. Direct whole-string match
  const directNorm = normalizeSriLankanPhone(text);
  if (directNorm) {
    foundNumbers.add(directNorm);
    return Array.from(foundNumbers);
  }

  // 2. Split on common multi-number delimiters
  const tokens = text.split(/[\r\n,;/\\]+|\s+(?:and|or|&|\+)\s+/i);
  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const norm = normalizeSriLankanPhone(trimmed);
    if (norm) {
      foundNumbers.add(norm);
    } else {
      // 3. Search for embedded Sri Lankan mobile numbers with spaces or prefixes
      // Regex pattern: +94, 0094, 94, 07, or 7 followed by 8 digits (allowing spaces/dots/hyphens)
      const regex = /(?:(?:\+?94|0094)\s*\(?0?\)?|0)?\s*\(?7[0-8\d]\)?(?:[\s.-]*\d){7}/gi;
      const matches = trimmed.match(regex);
      if (matches) {
        for (const m of matches) {
          const matchNorm = normalizeSriLankanPhone(m);
          if (matchNorm) {
            foundNumbers.add(matchNorm);
          }
        }
      }
    }
  }

  // 4. Whole-text regex fallback if tokens didn't match
  if (foundNumbers.size === 0) {
    const regex = /(?:(?:\+?94|0094)\s*\(?0?\)?|0)?\s*\(?7[0-8\d]\)?(?:[\s.-]*\d){7}/gi;
    const matches = text.match(regex);
    if (matches) {
      for (const m of matches) {
        const matchNorm = normalizeSriLankanPhone(m);
        if (matchNorm) {
          foundNumbers.add(matchNorm);
        }
      }
    }
  }

  return Array.from(foundNumbers);
}

/**
 * Extracts all Sri Lankan mobile numbers from a raw bulk text string (textarea paste).
 */
export function extractPhonesFromBulkText(bulkText: string): string[] {
  if (!bulkText || !bulkText.trim()) return [];

  const rawLines = bulkText.split(/[\r\n]+/);
  const result: string[] = [];

  for (const line of rawLines) {
    const extracted = extractSriLankanPhonesFromCell(line);
    result.push(...extracted);
  }

  return result;
}

export interface ExcelContactParseResult {
  contactNumbers: string[]; // All extracted & normalized numbers
  uniqueContactNumbers: string[]; // Unique numbers extracted from this file
  totalRowsScanned: number;
  contactColumnFound: boolean;
  contactColumnName: string;
  ignoredColumns: string[];
  sampleExtracted: { originalCell: string; normalized: string[] }[];
}

/**
 * Parses an Excel (.xlsx, .xls, .csv) file:
 * 1. Reads ONLY the column named "Contact" (case-insensitive).
 * 2. Ignores all other columns (Name, Address, Email, Company, etc.).
 * 3. Handles multiple numbers in a single cell.
 * 4. Normalizes all numbers into 10-digit format starting with 07.
 */
export async function parseExcelContactSheet(file: File): Promise<ExcelContactParseResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded spreadsheet contains no sheets.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // 2D Array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded spreadsheet is empty.');
  }

  // Find header row and the "Contact" column
  let headerRowIndex = -1;
  let contactColIndex = -1;
  let contactColName = 'Contact';
  const ignoredColumns: string[] = [];

  // Search first 10 rows for header
  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cellText = String(row[c] || '').trim().toLowerCase();
      // Match column with "contact"
      if (cellText === 'contact' || cellText.startsWith('contact') || cellText.includes('contact')) {
        contactColIndex = c;
        headerRowIndex = r;
        contactColName = String(row[c] || 'Contact').trim();
        break;
      }
    }
    if (contactColIndex !== -1) break;
  }

  // Fallback: If no column with "contact", search for "phone" or "mobile"
  if (contactColIndex === -1) {
    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      for (let c = 0; c < row.length; c++) {
        const cellText = String(row[c] || '').trim().toLowerCase();
        if (cellText.includes('phone') || cellText.includes('mobile') || cellText.includes('tel')) {
          contactColIndex = c;
          headerRowIndex = r;
          contactColName = String(row[c] || 'Phone').trim();
          break;
        }
      }
      if (contactColIndex !== -1) break;
    }
  }

  // If still no header found, default to column 0 with data starting at row 0
  if (contactColIndex === -1) {
    headerRowIndex = -1;
    contactColIndex = 0;
    contactColName = 'Column A (Auto-detected)';
  } else {
    // Record ignored columns for user visibility
    const headerRow = rawRows[headerRowIndex];
    headerRow.forEach((col, idx) => {
      if (idx !== contactColIndex && String(col).trim()) {
        ignoredColumns.push(String(col).trim());
      }
    });
  }

  const startRow = headerRowIndex + 1;
  const allExtracted: string[] = [];
  const sampleExtracted: { originalCell: string; normalized: string[] }[] = [];

  let scannedCount = 0;
  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;
    scannedCount++;

    const cellValue = row[contactColIndex];
    if (cellValue === undefined || cellValue === null || String(cellValue).trim() === '') {
      continue;
    }

    const extracted = extractSriLankanPhonesFromCell(cellValue);
    if (extracted.length > 0) {
      allExtracted.push(...extracted);
      if (sampleExtracted.length < 5) {
        sampleExtracted.push({
          originalCell: String(cellValue).trim(),
          normalized: extracted,
        });
      }
    }
  }

  const unique = Array.from(new Set(allExtracted));

  return {
    contactNumbers: allExtracted,
    uniqueContactNumbers: unique,
    totalRowsScanned: scannedCount,
    contactColumnFound: contactColIndex !== -1,
    contactColumnName: contactColName,
    ignoredColumns,
    sampleExtracted,
  };
}
