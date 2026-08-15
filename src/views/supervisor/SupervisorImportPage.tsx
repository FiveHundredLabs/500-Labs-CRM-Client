import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ContactService, ImportSummary } from '../../services/contactService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Phone, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SupervisorImportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Manual entry state
  const [manualPhone, setManualPhone] = useState('');
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  // Bulk import state
  const [file, setFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [executeFn, setExecuteFn] = useState<(() => Promise<any>) | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Manual Contact Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim() || !user) return;

    setIsManualSubmitting(true);
    try {
      await ContactService.addManualContact(manualPhone, user);
      toast.success(`Successfully added contact ${manualPhone}`);
      setManualPhone('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add contact.');
    } finally {
      setIsManualSubmitting(false);
    }
  };

  // Bulk File Selection & Parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    try {
      const text = await selected.text();
      // Simple parser: split by newlines, commas, semicolons
      const rawLines = text
        .split(/[\r\n]+/)
        .map((l) => l.split(/[,;\t]/)[0].trim())
        .filter((l) => l.length > 0 && !l.toLowerCase().includes('phone'));

      const { summary, executeImport } = await ContactService.processBulkImport(rawLines, user!);
      setImportSummary(summary);
      setExecuteFn(() => executeImport);
      toast.success(`Parsed ${rawLines.length} rows from ${selected.name}`);
    } catch (err: any) {
      toast.error('Error parsing file: ' + err.message);
    }
  };

  const handleConfirmImport = async () => {
    if (!executeFn) return;
    setIsImporting(true);
    try {
      const imported = await executeFn();
      toast.success(`Successfully imported ${imported.length} new contacts into system!`);
      setImportSummary(null);
      setFile(null);
      setExecuteFn(null);
      navigate('/supervisor/allocation');
    } catch (err: any) {
      toast.error(err.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Contacts & Leads"
        description="Add single phone numbers or upload CSV/Excel files for automated allocation"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual Contact Entry */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>Manual Entry</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                label="Phone Number *"
                placeholder="e.g. +1 (555) 901-9988"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                required
                helperText="Includes duplicate phone validation"
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isManualSubmitting}
              >
                Add Contact
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Excel / CSV Drag & Drop Bulk Import */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Excel / CSV Bulk File Import</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag & Drop Zone */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 sm:p-8 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">Upload Contact Spreadsheet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Supports .csv, .txt, .xlsx phone number lists. Phone column will be parsed automatically.
              </p>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer">
                <span>Select File from Computer</span>
                <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
              </label>
              {file && <div className="text-xs font-semibold text-blue-600 mt-3">Selected File: {file.name}</div>}
            </div>

            {/* Import Summary & Validation Breakdown */}
            {importSummary && (
              <div className="space-y-4 pt-4 border-t border-slate-200 animate-in fade-in duration-150">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                    <div className="text-xl font-bold text-emerald-800">{importSummary.validCount}</div>
                    <div className="text-xs font-semibold text-emerald-700 mt-0.5">Valid New</div>
                  </div>
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                    <div className="text-xl font-bold text-amber-800">{importSummary.duplicateCount}</div>
                    <div className="text-xs font-semibold text-amber-700 mt-0.5">Duplicates</div>
                  </div>
                  <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
                    <div className="text-xl font-bold text-rose-800">{importSummary.invalidCount}</div>
                    <div className="text-xs font-semibold text-rose-700 mt-0.5">Invalid Format</div>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Parsed Phone</th>
                        <th className="p-2.5">Validation Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importSummary.rows.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-2.5 font-mono">{row.phone}</td>
                          <td className="p-2.5">
                            {row.isValid && !row.isDuplicate && (
                              <span className="text-emerald-700 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                              </span>
                            )}
                            {row.isDuplicate && (
                              <span className="text-amber-700 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Duplicate
                              </span>
                            )}
                            {!row.isValid && (
                              <span className="text-red-700 font-medium flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Invalid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400 font-mono">Batch ID: {importSummary.batchId}</span>
                  <Button
                    variant="primary"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    onClick={handleConfirmImport}
                    isLoading={isImporting}
                    disabled={importSummary.validCount === 0}
                  >
                    Confirm Import ({importSummary.validCount} Contacts)
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
