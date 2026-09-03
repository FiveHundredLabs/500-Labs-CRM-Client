import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { LeadPrintItem } from '../components/printing/printTypes';
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

const PRINT_DPI = 300;
const CSS_DPI = 96;
const CAPTURE_SCALE = PRINT_DPI / CSS_DPI; // 3.125 (~300 DPI high-resolution capture)

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
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
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

const convertOklchToRgb = (colorStr: string): string => {
  if (!colorStr || !colorStr.includes('oklch')) return colorStr;

  return colorStr.replace(/oklch\([^)]+\)/g, (match) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = match;
        const resolved = ctx.fillStyle;
        if (resolved && !resolved.includes('oklch')) return resolved;
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
      if (lightness <= 0.1) return `rgba(0, 0, 0, ${alpha})`;
      if (lightness >= 0.95) return `rgba(255, 255, 255, ${alpha})`;
      const gray = Math.round(lightness * 255);
      return `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
    }
    return match;
  });
};

const replaceOklchStyles = (element: HTMLElement) => {
  const elements = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
  const computedStyles = elements.map((el) => {
    const computed = window.getComputedStyle(el);
    return {
      color: convertOklchToRgb(computed.color),
      backgroundColor: convertOklchToRgb(computed.backgroundColor),
      borderTopColor: convertOklchToRgb(computed.borderTopColor),
      borderBottomColor: convertOklchToRgb(computed.borderBottomColor),
      borderLeftColor: convertOklchToRgb(computed.borderLeftColor),
      borderRightColor: convertOklchToRgb(computed.borderRightColor),
      fill: convertOklchToRgb(computed.fill),
      stroke: convertOklchToRgb(computed.stroke),
      outlineColor: convertOklchToRgb(computed.outlineColor),
    };
  });

  elements.forEach((el, index) => {
    const styles = computedStyles[index];
    if (styles.color) el.style.color = styles.color;
    if (styles.backgroundColor) el.style.backgroundColor = styles.backgroundColor;
    if (styles.borderTopColor) el.style.borderTopColor = styles.borderTopColor;
    if (styles.borderBottomColor) el.style.borderBottomColor = styles.borderBottomColor;
    if (styles.borderLeftColor) el.style.borderLeftColor = styles.borderLeftColor;
    if (styles.borderRightColor) el.style.borderRightColor = styles.borderRightColor;
    if (styles.fill) el.style.fill = styles.fill;
    if (styles.stroke) el.style.stroke = styles.stroke;
    if (styles.outlineColor) el.style.outlineColor = styles.outlineColor;
  });
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

    await nextPaint();
    await waitForFonts();
    await waitForImages(container);
    await nextPaint();

    const slipNode = container.querySelector<HTMLElement>('.portrait-parcel-slip-capture');
    if (!slipNode) {
      throw new Error('Parcel slip capture node was not rendered.');
    }

    replaceOklchStyles(slipNode);

    const canvas = await html2canvas(slipNode, {
      backgroundColor: '#ffffff',
      scale: CAPTURE_SCALE,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: slipNode.offsetWidth,
      height: slipNode.offsetHeight,
      windowWidth: slipNode.scrollWidth,
      windowHeight: slipNode.scrollHeight,
    });

    const dataUrl = canvas.toDataURL('image/png');
    canvas.width = 1;
    canvas.height = 1;
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
  const slipImages: string[] = [];

  onProgress?.(0, parcelItems.length, 0);

  for (let i = 0; i < parcelItems.length; i++) {
    const pngDataUrl = await captureParcelSlipImage(parcelItems[i]);
    slipImages.push(pngDataUrl);
    onProgress?.(i + 1, parcelItems.length, Math.round(((i + 1) / parcelItems.length) * 100));
  }

  const pages = chunkIntoSheets(slipImages);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pages.forEach((pageImages, pageIndex) => {
    if (pageIndex > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pageImages.forEach((image, imageIndex) => {
      const column = imageIndex % 2;
      const row = Math.floor(imageIndex / 2);
      const x = PDF_MARGIN_MM + column * (PARCEL_SLIP_WIDTH_MM + PDF_GAP_MM);
      const y = PDF_MARGIN_MM + row * (PARCEL_SLIP_HEIGHT_MM + PDF_GAP_MM);

      pdf.addImage(image, 'PNG', x, y, PARCEL_SLIP_WIDTH_MM, PARCEL_SLIP_HEIGHT_MM, undefined, 'FAST');
    });
  });

  slipImages.length = 0;
  return { pdf, pageCount: pages.length };
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
