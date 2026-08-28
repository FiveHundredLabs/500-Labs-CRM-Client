import React from 'react';

export const PrintDocumentStyles: React.FC = () => {
  return (
    <style>{`
      @media print {
        @page {
          size: 148mm 105mm;
          margin: 0;
        }

        html,
        body {
          width: 148mm !important;
          min-height: 105mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }

        body * {
          visibility: hidden !important;
        }

        .print-billing-container,
        .print-billing-container * {
          visibility: visible !important;
        }

        .print-billing-container {
          position: absolute !important;
          inset: 0 auto auto 0 !important;
          width: 148mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }

        .billing-slip,
        .billing-slip-page {
          width: 148mm !important;
          height: 105mm !important;
          margin: 0 !important;
          overflow: hidden !important;
          box-shadow: none !important;
        }

        .billing-slip-page {
          page-break-after: always !important;
          break-after: page !important;
        }

        .billing-slip-page:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }

        .no-print {
          display: none !important;
        }
      }
    `}</style>
  );
};
