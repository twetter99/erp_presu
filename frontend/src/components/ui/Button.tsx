import { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning';

const variants: Record<Variant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
};

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

export default function Button({ children, variant = 'primary', size = 'md', onClick, type = 'button', disabled, className = '' }: ButtonProps) {
  const sizeClass = size === 'sm' ? 'text-sm px-3 py-1.5' : size === 'lg' ? 'text-base px-6 py-3' : 'text-sm px-4 py-2';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizeClass} rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 ${className}`}
    >
      {children}
    </button>
  );
}
