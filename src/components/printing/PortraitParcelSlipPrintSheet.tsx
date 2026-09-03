import React from 'react';
import { ParcelSlipData } from '../../models/domain';
import { PortraitParcelSlip } from './PortraitParcelSlip';

export interface PortraitParcelSlipPrintSheetProps {
  items: ParcelSlipData[];
  qrImages?: Record<string, string>;
}

const chunkParcelSlipsIntoSheets = <T,>(items: T[], size = 4): T[][] => {
  const sheets: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    sheets.push(items.slice(index, index + size));
  }
  return sheets;
};

export const PortraitParcelSlipPrintSheet: React.FC<PortraitParcelSlipPrintSheetProps> = ({
  items,
  qrImages = {},
}) => {
  const sheets = chunkParcelSlipsIntoSheets(items);

  return (
    <div className="print-parcel-container" style={{ margin: 0, padding: 0 }}>
      {sheets.map((sheetItems, sheetIndex) => {
        const isLastSheet = sheetIndex === sheets.length - 1;

        return (
          <div
            key={`portrait-parcel-slip-sheet-${sheetIndex}`}
            className="portrait-parcel-slip-sheet parcel-print-page bg-white"
            style={{
              width: '198mm',
              height: '285mm',
              minWidth: '198mm',
              minHeight: '285mm',
              maxWidth: '198mm',
              maxHeight: '285mm',
              display: 'grid',
              gridTemplateColumns: '97mm 97mm',
              gridTemplateRows: '140.5mm 140.5mm',
              columnGap: '4mm',
              rowGap: '4mm',
              boxSizing: 'border-box',
              breakAfter: isLastSheet ? 'auto' : 'page',
              pageBreakAfter: isLastSheet ? 'auto' : 'always',
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
            }}
            data-parcel-sheet
          >
            {Array.from({ length: 4 }).map((_, cellIndex) => {
              const item = sheetItems[cellIndex];

              return (
                <div
                  key={item?.publicSlipToken || `blank-${sheetIndex}-${cellIndex}`}
                  className="portrait-parcel-slip-cell bg-white overflow-hidden"
                  style={{
                    width: '97mm',
                    height: '140.5mm',
                    minWidth: '97mm',
                    minHeight: '140.5mm',
                    maxWidth: '97mm',
                    maxHeight: '140.5mm',
                    boxSizing: 'border-box',
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                    overflow: 'hidden',
                  }}
                  data-parcel-cell={item ? 'filled' : 'blank'}
                >
                  {item && (
                    <PortraitParcelSlip
                      data={item}
                      qrImageDataUrl={qrImages[item.publicSlipToken]}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
