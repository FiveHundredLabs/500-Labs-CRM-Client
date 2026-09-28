import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { LeadPrintItem } from '../components/printing/printTypes';
import type jsPDF from 'jspdf';
import { PortraitParcelSlip } from '../components/printing/PortraitParcelSlip';
import { ParcelSlipData } from '../models/domain';
import { buildPublicParcelSlipUrl, generateParcelSlipQrDataUrl } from './parcelSlipQr';
import { toParcelSlipDataList } from './parcelSlipData';

const A4_PORTRAIT_WIDTH_MM = 210;
const A4_PORTRAIT_HEIGHT_MM = 297;
const PDF_MARGIN_MM = 6;
const PDF_GAP_MM = 4;
const PARCEL_SLIP_WIDTH_MM = 97; // (210 - 6*2 - 4) / 2 = 97mm
const PARCEL_SLIP_HEIGHT_MM = 140.5; // (297 - 6*2 - 4) / 2 = 140.5mm

const PRINT_DPI = 144; // 144 DPI (reduced from 216 DPI — still sharp for PDF print, ~44% fewer pixels)
const CSS_DPI = 96;
const CAPTURE_SCALE = 1.5;

export type ParcelPdfProgressCallback = (current: number, total: number, percentage: number) => void;

export interface ParcelPdfResult {
  pdf: jsPDF;
  pageCount: number;
}

const chunkIntoSheets = <T,>(items: T[], size = 4): T[][] => {
  const sheets: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    sheets.push(items.slice(index, index + size));
  }
  return sheets;
};

const nextPaint = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

const waitForFonts = async () => {
  if ('fonts' in document && document.fonts?.ready) {
    await document.fonts.ready;
  }
};

const waitForImages = async (container: HTMLElement) => {
  const images = Array.from(container.querySelectorAll<HTMLImageElement>('img'));

  await Promise.all(
    images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) {
        if (typeof image.decode === 'function') {
          try {
            await image.decode();
          } catch {
            // Loaded images (like data URLs) may throw decode errors in some environments
          }
        }
        return;
      }

      await new Promise<void>((resolve, reject) => {
        image.onload = () => {
          if (typeof image.decode === 'function') {
            image.decode().then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
        };
        image.onerror = () => reject(new Error(`Parcel slip image failed to load: ${image.currentSrc || image.src}`));
      });
    }),
  );
};

let sharedColorCanvas: HTMLCanvasElement | null = null;
let sharedColorCtx: CanvasRenderingContext2D | null = null;
const oklchColorCache = new Map<string, string>();

const convertOklchToRgb = (colorStr: string): string => {
  if (!colorStr || !colorStr.includes('oklch')) return colorStr;

  const cached = oklchColorCache.get(colorStr);
  if (cached !== undefined) return cached;

  const result = colorStr.replace(/oklch\([^)]+\)/g, (match) => {
    const matchCached = oklchColorCache.get(match);
    if (matchCached !== undefined) return matchCached;

    try {
      if (!sharedColorCanvas) {
        sharedColorCanvas = document.createElement('canvas');
        sharedColorCanvas.width = 1;
        sharedColorCanvas.height = 1;
        sharedColorCtx = sharedColorCanvas.getContext('2d');
      }
      if (sharedColorCtx) {
        sharedColorCtx.fillStyle = match;
        const resolved = sharedColorCtx.fillStyle;
        if (resolved && !resolved.includes('oklch')) {
          oklchColorCache.set(match, resolved);
          return resolved;
        }
      }
    } catch {
      // Grayscale approximation fallback below
    }

    const parts = match
      .replace(/oklch\(/, '')
      .replace(/\)/, '')
      .split(/[\s/]+/);
    if (parts.length >= 3) {
      const lightness = parseFloat(parts[0]);
      const alpha = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      if (lightness <= 0.1) {
        const res = `rgba(0, 0, 0, ${alpha})`;
        oklchColorCache.set(match, res);
        return res;
      }
      if (lightness >= 0.95) {
        const res = `rgba(255, 255, 255, ${alpha})`;
        oklchColorCache.set(match, res);
        return res;
      }
      const gray = Math.round(lightness * 255);
      const res = `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
      oklchColorCache.set(match, res);
      return res;
    }
    oklchColorCache.set(match, match);
    return match;
  });

  oklchColorCache.set(colorStr, result);
  return result;
};

const replaceOklchStyles = (element: HTMLElement) => {
  const elements = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const comp = window.getComputedStyle(el);
    if (comp.color && comp.color.includes('oklch')) {
      el.style.color = convertOklchToRgb(comp.color);
    }
    if (comp.backgroundColor && comp.backgroundColor.includes('oklch')) {
      el.style.backgroundColor = convertOklchToRgb(comp.backgroundColor);
    }
    if (comp.borderTopColor && comp.borderTopColor.includes('oklch')) {
      el.style.borderTopColor = convertOklchToRgb(comp.borderTopColor);
    }
    if (comp.borderBottomColor && comp.borderBottomColor.includes('oklch')) {
      el.style.borderBottomColor = convertOklchToRgb(comp.borderBottomColor);
    }
    if (comp.borderLeftColor && comp.borderLeftColor.includes('oklch')) {
      el.style.borderLeftColor = convertOklchToRgb(comp.borderLeftColor);
    }
    if (comp.borderRightColor && comp.borderRightColor.includes('oklch')) {
      el.style.borderRightColor = convertOklchToRgb(comp.borderRightColor);
    }
    if (comp.fill && comp.fill.includes('oklch')) {
      el.style.fill = convertOklchToRgb(comp.fill);
    }
    if (comp.stroke && comp.stroke.includes('oklch')) {
      el.style.stroke = convertOklchToRgb(comp.stroke);
    }
    if (comp.outlineColor && comp.outlineColor.includes('oklch')) {
      el.style.outlineColor = convertOklchToRgb(comp.outlineColor);
    }
  }
};

const createCaptureContainer = () => {
  const container = document.createElement('div');
  container.className = 'portrait-parcel-slip-raster-capture-root';
  Object.assign(container.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${PARCEL_SLIP_WIDTH_MM}mm`,
    height: `${PARCEL_SLIP_HEIGHT_MM}mm`,
    background: '#ffffff',
    pointerEvents: 'none',
    overflow: 'hidden',
  });
  document.body.appendChild(container);
  return container;
};

const captureParcelSlipImage = async (item: ParcelSlipData): Promise<string> => {
  const publicUrl = buildPublicParcelSlipUrl(item.publicSlipToken);
  const qrImageDataUrl = await generateParcelSlipQrDataUrl(publicUrl);

  if (!qrImageDataUrl) {
    throw new Error(`Failed to generate QR code for order ${item.orderNumber || item.publicSlipToken}.`);
  }

  const container = createCaptureContainer();
  const root = createRoot(container);

  try {
    flushSync(() => {
      root.render(
        React.createElement(PortraitParcelSlip, {
          data: item,
          qrImageDataUrl,
          className: 'portrait-parcel-slip-capture',
        }),
      );
    });

    await waitForImages(container);
    await nextPaint();

    const slipNode = container.querySelector<HTMLElement>('.portrait-parcel-slip-capture');
    if (!slipNode) {
      throw new Error('Parcel slip capture node was not rendered.');
    }

    replaceOklchStyles(slipNode);

    // html-to-image replaces html2canvas. toJpeg() returns a JPEG data URL directly,
    // avoiding an intermediate canvas object in user code and reducing peak memory.
    // `pixelRatio` is the exact equivalent of html2canvas's `scale` option.
    // `backgroundColor` prevents transparent artefacts from SVG serialisation.
    const { toJpeg } = await import('html-to-image');
    const dataUrl = await toJpeg(slipNode, {
      quality: 0.85,
      pixelRatio: CAPTURE_SCALE,
      backgroundColor: '#ffffff',
      skipAutoScale: false,
    });
    return dataUrl;
  } finally {
    root.unmount();
    container.remove();
  }
};

export const generateParcelSlipPdf = async (
  items: LeadPrintItem[],
  onProgress?: ParcelPdfProgressCallback,
): Promise<ParcelPdfResult> => {
  if (items.length === 0) {
    throw new Error('No items provided for parcel slip PDF generation.');
  }

  const parcelItems = toParcelSlipDataList(items);
  const totalItems = parcelItems.length;

  onProgress?.(0, totalItems, 0);

  // Parallel pre-computation: fonts, libraries, and QR codes.
  // html-to-image is eagerly imported alongside jsPDF so the module is ready
  // before the render loop starts, avoiding a per-slip cold dynamic-import penalty.
  const [{ toJpeg }, { default: jsPDF }, qrCodeDataUrls] = await Promise.all([
    import('html-to-image'),
    import('jspdf'),
    Promise.all(
      parcelItems.map((item) => {
        const publicUrl = buildPublicParcelSlipUrl(item.publicSlipToken);
        return generateParcelSlipQrDataUrl(publicUrl);
      }),
    ),
    waitForFonts(),
  ]);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const sheets = chunkIntoSheets(parcelItems, 4);

  // Reuse a single persistent capture container and React root to eliminate DOM recreation and GC thrashing
  const container = createCaptureContainer();
  const root = createRoot(container);

  try {
    for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
      if (sheetIndex > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const currentSheetItems = sheets[sheetIndex];
      for (let slotIndex = 0; slotIndex < currentSheetItems.length; slotIndex++) {
        const globalIndex = sheetIndex * 4 + slotIndex;
        const currentItem = currentSheetItems[slotIndex];
        const qrImageDataUrl = qrCodeDataUrls[globalIndex];

        flushSync(() => {
          root.render(
            React.createElement(PortraitParcelSlip, {
              data: currentItem,
              qrImageDataUrl,
              className: 'portrait-parcel-slip-capture',
            }),
          );
        });

        await waitForImages(container);
        await nextPaint();

        const slipNode = container.querySelector<HTMLElement>('.portrait-parcel-slip-capture');
        if (!slipNode) {
          throw new Error('Parcel slip capture node was not rendered.');
        }

        replaceOklchStyles(slipNode);

        // html-to-image: toJpeg() returns a JPEG data URL directly.
        // `pixelRatio` mirrors html2canvas's `scale` — CAPTURE_SCALE = 1.5.
        // `backgroundColor` prevents transparent SVG-serialisation artefacts.
        // No explicit canvas teardown is required (no canvas object in user code).
        const jpegDataUrl = await toJpeg(slipNode, {
          quality: 0.85,
          pixelRatio: CAPTURE_SCALE,
          backgroundColor: '#ffffff',
          skipAutoScale: false,
        });

        // Fast high-quality JPEG compression (drastically faster than PNG with identical visual crispness)

        const column = slotIndex % 2;
        const row = Math.floor(slotIndex / 2);
        const x = PDF_MARGIN_MM + column * (PARCEL_SLIP_WIDTH_MM + PDF_GAP_MM);
        const y = PDF_MARGIN_MM + row * (PARCEL_SLIP_HEIGHT_MM + PDF_GAP_MM);

        pdf.addImage(jpegDataUrl, 'JPEG', x, y, PARCEL_SLIP_WIDTH_MM, PARCEL_SLIP_HEIGHT_MM, undefined, 'FAST');

        onProgress?.(globalIndex + 1, totalItems, Math.round(((globalIndex + 1) / totalItems) * 100));

        // Yield to browser UI thread so circular progress updates smoothly
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  } finally {
    root.unmount();
    container.remove();
  }

  return { pdf, pageCount: sheets.length };
};

export const downloadParcelSlipPDF = async (
  items: LeadPrintItem[],
  onProgress?: ParcelPdfProgressCallback,
): Promise<boolean> => {
  const { pdf } = await generateParcelSlipPdf(items, onProgress);
  pdf.save(`portrait_parcel_slips_${items.length}.pdf`);
  return true;
};

export const printParcelSlipPDF = async (
  items: LeadPrintItem[],
  onProgress?: ParcelPdfProgressCallback,
): Promise<boolean> => {
  const { pdf } = await generateParcelSlipPdf(items, onProgress);
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });

  return new Promise<boolean>((resolve, reject) => {
    iframe.onload = () => {
      try {
        const printWindow = iframe.contentWindow;
        if (!printWindow) {
          reject(new Error('Unable to open generated parcel PDF for printing.'));
          return;
        }

        printWindow.focus();
        printWindow.print();
        resolve(true);
      } catch (err) {
        reject(err);
      } finally {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          iframe.remove();
        }, 60000);
      }
    };

    iframe.onerror = () => {
      URL.revokeObjectURL(url);
      iframe.remove();
      reject(new Error('Unable to load generated parcel PDF for printing.'));
    };

    iframe.src = url;
    document.body.appendChild(iframe);
  });
};

export const parcelPdfLayout = {
  pageWidthMm: A4_PORTRAIT_WIDTH_MM,
  pageHeightMm: A4_PORTRAIT_HEIGHT_MM,
  marginMm: PDF_MARGIN_MM,
  gapMm: PDF_GAP_MM,
  slipWidthMm: PARCEL_SLIP_WIDTH_MM,
  slipHeightMm: PARCEL_SLIP_HEIGHT_MM,
  captureScale: CAPTURE_SCALE,
  captureDpi: PRINT_DPI,
};
