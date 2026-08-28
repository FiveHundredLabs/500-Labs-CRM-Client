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
    <div className="text-[3mm] font-extrabold leading-tight text-black">{label}</div>
    <div className="text-[3.25mm] font-semibold leading-snug text-black whitespace-pre-wrap break-words">
      {value || <span>&nbsp;</span>}
    </div>
  </div>
);

const SlipHeader: React.FC<{ brand: BrandPrintConfig }> = ({ brand }) => (
  <div className="h-[26mm] border-b-[0.55mm] border-black grid grid-cols-[36mm_1fr] items-center overflow-hidden">
    <div className="h-full flex items-center justify-center border-r-[0.35mm] border-black px-[3mm]">
      <img
        src={brand.logo}
        alt={`${brand.displayName} logo`}
        className="max-w-[29mm] max-h-[20mm] object-contain"
      />
    </div>
    <div className="text-center px-[4mm]">
      <div className="text-[7mm] font-black leading-none text-black uppercase">
        {brand.printTitle}
      </div>
      <div className="mt-[2mm] text-[3.25mm] font-bold leading-tight text-black whitespace-pre-line">
        {brand.address}
      </div>
    </div>
  </div>
);

const UnresolvedBrandSlip: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`billing-slip w-[148mm] h-[105mm] bg-white border-[0.6mm] border-black p-[6mm] text-black font-sans overflow-hidden shrink-0 ${className}`}
    style={{ boxSizing: 'border-box' }}
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
      className={`billing-slip w-[148mm] h-[105mm] bg-white border-[0.6mm] border-black overflow-hidden text-black font-sans shrink-0 ${className}`}
      style={{ boxSizing: 'border-box' }}
    >
      <SlipHeader brand={brand} />

      <div className="grid grid-cols-[40fr_60fr] h-[78mm]">
        <section className="p-[4mm] border-r-[0.45mm] border-black min-w-0">
          <h2 className="text-[4mm] font-black leading-none text-black mb-[4mm]">
            Merchant Details
          </h2>

          <div className="space-y-[2.7mm]">
            <SlipField label="Name" value={brand.merchantName} />
            <SlipField label="Telephone" value={brand.merchantTelephone} />
            <SlipField label="Description" value={brand.description} className="min-h-[13mm]" />
          </div>

          <div className="mt-[5mm] text-[3.45mm] font-black leading-tight text-black break-words">
            Total COD = {getCodAmount(order)}
          </div>
        </section>

        <section className="p-[4mm] min-w-0">
          <h2 className="text-[4mm] font-black leading-none text-black mb-[4mm]">
            Customer Details
          </h2>

          <div className="space-y-[3mm]">
            <SlipField label="Name" value={customer.fullName || 'Customer'} />
            <SlipField
              label="Address"
              value={formatAddress(customer.address || 'N/A').join('\n')}
              className="min-h-[30mm]"
            />
            <SlipField label="Telephone" value={customer.phone || 'N/A'} />
          </div>
        </section>
      </div>
    </div>
  );
};
