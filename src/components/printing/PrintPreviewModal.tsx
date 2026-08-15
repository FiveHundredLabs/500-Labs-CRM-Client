import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Order, Customer } from '../../models/domain';
import { A4PrintSheet } from './A4PrintSheet';
import { Printer, FileText } from 'lucide-react';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  customersMap: Record<string, Customer>;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  orders,
  customersMap,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const totalSheets = Math.ceil(orders.length / 4);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delivery Bills & Labels Print Engine"
      description={`A4 Landscape Layout (4 × A6 Labels Per Sheet) • ${orders.length} Selected Orders`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Print Bar Controls */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">Layout Specifications</div>
              <div className="text-xs text-slate-500 font-medium">
                {orders.length} Labels ({totalSheets} A4 Landscape {totalSheets === 1 ? 'Sheet' : 'Sheets'})
              </div>
            </div>
          </div>
          <Button variant="primary" size="sm" leftIcon={<Printer className="w-3.5 h-3.5" />} onClick={handlePrint}>
            Print Labels
          </Button>
        </div>

        {/* Scrollable Print Sheet Preview */}
        <div className="overflow-x-auto p-4 bg-slate-100 border border-slate-200 rounded-xl max-h-[60vh]">
          <div className="transform scale-[0.6] origin-top-left sm:scale-75 md:scale-[0.8]">
            <A4PrintSheet orders={orders} customersMap={customersMap} />
          </div>
        </div>
      </div>
    </Dialog>
  );
};
