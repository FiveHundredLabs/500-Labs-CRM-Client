import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ContactService, ImportSummary } from '../../services/contactService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Phone, ArrowRight, MessageSquareCode, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SupervisorImportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Single manual contact state
  const [manualPhone, setManualPhone] = useState('');
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  // Bulk text area numbers state
  const [bulkText, setBulkText] = useState('');
  const [isBulkTextProcessing, setIsBulkTextProcessing] = useState(false);

  // Bulk import state
  const [file, setFile] = useState<File | null>(null);
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
      const { summary, executeImport } = await ContactService.processBulkImport([manualPhone], user!);
      setImportSummary(summary);
      setExecuteFn(() => executeImport);
      if (summary.duplicateCount > 0) {
        toast.error(`Phone number ${manualPhone} already exists in system database and was removed.`);
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

  // CSV File Change & Parse
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    try {
      const text = await selected.text();
      const rawLines = text
        .split(/[\r\n]+/)
        .map((l) => l.split(/[,;\t]/)[0].trim())
        .filter((l) => l.length > 0 && !l.toLowerCase().includes('phone'));

      const { summary, executeImport } = await ContactService.processBulkImport(rawLines, user!);
      setImportSummary(summary);
      setExecuteFn(() => executeImport);
      toast.success(`Parsed ${rawLines.length} phone numbers from ${selected.name}`);
    } catch (err: any) {
      toast.error('Error parsing CSV file: ' + err.message);
    }
  };

  // Bulk Text / Message Numbers Extraction & Parse
  const handleProcessBulkText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim() || !user) {
      toast.error('Please paste or enter bulk numbers first.');
      return;
    }

    setIsBulkTextProcessing(true);
    try {
      // Split by spaces, newlines, commas, semicolons, tabs
      const extractedNumbers = bulkText
        .split(/[\s,;\t\r\n]+/)
        .map((n) => n.trim())
        .filter((n) => n.length >= 7);

      if (extractedNumbers.length === 0) {
        toast.error('No valid phone numbers found in input text.');
        setIsBulkTextProcessing(false);
        return;
      }

      const { summary, executeImport } = await ContactService.processBulkImport(extractedNumbers, user!);
      setImportSummary(summary);
      setExecuteFn(() => executeImport);
      toast.success(`Extracted & analyzed ${extractedNumbers.length} bulk numbers!`);
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
      navigate('/supervisor/allocation');
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
        title="Import Contacts & Leads"
        description="Select CSV files, paste bulk numbers text, or add single phone numbers"
      />

      {/* Top 3 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Compact CSV File Upload */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>CSV File Upload</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
            <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50/60 hover:bg-emerald-50/30 hover:border-emerald-400 transition-colors relative">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 font-medium mb-3">
                Select CSV contact spreadsheet from computer
              </p>
              <div className="flex items-center justify-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer transition-colors">
                  <span>Select CSV File</span>
                  <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                </label>
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
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
            <p className="text-[11px] text-slate-400 text-center">Strictly supports .csv file format</p>
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
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-200">

          <CardContent className="p-6 space-y-5">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setPreviewTab('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  previewTab === 'ALL'
                    ? 'bg-slate-900 text-white'
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
                    ? 'bg-emerald-600 text-white'
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
                    ? 'bg-amber-600 text-white'
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
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                }`}
              >
                Invalid Format ({importSummary.invalidCount})
              </button>
            </div>

            {/* Listing Table */}
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Phone Number</th>
                    <th className="p-3">Audit Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-semibold text-slate-900">{row.phone}</td>
                      <td className="p-3">
                        {row.isValid && !row.isDuplicate && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Ready for Allocation
                          </span>
                        )}
                        {row.isDuplicate && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Already Exist (Filtered Out)
                          </span>
                        )}
                        {!row.isValid && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Invalid Phone Format
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-400 italic">
                        No numbers match this filter tab.
                      </td>
                    </tr>
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
