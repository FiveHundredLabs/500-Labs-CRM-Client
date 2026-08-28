import React from 'react';

export const PrintDocumentStyles: React.FC = () => {
  return (
    <style>{`
      @media print {
        @page {
          size: A4 landscape;
          margin: 6mm;
        }

        html,
        body {
          width: auto !important;
          min-height: auto !important;
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
          width: 285mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }

        .billing-slip-sheet {
          width: 285mm !important;
          height: 198mm !important;
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          grid-template-rows: repeat(2, 1fr) !important;
          gap: 4mm !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          background: #ffffff !important;
        }

        .billing-slip-sheet:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }

        .billing-slip-page {
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          box-sizing: border-box !important;
        }

        .billing-slip {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          box-shadow: none !important;
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .no-print {
          display: none !important;
        }
      }
    `}</style>
  );
};
