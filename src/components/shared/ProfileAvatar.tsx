import React, { useEffect, useState } from 'react';

export interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const getInitials = (str: string) => {
    if (!str) return 'U';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-14 h-14 text-base',
    '2xl': 'w-20 h-20 text-xl',
  };

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover border border-slate-200 shrink-0 ${className}`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold flex items-center justify-center shrink-0 select-none ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};
