import QRCode from 'qrcode';

export const buildPublicParcelSlipUrl = (token: string, origin?: string): string => {
  const resolvedOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${resolvedOrigin.replace(/\/$/, '')}/parcel/${token}`;
};

export const generateParcelSlipQrDataUrl = (value: string): Promise<string> => {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
};
