import React from 'react';

export const PrintDocumentStyles: React.FC = () => {
  return (
    <style>{`
      @media print {
        body * {
          visibility: hidden !important;
        }
        .print-billing-container, .print-billing-container * {
          visibility: visible !important;
        }
        .print-billing-container {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        @page {
          size: A4 landscape;
          margin: 0;
        }
      }
    `}</style>
  );
};
