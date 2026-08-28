import { LeadPrintItem } from '../components/printing/BillingSlipPrintSheet';
import { getBrandPrintConfig } from '../config/branding';
import { formatCurrency } from './currency';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatAddressLines = (value: string): string =>
  escapeHtml(value || 'N/A')
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join('<br>');

const renderField = (label: string, value?: string | number | null, className = '') => `
  <div class="${className}">
    <div class="field-label">${escapeHtml(label)}</div>
    <div class="field-value">${value ? escapeHtml(String(value)) : '&nbsp;'}</div>
  </div>
`;

const chunkIntoSheets = <T,>(items: T[], size = 4): T[][] => {
  const sheets: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    sheets.push(items.slice(index, index + size));
  }
  return sheets;
};

export const downloadBillingPDF = (items: LeadPrintItem[]): boolean => {
  if (items.length === 0) return false;

  const renderSlip = (item: LeadPrintItem): string => {
      const brand = getBrandPrintConfig(item.team || item.order?.teamId || item.customer.teamId);
      if (!brand) {
        return `
          <section class="billing-slip">
            <div class="unresolved">
              <div class="unresolved-title">Brand Not Resolved</div>
              <div class="unresolved-copy">This order cannot be printed until its owning team is mapped to a billing brand.</div>
            </div>
          </section>
        `;
      }

      const codAmount = formatCurrency(item.order?.codAmount ?? item.order?.totalAmount ?? 0);

      return `
        <section class="billing-slip">
          <header class="slip-header">
            <div class="logo-cell">
              <img src="${escapeHtml(brand.logo)}" alt="${escapeHtml(brand.displayName)} logo">
            </div>
            <div class="title-cell">
              <div class="brand-title">${escapeHtml(brand.printTitle)}</div>
              <div class="brand-address">${formatAddressLines(brand.address)}</div>
            </div>
          </header>

          <main class="slip-body">
            <div class="details-grid">
            <section class="details-column merchant-column">
              <h2>Merchant Details</h2>
              ${renderField('Name', brand.merchantName)}
              ${renderField('Telephone', brand.merchantTelephone)}
              ${renderField('Description', brand.description, 'description-field')}
            </section>

            <section class="details-column customer-column">
              <h2>Customer Details</h2>
              ${renderField('Name', item.customer.fullName || 'Customer')}
              <div class="address-field">
                <div class="field-label">Address</div>
                <div class="field-value">${formatAddressLines(item.customer.address || 'N/A')}</div>
              </div>
              ${renderField('Telephone', item.customer.phone || 'N/A')}
            </section>
            </div>
            <section class="cod-total">
              <span>Total COD</span>
              <strong>${escapeHtml(codAmount)}</strong>
            </section>
          </main>
        </section>
      `;
  };

  const sheetsHtml = chunkIntoSheets(items)
    .map((sheetItems) => `
      <section class="billing-slip-sheet">
        ${sheetItems.map(renderSlip).join('')}
      </section>
    `)
    .join('');

  const fullDocumentHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Billing COD Slips (${items.length})</title>
  <style>
    @page { size: A4 landscape; margin: 6mm; }
    html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; }
    body { font-family: Arial, Helvetica, "Segoe UI", sans-serif; }
    .billing-slip-sheet {
      width: 285mm;
      height: 198mm;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 4mm;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      background: #fff;
    }
    .billing-slip-sheet:last-child { page-break-after: auto; break-after: auto; }
    .billing-slip {
      width: 100%;
      height: 100%;
      border: 0.45mm solid #000;
      box-sizing: border-box;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
      background: #fff;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .slip-header {
      height: 21mm;
      border-bottom: 0.35mm solid #000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      overflow: hidden;
      padding: 2.5mm 4mm;
      box-sizing: border-box;
    }
    .logo-cell {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      max-width: 38mm;
    }
    .logo-cell img {
      max-width: 34mm;
      max-height: 16mm;
      object-fit: contain;
    }
    .title-cell { text-align: right; flex: 1; padding-left: 4mm; }
    .brand-title { font-size: 5.2mm; line-height: 1; font-weight: 600; text-transform: uppercase; }
    .brand-address { margin-top: 1.25mm; font-size: 2.65mm; line-height: 1.15; font-weight: 400; }
    .slip-body {
      height: calc(100% - 21mm);
      display: flex;
      flex-direction: column;
    }
    .details-grid {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      border-bottom: 0.35mm solid #000;
    }
    .details-column {
      min-width: 0;
      overflow: hidden;
    }
    .merchant-column { border-right: 0.35mm solid #000; }
    h2 {
      margin: 0;
      height: 7mm;
      display: flex;
      align-items: center;
      padding: 0 3mm;
      box-sizing: border-box;
      background: #000;
      color: #fff;
      font-size: 2.8mm;
      line-height: 1;
      font-weight: 600;
      text-transform: uppercase;
    }
    .details-column > div:not(.field-label):not(.field-value),
    .details-column .description-field,
    .details-column .address-field {
      margin-left: 3mm;
      margin-right: 3mm;
    }
    .details-column > div:not(h2) {
      margin-top: 2.5mm;
    }
    .description-field,
    .address-field {
      min-height: 0;
      overflow: hidden;
    }
    .field-label {
      font-size: 2.35mm;
      line-height: 1.15;
      font-weight: 500;
      color: #475569;
      text-transform: uppercase;
    }
    .field-value {
      margin-top: 0.65mm;
      font-size: 3mm;
      line-height: 1.22;
      font-weight: 400;
      overflow-wrap: anywhere;
      white-space: normal;
    }
    .cod-total {
      height: 15mm;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3mm;
      background: #f8fafc;
      text-align: center;
      box-sizing: border-box;
      padding: 0 4mm;
    }
    .cod-total span {
      font-size: 3.15mm;
      line-height: 1;
      font-weight: 500;
      text-transform: uppercase;
      color: #334155;
    }
    .cod-total strong {
      font-size: 5.2mm;
      line-height: 1.1;
      font-weight: 600;
      color: #000;
    }
    .unresolved {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3mm;
      text-align: center;
      padding: 6mm;
      box-sizing: border-box;
    }
    .unresolved-title { font-size: 5mm; font-weight: 900; text-transform: uppercase; }
    .unresolved-copy { font-size: 3.5mm; font-weight: 600; max-width: 100mm; }
  </style>
</head>
<body>
  ${sheetsHtml}
</body>
</html>`;

  const blob = new Blob([fullDocumentHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `billing_cod_slips_${items.length}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
};
