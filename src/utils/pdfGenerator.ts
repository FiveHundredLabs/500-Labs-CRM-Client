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

export const downloadBillingPDF = (items: LeadPrintItem[]): boolean => {
  if (items.length === 0) return false;

  const slipsHtml = items
    .map((item) => {
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
            <section class="merchant-column">
              <h2>Merchant Details</h2>
              ${renderField('Name', brand.merchantName)}
              ${renderField('Telephone', brand.merchantTelephone)}
              ${renderField('Description', brand.description, 'description-field')}
              <div class="cod-line">Total COD = ${escapeHtml(codAmount)}</div>
            </section>

            <section class="customer-column">
              <h2>Customer Details</h2>
              ${renderField('Name', item.customer.fullName || 'Customer')}
              <div class="address-field">
                <div class="field-label">Address</div>
                <div class="field-value">${formatAddressLines(item.customer.address || 'N/A')}</div>
              </div>
              ${renderField('Telephone', item.customer.phone || 'N/A')}
            </section>
          </main>
        </section>
      `;
    })
    .join('');

  const fullDocumentHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Billing COD Slips (${items.length})</title>
  <style>
    @page { size: 148mm 105mm; margin: 0; }
    html, body { width: 148mm; min-height: 105mm; margin: 0; padding: 0; background: #ffffff; color: #000000; }
    body { font-family: Arial, Helvetica, sans-serif; }
    .billing-slip {
      width: 148mm;
      height: 105mm;
      border: 0.6mm solid #000;
      box-sizing: border-box;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      background: #fff;
    }
    .billing-slip:last-child { page-break-after: auto; break-after: auto; }
    .slip-header {
      height: 26mm;
      border-bottom: 0.55mm solid #000;
      display: grid;
      grid-template-columns: 36mm 1fr;
      align-items: center;
      overflow: hidden;
    }
    .logo-cell {
      height: 100%;
      border-right: 0.35mm solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3mm;
      box-sizing: border-box;
    }
    .logo-cell img {
      max-width: 29mm;
      max-height: 20mm;
      object-fit: contain;
    }
    .title-cell { text-align: center; padding: 0 4mm; }
    .brand-title { font-size: 7mm; line-height: 1; font-weight: 900; text-transform: uppercase; }
    .brand-address { margin-top: 2mm; font-size: 3.25mm; line-height: 1.2; font-weight: 700; }
    .slip-body {
      height: 78mm;
      display: grid;
      grid-template-columns: 40fr 60fr;
    }
    .merchant-column,
    .customer-column {
      padding: 4mm;
      box-sizing: border-box;
      overflow: hidden;
    }
    .merchant-column { border-right: 0.45mm solid #000; }
    h2 {
      margin: 0 0 4mm;
      font-size: 3.45mm;
      line-height: 1;
      font-weight: 900;
    }
    .field-label {
      font-size: 3mm;
      line-height: 1.15;
      font-weight: 800;
    }
    .field-value {
      font-size: 3.25mm;
      line-height: 1.22;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .merchant-column .field-value { margin-bottom: 2.7mm; }
    .description-field { min-height: 13mm; }
    .address-field { min-height: 30mm; margin: 3mm 0; }
    .cod-line {
      margin-top: 5mm;
      font-size: 4mm;
      line-height: 1.2;
      font-weight: 900;
      overflow-wrap: anywhere;
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
  ${slipsHtml}
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
