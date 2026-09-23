import QRCode from 'qrcode';

export const buildPublicParcelSlipUrl = (token: string, origin?: string): string => {
  const resolvedOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${resolvedOrigin.replace(/\/$/, '')}/parcel/${token}`;
};

const qrCache = new Map<string, string>();

export const generateParcelSlipQrDataUrl = async (value: string): Promise<string> => {
  const cached = qrCache.get(value);
  if (cached) return cached;

  const dataUrl = await QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  qrCache.set(value, dataUrl);
  return dataUrl;
};
