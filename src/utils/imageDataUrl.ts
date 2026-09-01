export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_USER_PROFILE_IMAGE_DATA_URL_LENGTH = 750_000;
export const MAX_TEAM_LOGO_DATA_URL_LENGTH = 1_000_000;

export type ImageUploadKind = 'profile' | 'logo';

const loadImage = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to read selected image.'));
    image.src = dataUrl;
  });

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Unable to read selected image.'));
    };
    reader.onerror = () => reject(new Error('Unable to read selected image.'));
    reader.readAsDataURL(file);
  });

const fitWithin = (width: number, height: number, maxDimension: number) => {
  if (width <= maxDimension && height <= maxDimension) return { width, height };
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

const hasTransparency = (file: File) => file.type === 'image/png' || file.type === 'image/webp';

const chooseOutputType = (file: File, kind: ImageUploadKind) => {
  if (kind === 'profile') return 'image/webp';
  if (hasTransparency(file)) return 'image/webp';
  return 'image/jpeg';
};

export async function optimizeImageDataUrl(file: File, kind: ImageUploadKind): Promise<string> {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as any)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }

  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error('Choose an image smaller than 8 MB.');
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const maxDimension = kind === 'profile' ? 512 : 800;
  const maxEncodedLength =
    kind === 'profile'
      ? MAX_USER_PROFILE_IMAGE_DATA_URL_LENGTH
      : MAX_TEAM_LOGO_DATA_URL_LENGTH;
  const size = fitWithin(image.naturalWidth || image.width, image.naturalHeight || image.height, maxDimension);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Image optimization is not available in this browser.');
  }

  context.clearRect(0, 0, size.width, size.height);
  context.drawImage(image, 0, 0, size.width, size.height);

  const outputType = chooseOutputType(file, kind);
  const qualities = [0.85, 0.78, 0.7, 0.62, 0.54];

  for (const quality of qualities) {
    const result = canvas.toDataURL(outputType, quality);
    if (result.length <= maxEncodedLength) return result;
  }

  throw new Error(`Optimized image is still too large. Choose a smaller image.`);
}

export const isSafeImageDataUrl = (value?: string | null) =>
  !value || /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
