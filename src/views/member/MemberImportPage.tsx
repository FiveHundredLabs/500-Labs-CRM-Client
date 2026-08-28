import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ContactService, ImportSummary } from '../../services/contactService';
import { parseExcelContactSheet, extractPhonesFromBulkText, ExcelContactParseResult } from '../../utils/phoneUtils';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Phone, 
  ArrowRight, 
  MessageSquareCode, 
  Filter, 
  X,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MemberImportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Single manual contact state
  const [manualPhone, setManualPhone] = useState('');
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  // Bulk text area numbers state
  const [bulkText, setBulkText] = useState('');
  const [isBulkTextProcessing, setIsBulkTextProcessing] = useState(false);

  // Bulk import file state
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
    if (!manualPhone.trim() || !user) return;

    setIsManualSubmitting(true);
    try {
      const { summary, executeImport } = await ContactService.processBulkImport([manualPhone], user);
      setImportSummary(summary);
      setExecuteFn(() => executeImport);
      if (summary.duplicateCount > 0) {
        toast.error(`Phone number ${manualPhone} already exists in database and was filtered.`);
      } else if (summary.invalidCount > 0) {
        toast.error(`Invalid Sri Lankan mobile format. Must be 10 digits starting with 07.`);
      } else {
        toast.success(`Processed contact ${manualPhone}. Confirm below to add to your queue.`);
      }
      setManualPhone('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process contact.');
    } finally {
      setIsManualSubmitting(false);
    }
  };

  // Bulk Text / Message Numbers Extraction & Parse
  const handleProcessBulkText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim() || !user) {
      toast.error('Please paste or enter phone numbers first.');
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

      const { summary, executeImport } = await ContactService.processBulkImport(extractedNumbers, user);
      setImportSummary(summary);
      setExecuteFn(() => executeImport);
      toast.success(`Extracted & normalized ${extractedNumbers.length} Sri Lankan mobile numbers!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process bulk numbers.');
    } finally {
      setIsBulkTextProcessing(false);
    }
  };

  // Excel / CSV File Change & Parse
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected || !user) return;
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
        user
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

  // Confirm Import & Directly Allocate to Current Member
  const handleConfirmImport = async () => {
    if (!executeFn) return;
    setIsImporting(true);
    try {
      const imported = await executeFn();
      toast.success(`Successfully imported ${imported.length} new contacts directly into your calling list!`);
      setImportSummary(null);
      setFile(null);
      setBulkText('');
      setExecuteFn(null);
      navigate('/member/contacts');
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
      <PageHeader
        title="Import Numbers Myself"
        description="Add calling contacts directly to your personal queue using bulk text, manual entry, or CSV"
      />

      {/* Auto-Allocation Notice Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold">Direct Auto-Allocation:</span> All imported numbers will be immediately assigned to you (<span className="font-semibold">{user?.fullName}</span>) and visible in your contacts queue.
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-white/80 px-2 py-0.5 rounded-full border border-blue-200">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Auto-Deduplicated</span>
        </div>
      </div>

      {/* Top 3 Cards Grid (Accessible to Team Members) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Bulk Text Msg / Numbers Input (No Excel required!) */}
        <Card className="flex flex-col justify-between md:col-span-1 border-blue-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <MessageSquareCode className="w-4 h-4 text-blue-600" />
                <span>Bulk Text / Numbers Entry</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                No Excel Needed
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
            <form onSubmit={handleProcessBulkText} className="space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-700">Paste Numbers *</label>
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

        {/* Card 2: Single Contact Entry */}
        <Card className="flex flex-col justify-between border-purple-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-purple-600" />
              <span>Single Number Entry</span>
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
                Add Single Number
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card 3: Excel / CSV File Upload */}
        <Card className="flex flex-col justify-between border-emerald-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel / CSV Spreadsheet Upload</span>
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
      </div>

      {/* Bottom Listing & Duplicate Audit Section */}
      {importSummary && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Parsed Numbers Audit ({importSummary.totalParsed} total)</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review verified numbers before confirming import to your personal calling queue
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setImportSummary(null);
                    setFile(null);
                    setBulkText('');
                    setExecuteFn(null);
                  }}
                >
                  Discard
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isImporting}
                  disabled={importSummary.validCount === 0}
                  onClick={handleConfirmImport}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Confirm &amp; Add ({importSummary.validCount}) to My Queue
                </Button>
              </div>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-3 gap-3 pt-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                <div className="text-xs font-semibold text-emerald-800">Valid Unique Numbers</div>
                <div className="text-lg font-bold text-emerald-900">{importSummary.validCount}</div>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <div className="text-xs font-semibold text-amber-800">Duplicates Removed</div>
                <div className="text-lg font-bold text-amber-900">{importSummary.duplicateCount}</div>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-center">
                <div className="text-xs font-semibold text-rose-800">Invalid Formats</div>
                <div className="text-lg font-bold text-rose-900">{importSummary.invalidCount}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/50 text-xs">
              <span className="text-slate-500 font-medium mr-2">Filter View:</span>
              <button
                type="button"
                onClick={() => setPreviewTab('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  previewTab === 'ALL' ? 'bg-white text-blue-700 font-bold shadow-2xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({importSummary.rows.length})
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('VALID')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  previewTab === 'VALID' ? 'bg-emerald-100 text-emerald-800 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Valid ({importSummary.validCount})
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('DUPLICATES')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  previewTab === 'DUPLICATES' ? 'bg-amber-100 text-amber-800 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Duplicates ({importSummary.duplicateCount})
              </button>
              {importSummary.invalidCount > 0 && (
                <button
                  type="button"
                  onClick={() => setPreviewTab('INVALID')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    previewTab === 'INVALID' ? 'bg-rose-100 text-rose-800 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Invalid ({importSummary.invalidCount})
                </button>
              )}
            </div>

            {/* Table */}
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-5 py-2.5">#</th>
                    <th className="px-5 py-2.5">Phone Number</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-slate-400 font-sans">
                        No rows found in this filter tab.
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-2.5 text-slate-400 font-sans">{idx + 1}</td>
                        <td className="px-5 py-2.5 font-bold text-slate-900">{r.phone}</td>
                        <td className="px-5 py-2.5 font-sans">
                          {r.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3 h-3" /> Duplicate
                            </span>
                          ) : !r.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" /> Invalid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Ready to Import
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-slate-500 font-sans text-[11px]">
                          {r.reason || 'Verified phone number ready for personal queue'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
