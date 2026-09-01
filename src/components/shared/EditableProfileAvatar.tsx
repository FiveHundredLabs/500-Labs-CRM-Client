import React, { useRef, useState } from 'react';
import { ProfileAvatar } from './ProfileAvatar';
import { Camera, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { optimizeImageDataUrl } from '../../utils/imageDataUrl';

export interface EditableProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  onChangeAvatar: (newUrl: string) => void;
  size?: 'lg' | 'xl' | '2xl';
  className?: string;
}

export const EditableProfileAvatar: React.FC<EditableProfileAvatarProps> = ({
  name,
  avatarUrl,
  onChangeAvatar,
  size = '2xl',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsProcessing(true);
    try {
      onChangeAvatar(await optimizeImageDataUrl(file, 'profile'));
      toast.success('Photo preview updated! Click "Save Changes" to apply.');
    } catch (error: any) {
      toast.error(error.message || 'Unable to process profile photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeAvatar('');
    toast.success('Photo removed. Click "Save Changes" to apply.');
  };

  return (
    <div className={`relative group inline-block ${className}`}>
      <div className="relative">
        <ProfileAvatar name={name} avatarUrl={avatarUrl} size={size} className="ring-4 ring-white shadow-md" />

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Camera / Edit Icon Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          title="Change profile photo"
          aria-label="Change profile photo"
          className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white p-2 rounded-full shadow-lg border-2 border-white transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Trash Icon Button to remove photo if present */}
        {avatarUrl && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            title="Remove profile photo"
            aria-label="Remove profile photo"
            className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white p-1.5 rounded-full shadow-lg border-2 border-white transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
