import React from 'react';
import { Customer, User, Order } from '../../models/domain';
import { getTeamBranding } from '../../config/branding';

export interface A6BillingSlipProps {
  customer: Customer;
  responsibleUser?: User;
  order?: Order;
  className?: string;
}

export const A6BillingSlip: React.FC<A6BillingSlipProps> = ({
  customer,
  responsibleUser,
  order,
  className = '',
}) => {
  const teamBrand = getTeamBranding(customer.teamId);

  // Billing COD Amount (use order amount if available, otherwise default standard COD)
  const codAmount = order?.totalAmount ? `$${order.totalAmount.toFixed(2)}` : '$150.00';
  const itemDesc = order?.itemsDescription || 'Interested Lead Fulfillment / Express COD Parcel';

  return (
    <div
      className={`w-[148mm] h-[105mm] p-3.5 bg-white border-2 border-slate-900 flex flex-col justify-between overflow-hidden text-slate-900 font-sans print:border-slate-900 shrink-0 ${className}`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* Top Banner / Merchant Branding */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded text-white font-black text-xs flex items-center justify-center print:bg-slate-900 shrink-0"
            style={{ backgroundColor: teamBrand.brandColor }}
          >
            {teamBrand.code}
          </div>
          <div>
            <div className="font-black text-xs uppercase tracking-tight leading-none">{teamBrand.name}</div>
            <div className="text-[8px] font-semibold text-slate-600 tracking-wider">OFFICIAL BILLING & COD SLIP</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500">REF NO</div>
          <div className="text-xs font-black tracking-wider font-mono">
            {order ? order.orderNumber : `LD-${customer.id.replace('cst_', '').toUpperCase()}`}
          </div>
        </div>
      </div>

      {/* Main Billing Recipient Info */}
      <div className="py-1.5 flex-1 flex flex-col justify-between space-y-1">
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            BILL TO (CUSTOMER DETAILS):
          </div>
          <div className="text-sm font-black uppercase text-slate-900 tracking-tight leading-tight mt-0.5">
            {customer.fullName}
          </div>
          <div className="text-xs font-bold text-slate-800 leading-tight mt-0.5">
            {customer.address}
          </div>
          <div className="flex items-center gap-4 text-xs font-black tracking-wider text-slate-900 mt-1">
            <span>TEL: {customer.phone}</span>
            {customer.email && <span className="text-[10px] font-normal text-slate-600">| {customer.email}</span>}
          </div>
        </div>

        {/* Handled By & Lead Source Info */}
        <div className="text-[10px] bg-slate-50 border border-slate-300 p-1.5 rounded flex justify-between items-center">
          <div>
            <span className="font-bold text-slate-500">Handled By: </span>
            <span className="font-black text-slate-900">{responsibleUser ? responsibleUser.fullName : 'Team Member'}</span>
          </div>
          <div className="text-[9px] font-mono text-slate-500">
            Team: {teamBrand.code}
          </div>
        </div>
      </div>

      {/* Billing Summary Box */}
      <div className="p-2 bg-slate-900 text-white rounded my-1">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
          <span className="truncate pr-2">Item: {itemDesc}</span>
          <span className="whitespace-nowrap text-amber-400 font-extrabold text-xs">TOTAL COD: {codAmount}</span>
        </div>
      </div>

      {/* Footer & Cut Marker Barcode */}
      <div className="pt-1.5 border-t-2 border-slate-900 flex items-center justify-between text-[9px]">
        {/* Simulated Barcode */}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5 items-center h-6">
            <span className="w-1 h-full bg-slate-900" />
            <span className="w-0.5 h-full bg-slate-900" />
            <span className="w-2 h-full bg-slate-900" />
            <span className="w-1 h-full bg-slate-900" />
            <span className="w-2.5 h-full bg-slate-900" />
            <span className="w-0.5 h-full bg-slate-900" />
            <span className="w-1 h-full bg-slate-900" />
          </div>
          <span className="font-mono font-bold tracking-widest text-slate-800">
            *{customer.id.toUpperCase()}*
          </span>
        </div>

        <div className="text-right">
          <div className="font-bold uppercase text-[8px] tracking-wider text-slate-700">
            A6 LANDSCAPE (148mm × 105mm)
          </div>
          <div className="text-[8px] font-semibold text-slate-500">4 SLIPS PER A4 SHEET</div>
        </div>
      </div>
    </div>
  );
};
