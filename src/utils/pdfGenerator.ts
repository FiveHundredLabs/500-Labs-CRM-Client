import { LeadPrintItem } from '../components/printing/A4BillingPrintSheet';
import { getTeamBranding } from '../config/branding';
import { formatCurrency } from './currency';

/**
 * Generates and downloads billing slips for selected leads.
 * Outputs standard A4 Landscape / 4 x A6 billing format.
 */
export const downloadBillingPDF = (items: LeadPrintItem[]): boolean => {
  if (items.length === 0) return false;

  // Chunk items into groups of 4
  const pages: LeadPrintItem[][] = [];
  for (let i = 0; i < items.length; i += 4) {
    pages.push(items.slice(i, i + 4));
  }

  const htmlPages = pages
    .map((pageItems, pageIdx) => {
      const slipsHtml = pageItems
        .map((item) => {
          const teamBrand = getTeamBranding(item.customer.teamId);
          const codAmount = formatCurrency(item.order?.totalAmount ?? 150);
          const itemDesc = item.order?.itemsDescription || 'Interested Lead Fulfillment / Express COD Parcel';
          const refNo = item.order ? item.order.orderNumber : `LD-${item.customer.id.replace('cst_', '').toUpperCase()}`;
          const memberName = item.responsibleUser ? item.responsibleUser.fullName : 'Team Member';

          return `
            <div style="width: 148mm; height: 105mm; padding: 12px; background: #ffffff; border: 2px solid #0f172a; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; font-family: system-ui, -apple-system, sans-serif; color: #0f172a;">
              <!-- Header -->
              <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 28px; height: 28px; background-color: ${teamBrand.brandColor}; color: #ffffff; font-weight: 900; font-size: 12px; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                    ${teamBrand.code}
                  </div>
                  <div>
                    <div style="font-weight: 900; font-size: 12px; text-transform: uppercase;">${teamBrand.name}</div>
                    <div style="font-size: 8px; font-weight: 600; color: #475569;">OFFICIAL BILLING & COD SLIP</div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase;">REF NO</div>
                  <div style="font-size: 12px; font-weight: 900; font-family: monospace;">${refNo}</div>
                </div>
              </div>

              <!-- Recipient Info -->
              <div style="padding: 6px 0; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">BILL TO (CUSTOMER DETAILS):</div>
                  <div style="font-size: 14px; font-weight: 900; text-transform: uppercase; margin-top: 2px;">${item.customer.fullName}</div>
                  <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 2px;">${item.customer.address}</div>
                  <div style="font-size: 11px; font-weight: 900; font-family: monospace; margin-top: 4px;">
                    TEL: ${item.customer.phone} ${item.customer.email ? `| ${item.customer.email}` : ''}
                  </div>
                </div>

                <div style="font-size: 10px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px; border-radius: 4px; display: flex; justify-content: space-between;">
                  <span><strong>Handled By:</strong> ${memberName}</span>
                  <span style="font-family: monospace; color: #64748b;">Team: ${teamBrand.code}</span>
                </div>
              </div>

              <!-- COD Box -->
              <div style="background: #0f172a; color: #ffffff; padding: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 900; text-transform: uppercase;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Item: ${itemDesc}</span>
                <span style="color: #fbbf24; font-size: 12px;">TOTAL COD: ${codAmount}</span>
              </div>

              <!-- Footer -->
              <div style="border-top: 2px solid #0f172a; padding-top: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 8px;">
                <div style="font-family: monospace; font-weight: 700;">*${item.customer.id.toUpperCase()}*</div>
                <div style="color: #475569; font-weight: 700;">A6 LANDSCAPE (148mm × 105mm)</div>
              </div>
            </div>
          `;
        })
        .join('');

      // Fill remaining slots
      const emptyCount = 4 - pageItems.length;
      const emptySlipsHtml = Array.from({ length: emptyCount })
        .map(
          () => `
          <div style="width: 148mm; height: 105mm; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; font-family: monospace; box-sizing: border-box;">
            [ EMPTY A6 BILLING SLIP POSITION ]
          </div>
        `
        )
        .join('');

      return `
        <div style="width: 297mm; height: 210mm; padding: 8px; background: #ffffff; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; box-sizing: border-box; page-break-after: always;">
          ${slipsHtml}
          ${emptySlipsHtml}
        </div>
      `;
    })
    .join('');

  const fullDocumentHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Billing Slips (${items.length} Selected Leads)</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    body { margin: 0; padding: 0; background: #f1f5f9; }
  </style>
</head>
<body>
  ${htmlPages}
</body>
</html>`;

  // Create Blob and trigger download
  const blob = new Blob([fullDocumentHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `billing_slips_${items.length}_leads.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
};
