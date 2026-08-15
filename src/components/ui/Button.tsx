import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyle =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

    const variants: Record<string, string> = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs border border-transparent',
      secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs',
      outline: 'bg-transparent hover:bg-slate-50 text-slate-700 border border-slate-200',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-xs border border-transparent',
    };

    const sizes: Record<string, string> = {
      sm: 'px-3 py-1.5 text-xs gap-1.5 h-8',
      md: 'px-3.5 py-2 text-sm gap-2 h-9',
      lg: 'px-5 py-2.5 text-sm gap-2.5 h-10',
      icon: 'w-8 h-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
