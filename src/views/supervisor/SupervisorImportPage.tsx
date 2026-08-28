import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ContactService, ImportSummary } from '../../services/contactService';
import { parseExcelContactSheet, extractPhonesFromBulkText, ExcelContactParseResult } from '../../utils/phoneUtils';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Phone, ArrowRight, MessageSquareCode, Filter, X, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';

export const SupervisorImportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || 'team_001');

  const effectiveActor = user
    ? { ...user, teamId: user.role === 'ADMIN' ? adminTeamId : user.teamId }
    : null;

  // Single manual contact state
  const [manualPhone, setManualPhone] = useState('');
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  // Bulk text area numbers state
  const [bulkText, setBulkText] = useState('');
  const [isBulkTextProcessing, setIsBulkTextProcessing] = useState(false);

  // Bulk import state
  const [file, setFile] = useState<File | null>(null);
  const [parsedFileInfo, setParsedFileInfo] = useState<ExcelContactParseResult | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [executeFn, setExecuteFn] = useState<(() => Promise<any>) | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Tab filter for bottom numbers preview
  const [previewTab, setPreviewTab] = useState<'ALL' | 'VALID' | 'DUPLICATES' | 'INVALID'>('ALL');

  // Single Contact Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim() || !effectiveActor) return;

    setIsManualSubmitting(true);
    try {
      const { summary, executeImport } = await ContactService.processBulkImport([manualPhone], effectiveActor);
      setImportSummary(summary);
      setExecuteFn(() => executeImport);
      if (summary.duplicateCount > 0) {
        toast.error(`Phone number ${manualPhone} already exists in system database and was removed.`);
      } else if (summary.invalidCount > 0) {
        toast.error(`Invalid Sri Lankan mobile format. Must be 10 digits starting with 07.`);
      } else {
        toast.success(`Processed contact ${manualPhone}. Confirm import below.`);
      }
      setManualPhone('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add contact.');
    } finally {
      setIsManualSubmitting(false);
    }
  };

  // Excel / CSV File Change & Parse
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected || !effectiveActor) return;
    setFile(selected);

    try {
      const parseResult = await parseExcelContactSheet(selected);
      setParsedFileInfo(parseResult);

      if (parseResult.contactNumbers.length === 0) {
        toast.error(`No valid contact numbers found in column "${parseResult.contactColumnName}".`);
        return;
      }

      const { summary, executeImport } = await ContactService.processBulkImport(
        parseResult.contactNumbers,
        effectiveActor
      );
      setImportSummary(summary);
      setExecuteFn(() => executeImport);
      toast.success(
        `Extracted ${parseResult.contactNumbers.length} contacts from "${parseResult.contactColumnName}" column. Normalized to 07XXXXXXXX.`
      );
    } catch (err: any) {
      toast.error('Error parsing spreadsheet: ' + err.message);
    }
  };

  // Bulk Text / Message Numbers Extraction & Parse
  const handleProcessBulkText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim() || !effectiveActor) {
      toast.error('Please paste or enter bulk numbers first.');
      return;
    }

    setIsBulkTextProcessing(true);
    try {
      const extractedNumbers = extractPhonesFromBulkText(bulkText);

      if (extractedNumbers.length === 0) {
        toast.error('No valid Sri Lankan mobile numbers found in input text.');
        setIsBulkTextProcessing(false);
        return;
      }

      const { summary, executeImport } = await ContactService.processBulkImport(
        extractedNumbers,
        effectiveActor
      );
      setImportSummary(summary);
      setExecuteFn(() => executeImport);
      toast.success(`Extracted & normalized ${extractedNumbers.length} Sri Lankan mobile numbers!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process bulk numbers.');
    } finally {
      setIsBulkTextProcessing(false);
    }
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!executeFn) return;
    setIsImporting(true);
    try {
      const imported = await executeFn();
      toast.success(`Successfully imported ${imported.length} new contacts into system!`);
      setImportSummary(null);
      setFile(null);
      setBulkText('');
      setExecuteFn(null);
      navigate(
        user?.role === 'ADMIN'
          ? '/admin/allocation'
          : user?.role === 'TEAM_MEMBER'
          ? '/member/contacts'
          : '/supervisor/allocation'
      );
    } catch (err: any) {
      toast.error(err.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered rows for audit preview
  const displayedRows = importSummary
    ? importSummary.rows.filter((r) => {
        if (previewTab === 'VALID') return r.isValid && !r.isDuplicate;
        if (previewTab === 'DUPLICATES') return r.isDuplicate;
        if (previewTab === 'INVALID') return !r.isValid;
        return true;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Admin Multi-Team Switcher */}
      <AdminTeamSelector
        activeTeamId={adminTeamId}
        onTeamChange={setAdminTeamId}
        title="Contacts & Leads Ingestion"
      />

      <PageHeader
        title="Import Contacts & Leads"
        description="Select CSV files, paste bulk numbers text, or add single phone numbers"
      />

      {/* Top 3 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Excel / CSV File Upload */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel / CSV File Upload</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
            <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50/60 hover:bg-emerald-50/30 hover:border-emerald-400 transition-colors relative">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-medium mb-1">
                Upload Excel or CSV contact spreadsheet
              </p>
              <p className="text-[11px] text-slate-400 mb-3">
                Reads <strong>only</strong> the <code className="text-emerald-700 font-semibold">Contact</code> column.
              </p>
              <div className="flex items-center justify-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors">
                  <span>Select Excel / CSV File</span>
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="hidden" />
                </label>
                {file && (
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setParsedFileInfo(null);
                      setImportSummary(null);
                      setExecuteFn(null);
                    }}
                    className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title="Remove selected file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {file && (
                <div className="text-[11px] font-semibold text-emerald-700 mt-2 truncate">
                  Loaded: {file.name}
                </div>
              )}
            </div>

            {parsedFileInfo && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 text-[11px] space-y-1 text-slate-700">
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Column Identified: "{parsedFileInfo.contactColumnName}"</span>
                </div>
                {/* <div className="text-slate-500">
                  Scanned {parsedFileInfo.totalRowsScanned} rows &bull; Extracted {parsedFileInfo.contactNumbers.length} numbers ({parsedFileInfo.uniqueContactNumbers.length} unique)
                </div>
                {parsedFileInfo.ignoredColumns.length > 0 && (
                  <div className="text-slate-400 text-[10px] truncate">
                    Ignored non-contact columns: {parsedFileInfo.ignoredColumns.slice(0, 4).join(', ')}
                    {parsedFileInfo.ignoredColumns.length > 4 ? '...' : ''}
                  </div>
                )} */}
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center">Supports .xlsx, .xls, and .csv formats</p>
          </CardContent>
        </Card>

        {/* Card 2: Bulk Text Msg / Numbers Input */}
        <Card className="flex flex-col justify-between md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquareCode className="w-4 h-4 text-blue-600" />
              <span>Bulk Text / Numbers Entry</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
            <form onSubmit={handleProcessBulkText} className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700">Paste Phone Numbers *</label>
                  {bulkText && (
                    <button
                      type="button"
                      onClick={() => setBulkText('')}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    className="w-full h-24 p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors resize-none pr-8"
                    placeholder="e.g. 0750787818  0705787818  0713044381 (Space, comma or line separated)"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    required
                  />
                  {bulkText && (
                    <button
                      type="button"
                      onClick={() => setBulkText('')}
                      className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                      title="Clear text area"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                isLoading={isBulkTextProcessing}
                leftIcon={<Filter className="w-3.5 h-3.5" />}
              >
                Extract & Process Numbers
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card 3: Single Contact Entry */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-purple-600" />
              <span>Single Contact Entry</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
            <form onSubmit={handleManualSubmit} className="space-y-3 flex-1 flex flex-col justify-between">
              <Input
                label="Phone Number *"
                placeholder="e.g. 0750787818"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                onClear={() => setManualPhone('')}
                required
                helperText="Includes duplicate check against system database"
              />

              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                isLoading={isManualSubmitting}
                leftIcon={<Phone className="w-3.5 h-3.5" />}
              >
                Add Single Contact
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Listing & Duplicate Audit Section */}
      {importSummary && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-200 border-blue-200 shadow-sm">
          {/* Header with Summary Stats and Action Button */}
          <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Import Preview &amp; Verification</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contacts will be added to the database as unallocated pool numbers (ready to assign on the Allocation page).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setImportSummary(null);
                    setFile(null);
                    setParsedFileInfo(null);
                    setBulkText('');
                    setExecuteFn(null);
                  }}
                  disabled={isImporting}
                >
                  Cancel / Reset
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={handleConfirmImport}
                  isLoading={isImporting}
                  disabled={importSummary.validCount === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 font-semibold"
                >
                  Confirm &amp; Add ({importSummary.validCount}) to Pool
                </Button>
              </div>
            </div>

            {/* Metric KPI Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <div className="text-[11px] font-medium text-slate-500">Total Parsed</div>
                <div className="text-xl font-bold text-slate-900">{importSummary.totalParsed}</div>
              </div>
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                <div className="text-[11px] font-bold text-emerald-800">Valid New Contacts</div>
                <div className="text-xl font-bold text-emerald-700">{importSummary.validCount}</div>
              </div>
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                <div className="text-[11px] font-bold text-amber-800">Duplicates (Excluded)</div>
                <div className="text-xl font-bold text-amber-700">{importSummary.duplicateCount}</div>
              </div>
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl">
                <div className="text-[11px] font-bold text-rose-800">Invalid Formats</div>
                <div className="text-xl font-bold text-rose-700">{importSummary.invalidCount}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
              <span className="text-xs text-slate-500 font-medium mr-1">Filter View:</span>
              <button
                type="button"
                onClick={() => setPreviewTab('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  previewTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Parsed ({importSummary.totalParsed})
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('VALID')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  previewTab === 'VALID'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                Valid New ({importSummary.validCount})
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('DUPLICATES')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  previewTab === 'DUPLICATES'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                Already Exist / Duplicates ({importSummary.duplicateCount})
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('INVALID')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  previewTab === 'INVALID'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                }`}
              >
                Invalid Format ({importSummary.invalidCount})
              </button>
            </div>

            {/* Listing Table */}
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Phone Number</th>
                    <th className="p-3">Audit Verification Status</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {displayedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-400 font-sans">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{row.phone}</td>
                      <td className="p-3 font-sans">
                        {row.isValid && !row.isDuplicate && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Ready for Pool
                          </span>
                        )}
                        {row.isDuplicate && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Duplicate (Filtered)
                          </span>
                        )}
                        {!row.isValid && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Invalid Format
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 font-sans text-[11px]">
                        {row.reason || 'Valid normalized Sri Lankan mobile number (07XXXXXXXX)'}
                      </td>
                    </tr>
                  ))}
                  {displayedRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400 italic font-sans">
                        No numbers match this filter tab.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                <span>Saving will import </span>
                <strong className="text-emerald-700 font-bold">{importSummary.validCount} valid new contacts</strong>
                <span> to the unallocated database pool.</span>
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleConfirmImport}
                isLoading={isImporting}
                disabled={importSummary.validCount === 0}
                className="bg-emerald-600 hover:bg-emerald-700 font-semibold w-full sm:w-auto"
              >
                Confirm &amp; Add ({importSummary.validCount}) Contacts to Database
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
