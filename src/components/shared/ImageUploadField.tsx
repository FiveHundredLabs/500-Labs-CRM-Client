import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { ImageUploadKind, optimizeImageDataUrl } from '../../utils/imageDataUrl';

export interface ImageUploadFieldProps {
  label: string;
  value?: string | null;
  fallbackText: string;
  kind: ImageUploadKind;
  onChange: (value: string | null) => void;
  previewShape?: 'circle' | 'rounded';
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  fallbackText,
  kind,
  onChange,
  previewShape = 'rounded',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsProcessing(true);
    try {
      const optimized = await optimizeImageDataUrl(file, kind);
      onChange(optimized);
      toast.success(`${label} preview updated.`);
    } catch (error: any) {
      toast.error(error.message || 'Unable to process image.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium text-slate-700">{label}</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div
          className={`h-20 w-20 shrink-0 overflow-hidden border border-slate-200 bg-white flex items-center justify-center ${previewShape === 'circle' ? 'rounded-full' : 'rounded-lg'
            }`}
        >
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
              <ImageIcon className="h-5 w-5" />
              <span className="max-w-[70px] truncate text-[10px] font-semibold uppercase">
                {fallbackText}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={value ? <RotateCcw className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
            onClick={() => inputRef.current?.click()}
            isLoading={isProcessing}
          >
            {value ? 'Replace' : 'Choose Image'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => onChange(null)}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
