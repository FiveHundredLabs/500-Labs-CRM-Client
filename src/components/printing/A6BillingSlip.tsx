import React from 'react';
import { Customer, Order, Team, User } from '../../models/domain';
import { BrandPrintConfig, getBrandPrintConfig } from '../../config/branding';
import { formatCurrency } from '../../utils/currency';

export interface A6BillingSlipProps {
  customer: Customer;
  responsibleUser?: User;
  order?: Order;
  team?: Team | Pick<Team, 'id' | 'name' | 'code'>;
  className?: string;
}

const formatAddress = (address: string): string[] => {
  return address
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
};

const getCodAmount = (order?: Order): string => {
  return formatCurrency(order?.codAmount ?? order?.totalAmount ?? 0);
};

const SlipField: React.FC<{
  label: string;
  value?: string | number | null;
  className?: string;
}> = ({ label, value, className = '' }) => (
  <div className={`min-w-0 ${className}`}>
    <div className="text-[2.35mm] font-medium leading-tight text-slate-600 uppercase">{label}</div>
    <div className="mt-[0.65mm] text-[3mm] font-normal leading-snug text-black whitespace-pre-wrap break-words">
      {value || <span>&nbsp;</span>}
    </div>
  </div>
);

const SlipHeader: React.FC<{ brand: BrandPrintConfig }> = ({ brand }) => (
  <div className="h-[21mm] border-b-[0.35mm] border-black flex items-center justify-between px-[4mm] py-[2.5mm] overflow-hidden">
    <div className="flex items-center justify-start max-w-[38mm]">
      <img
        src={brand.logo}
        alt={`${brand.displayName} logo`}
        className="max-w-[34mm] max-h-[16mm] object-contain"
      />
    </div>
    <div className="text-right flex-1 pl-[4mm]">
      <div className="text-[5.2mm] font-semibold leading-none text-black uppercase">
        {brand.printTitle}
      </div>
      <div className="mt-[1.25mm] text-[2.65mm] font-normal leading-tight text-black whitespace-pre-line">
        {brand.address}
      </div>
    </div>
  </div>
);

const UnresolvedBrandSlip: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`billing-slip w-[140.5mm] h-[97mm] bg-white border-[0.45mm] border-black p-[6mm] text-black overflow-hidden shrink-0 ${className}`}
    style={{
      boxSizing: 'border-box',
      fontFamily: 'Arial, Helvetica, "Segoe UI", sans-serif',
    }}
  >
    <div className="h-full flex flex-col items-center justify-center text-center gap-[3mm]">
      <div className="text-[5mm] font-black uppercase">Brand Not Resolved</div>
      <div className="text-[3.5mm] font-semibold leading-snug max-w-[100mm]">
        This order cannot be printed until its owning team is mapped to a billing brand.
      </div>
    </div>
  </div>
);

export const A6BillingSlip: React.FC<A6BillingSlipProps> = ({
  customer,
  order,
  team,
  className = '',
}) => {
  const brand = getBrandPrintConfig(team || order?.teamId || customer.teamId);

  if (!brand) {
    return <UnresolvedBrandSlip className={className} />;
  }

  return (
    <div
      className={`billing-slip w-[140.5mm] h-[97mm] bg-white border-[0.45mm] border-black overflow-hidden text-black shrink-0 ${className}`}
      style={{
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, "Segoe UI", sans-serif',
      }}
    >
      <SlipHeader brand={brand} />

      <div className="flex flex-col" style={{ height: 'calc(100% - 21mm)' }}>
        {/* Details area */}
        <div className="grid grid-cols-2 flex-1 min-h-0 border-b-[0.35mm] border-black">
          <section className="min-w-0 border-r-[0.35mm] border-black flex flex-col">
            <div className="h-[7mm] bg-black text-white text-[2.8mm] font-semibold uppercase flex items-center px-[3mm]">
              Merchant Details
            </div>
            <div className="flex-1 min-h-0 px-[3mm] py-[2.5mm] space-y-[2.8mm] overflow-hidden">
              <SlipField label="Name" value={brand.merchantName} />
              <SlipField label="Telephone" value={brand.merchantTelephone} />
              <SlipField label="Description" value={brand.description} />
            </div>
          </section>

          <section className="min-w-0 flex flex-col">
            <div className="h-[7mm] bg-black text-white text-[2.8mm] font-semibold uppercase flex items-center px-[3mm]">
              Customer Details
            </div>
            <div className="flex-1 min-h-0 px-[3mm] py-[2.5mm] space-y-[2.8mm] overflow-hidden">
              <SlipField label="Name" value={customer.fullName || 'Customer'} />
              <SlipField label="Address" value={formatAddress(customer.address || 'N/A').join('\n')} />
              <SlipField label="Telephone" value={customer.phone || 'N/A'} />
            </div>
          </section>
        </div>

        {/* Row 5: Total COD Section */}
        <div className="h-[15mm] flex items-center justify-center bg-slate-50 text-center px-[4mm]">
          <div className="text-[3.15mm] font-medium uppercase text-slate-700 leading-none mr-[3mm]">
            Total COD
          </div>
          <div className="text-[5.2mm] font-semibold text-black leading-tight">
            {getCodAmount(order)}
          </div>
        </div>
      </div>
    </div>
  );
};
