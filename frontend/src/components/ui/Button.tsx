import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap gap-2 rounded-lg text-[13px] font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow',
        secondary: 'bg-slate-800 text-white shadow-sm hover:bg-slate-700 hover:shadow',
        danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow',
        success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow',
        warning: 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 hover:shadow',
        outline: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-10 px-6 text-[14px]',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: ReactNode;
}

export default function Button({ children, className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </button>
  );
}
